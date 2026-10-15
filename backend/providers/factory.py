import hashlib
import math
import re
from collections.abc import AsyncGenerator

import openai

from config import get_settings
from schemas.ai import Message


class Provider:
    def __init__(self, name: str, api_key: str | None, base_url: str | None = None):
        settings = get_settings()
        self.name = name
        self.api_key = api_key or getattr(settings, f"{name}_api_key", "")
        if not self.api_key:
            raise ValueError(f"{name} API key not provided")
        self.base_url = base_url
        self.default_model = getattr(settings, f"default_chat_model_{name}", settings.default_chat_model_openai)
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
        self.client = openai.AsyncOpenAI(api_key=self.api_key, base_url=base_url, default_headers=headers if headers else None)

    def collection_name(self) -> str:
        if self.name == "custom" and self.base_url:
            return f"notes_custom_{hashlib.md5(self.base_url.encode()).hexdigest()[:8]}_1536"
        return f"notes_{self.name}_1536"

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
        stream = await self.client.chat.completions.create(
            model=model or self.default_model,
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
        req_kwargs: dict = {
            "model": model or self.default_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        if extra_body:
            req_kwargs["extra_body"] = extra_body

        stream = None
        # Attempt with include_usage enabled
        try:
            stream = await self.client.chat.completions.create(
                **req_kwargs,
                stream_options={"include_usage": True},
            )
        except Exception:
            # Fall back without stream_options if provider rejects it
            stream = await self.client.chat.completions.create(**req_kwargs)

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield {"type": "text", "content": chunk.choices[0].delta.content}
            if hasattr(chunk, "usage") and chunk.usage:
                yield {
                    "type": "usage",
                    "usage": {
                        "prompt_tokens": chunk.usage.prompt_tokens,
                        "completion_tokens": chunk.usage.completion_tokens,
                        "total_tokens": chunk.usage.total_tokens,
                    },
                }

    async def agent(self, messages: list[dict], tools: list[dict], model: str | None, temperature: float, max_tokens: int):
        import json
        stream = await self.client.chat.completions.create(model=model or self.default_model, messages=messages, tools=tools, temperature=temperature, max_tokens=max_tokens, stream=True)
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
            import logging
            logging.exception("Failed to list models for %s: %s", self.name, err)
            raise


def get_provider(name: str = "openai", api_key: str | None = None, custom_base_url: str | None = None):
    name = (name or "openai").lower()
    if name not in {"openai", "gemini", "mistral", "groq", "openrouter", "custom"}:
        raise ValueError(f"Unsupported provider: {name}")
    endpoints = {
        "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "mistral": "https://api.mistral.ai/v1",
        "groq": "https://api.groq.com/openai/v1",
        "openrouter": "https://openrouter.ai/api/v1",
    }
    if name == "custom" or custom_base_url:
        return Provider("custom", api_key, custom_base_url)
    return Provider(name, api_key, endpoints.get(name))
