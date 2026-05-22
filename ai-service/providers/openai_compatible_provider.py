from typing import AsyncGenerator, List, Optional

import openai

from models import Message
from providers.base import BaseProvider


class OpenAICompatibleProvider(BaseProvider):
    provider_name = "openai_compatible"

    def __init__(
        self,
        api_key: str,
        base_url: Optional[str],
        embedding_model: str,
        chat_model: str,
        embedding_dimension: int,
        api_key_label: str,
    ):
        if not api_key:
            raise ValueError(f"{api_key_label} API key not provided")

        self.client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.embedding_model = embedding_model
        self.default_chat_model = chat_model
        self.embedding_dimension = embedding_dimension

    async def embed_text(self, text: str) -> List[float]:
        return (await self.embed_texts([text]))[0]

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        response = await self.client.embeddings.create(
            input=texts,
            model=self.embedding_model,
        )
        return [data.embedding for data in response.data]

    async def embed_query(self, text: str) -> List[float]:
        return await self.embed_text(text)

    async def chat_stream(
        self,
        messages: List[Message],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        response = await self.client.chat.completions.create(
            model=model or self.default_chat_model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def get_embedding_dimension(self) -> int:
        return self.embedding_dimension
