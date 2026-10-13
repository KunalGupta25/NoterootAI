import hashlib
import math
import re
from collections.abc import AsyncGenerator

import anthropic
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
        self.embedding_model = settings.default_embedding_model
        self.client = openai.AsyncOpenAI(api_key=self.api_key, base_url=base_url)

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


class AnthropicProvider(Provider):
    def __init__(self, api_key: str | None):
        settings = get_settings()
        self.name = "anthropic"
        self.api_key = api_key or settings.anthropic_api_key
        if not self.api_key:
            raise ValueError("anthropic API key not provided")
        self.default_model = settings.default_chat_model_anthropic
        self.client = anthropic.AsyncAnthropic(api_key=self.api_key)

    def collection_name(self) -> str:
        return "notes_anthropic_1536"

    async def chat(self, messages: list[Message], model: str | None, temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
        system = "\n\n".join(message.content for message in messages if message.role == "system")
        prompt = [{"role": message.role, "content": message.content} for message in messages if message.role in {"user", "assistant"}]
        async with self.client.messages.stream(
            model=model or self.default_model,
            system=system or anthropic.NOT_GIVEN,
            messages=prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        ) as stream:
            async for text in stream.text_stream:
                yield text


def get_provider(name: str = "openai", api_key: str | None = None, custom_base_url: str | None = None):
    name = (name or "openai").lower()
    if name == "anthropic":
        return AnthropicProvider(api_key)
    endpoints = {
        "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "mistral": "https://api.mistral.ai/v1",
        "groq": "https://api.groq.com/openai/v1",
    }
    if name == "custom" or custom_base_url:
        return Provider("custom", api_key, custom_base_url)
    return Provider(name, api_key, endpoints.get(name))
