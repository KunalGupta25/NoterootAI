from typing import AsyncGenerator, List

import anthropic

from config import get_settings
from models import Message
from providers.base import BaseProvider
from providers.local_embedding import LocalHashEmbeddingMixin


class AnthropicProvider(LocalHashEmbeddingMixin, BaseProvider):
    provider_name = "anthropic"

    def __init__(self, api_key: str = None):
        settings = get_settings()
        self.api_key = api_key or settings.anthropic_api_key
        if not self.api_key:
            raise ValueError("Anthropic API key not provided")
        self.client = anthropic.AsyncAnthropic(api_key=self.api_key)
        self.default_chat_model = settings.default_chat_model_anthropic

    async def chat_stream(
        self,
        messages: List[Message],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        system_parts = [m.content for m in messages if m.role == "system"]
        chat_messages = [
            {"role": m.role, "content": m.content}
            for m in messages
            if m.role in {"user", "assistant"}
        ]

        stream_args = {
            "model": model or self.default_chat_model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": chat_messages,
        }
        if system_parts:
            stream_args["system"] = "\n\n".join(system_parts)

        async with self.client.messages.stream(**stream_args) as stream:
            async for text in stream.text_stream:
                yield text
