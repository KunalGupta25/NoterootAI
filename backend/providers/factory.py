import hashlib
import ipaddress
import logging
import math
import re
import socket
import time
from collections.abc import AsyncGenerator
from urllib.parse import urlparse

import httpx
import openai

from config import get_settings
from schemas.ai import Message

logger = logging.getLogger(__name__)


def _key_sha256(key: str | None) -> str:
    if not key:
        return ""
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def _validate_custom_url(url: str, environment: str) -> None:
    if not url:
        return
    parsed = urlparse(url)
    if not parsed.scheme or parsed.scheme not in ("http", "https"):
        raise ValueError("Custom base URL must have http or https scheme")
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Invalid custom base URL: missing hostname")

    if environment.lower() == "development":
        return

    # Check if hostname directly represents an IP address
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise ValueError(f"Custom endpoint IP {hostname} is private or restricted")
        return
    except ValueError as err:
        if "is private or restricted" in str(err):
            raise

    # Resolve hostname via DNS and check all returned A/AAAA records
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror as err:
        raise ValueError(f"Could not resolve custom base URL host: {hostname}") from err

    for item in addr_info:
        sockaddr = item[4]
        ip_str = sockaddr[0]
        ip = ipaddress.ip_address(ip_str)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise ValueError(f"Custom endpoint host resolves to private/restricted IP: {ip_str}")


class Provider:
    def __init__(self, name: str, api_key: str | None, base_url: str | None = None):
        settings = get_settings()
        self.name = name
        self.base_url = base_url

        if self.name == "custom" and self.base_url:
            self.api_key = api_key or getattr(settings, f"{name}_api_key", "") or "not-needed"
            self.default_model = None
        else:
            self.api_key = api_key or getattr(settings, f"{name}_api_key", "")
            self.default_model = getattr(settings, f"default_chat_model_{name}", settings.default_chat_model_openai)

        if not self.api_key:
            raise ValueError(f"{name} API key not provided")

        embedding_models = {
            "openai": "text-embedding-3-small",
            "openrouter": "openai/text-embedding-3-small",
            "mistral": "mistral-embed",
            "gemini": "text-embedding-004",
        }
        self.embedding_model = embedding_models.get(self.name, settings.default_embedding_model)

        headers = {}
        if self.name == "openrouter":
            headers = {"HTTP-Referer": "https://noterootai.app", "X-Title": "NoteRootAI"}

        self.client = openai.AsyncOpenAI(
            api_key=self.api_key,
            base_url=base_url,
            default_headers=headers if headers else None,
            timeout=httpx.Timeout(60.0, connect=10.0),
            max_retries=1,
        )

    def collection_name(self, model: str | None = None, dimension: int | None = None) -> str:
        emb_model = model or self.embedding_model or "default"
        safe_model = re.sub(r"[^A-Za-z0-9]", "_", emb_model).strip("_")
        dim = dimension or 1536
        if self.name == "custom" and self.base_url:
            url_hash = hashlib.md5(self.base_url.encode()).hexdigest()[:8]
            return f"notes_custom_{url_hash}_{safe_model}_{dim}"
        return f"notes_{self.name}_{safe_model}_{dim}"

    def _local_embedding(self, text: str) -> list[float]:
        vector = [0.0] * 1536
        for token in re.findall(r"[a-z0-9]+", text.lower()):
            digest = hashlib.blake2b(token.encode(), digest_size=8).digest()
            vector[int.from_bytes(digest[:4], "big") % len(vector)] += 1 if digest[4] % 2 == 0 else -1
        length = math.sqrt(sum(value * value for value in vector))
        return [value / length for value in vector] if length else vector

    async def embed(self, texts: list[str]) -> list[list[float]]:
        try:
            result = await self.client.embeddings.create(input=texts, model=self.embedding_model)
            return [item.embedding for item in result.data]
        except Exception:
            return [self._local_embedding(text) for text in texts]

    async def chat(self, messages: list[Message], model: str | None, temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
        resolved_model = model or self.default_model
        if not resolved_model:
            raise ValueError("Model is required for custom provider")
        stream = await self.client.chat.completions.create(
            model=resolved_model,
            messages=[{"role": message.role, "content": message.content} for message in messages],
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def chat_stream(
        self,
        messages: list[dict],
        model: str | None,
        temperature: float,
        max_tokens: int,
        extra_body: dict | None = None,
    ) -> AsyncGenerator[dict, None]:
        resolved_model = model or self.default_model
        if not resolved_model:
            raise ValueError("Model is required for custom provider")

        req_kwargs: dict = {
            "model": resolved_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        if extra_body:
            req_kwargs["extra_body"] = extra_body

        stream = None
        try:
            stream = await self.client.chat.completions.create(
                **req_kwargs,
                stream_options={"include_usage": True},
            )
        except Exception:
            stream = await self.client.chat.completions.create(**req_kwargs)

        finish_reason = None
        async for chunk in stream:
            if chunk.choices:
                if chunk.choices[0].delta and chunk.choices[0].delta.content:
                    yield {"type": "text", "content": chunk.choices[0].delta.content}
                if chunk.choices[0].finish_reason:
                    finish_reason = chunk.choices[0].finish_reason
            if hasattr(chunk, "usage") and chunk.usage:
                yield {
                    "type": "usage",
                    "usage": {
                        "prompt_tokens": chunk.usage.prompt_tokens,
                        "completion_tokens": chunk.usage.completion_tokens,
                        "total_tokens": chunk.usage.total_tokens,
                    },
                }

        yield {"type": "done", "finish_reason": finish_reason or "stop"}

    async def agent(self, messages: list[dict], tools: list[dict], model: str | None, temperature: float, max_tokens: int):
        import json
        resolved_model = model or self.default_model
        if not resolved_model:
            raise ValueError("Model is required for custom provider")
        stream = await self.client.chat.completions.create(
            model=resolved_model,
            messages=messages,
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        calls: dict[int, dict] = {}
        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            if delta.content:
                yield {"type": "text", "content": delta.content}
            for call in delta.tool_calls or []:
                entry = calls.setdefault(call.index, {"id": call.id, "name": "", "arguments": ""})
                entry["name"] += call.function.name or ""
                entry["arguments"] += call.function.arguments or ""
        for call in calls.values():
            try:
                args = json.loads(call["arguments"])
            except json.JSONDecodeError:
                args = {}
            yield {"type": "tool_request", "tool": call["name"], "args": args, "call_id": call["id"]}

    async def list_models(self) -> list[str]:
        try:
            response = await self.client.models.list()
            raw_models: list[str] = [m.id for m in response.data if hasattr(m, "id")]
            if self.name == "openai":
                excluded_prefixes = ("text-embedding", "whisper", "tts", "dall-e", "text-moderation", "babbage", "davinci")
                chat_models = [m for m in raw_models if not any(m.startswith(p) for p in excluded_prefixes)]
                def sort_key(name: str):
                    if name.startswith(("gpt-4o", "o1", "o3", "gpt-4")):
                        return (0, name)
                    if "gpt" in name:
                        return (1, name)
                    return (2, name)
                chat_models.sort(key=sort_key)
                return chat_models or raw_models
            elif self.name == "gemini":
                cleaned = [m.replace("models/", "") for m in raw_models]
                cleaned = [m for m in cleaned if "gemini" in m.lower() and "embedding" not in m.lower()]
                cleaned.sort(reverse=True)
                return cleaned or raw_models
            raw_models.sort()
            return raw_models
        except Exception as err:
            logger.exception("Failed to list models for %s: %s", self.name, err)
            raise


_CACHE_MAX_SIZE = 16
_CACHE_TTL_SECONDS = 600.0  # 10 minutes
_provider_cache: dict[tuple[str, str | None, str], tuple[Provider, float]] = {}


def get_provider(name: str = "openai", api_key: str | None = None, custom_base_url: str | None = None) -> Provider:
    settings = get_settings()
    name = (name or "openai").lower()
    if name not in {"openai", "gemini", "mistral", "groq", "openrouter", "custom"}:
        raise ValueError(f"Unsupported provider: {name}")

    endpoints = {
        "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "mistral": "https://api.mistral.ai/v1",
        "groq": "https://api.groq.com/openai/v1",
        "openrouter": "https://openrouter.ai/api/v1",
    }

    base_url = custom_base_url if (name == "custom" or custom_base_url) else endpoints.get(name)
    resolved_name = "custom" if (name == "custom" or custom_base_url) else name

    if resolved_name == "custom" and base_url:
        _validate_custom_url(base_url, settings.environment)
        resolved_api_key = api_key or getattr(settings, f"{resolved_name}_api_key", "") or "not-needed"
    else:
        resolved_api_key = api_key or getattr(settings, f"{resolved_name}_api_key", "")

    cache_key = (resolved_name, base_url, _key_sha256(resolved_api_key))
    now = time.monotonic()

    if cache_key in _provider_cache:
        cached_provider, ts = _provider_cache[cache_key]
        if now - ts < _CACHE_TTL_SECONDS:
            _provider_cache[cache_key] = (cached_provider, now)
            return cached_provider
        else:
            del _provider_cache[cache_key]

    provider = Provider(resolved_name, resolved_api_key, base_url)

    # Evict expired entries
    expired = [k for k, (_, ts) in _provider_cache.items() if now - ts >= _CACHE_TTL_SECONDS]
    for k in expired:
        del _provider_cache[k]

    # Evict oldest entry if capacity reached
    if len(_provider_cache) >= _CACHE_MAX_SIZE:
        oldest_key = next(iter(_provider_cache))
        del _provider_cache[oldest_key]

    _provider_cache[cache_key] = (provider, now)
    return provider
