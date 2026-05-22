import openai
from typing import List, AsyncGenerator
from providers.base import BaseProvider
from models import Message
from config import get_settings

class OpenAIProvider(BaseProvider):
    provider_name = "openai"

    def __init__(self, api_key: str = None):
        settings = get_settings()
        self.api_key = api_key or settings.openai_api_key
        if not self.api_key:
            raise ValueError("OpenAI API key not provided")
        self.client = openai.AsyncOpenAI(api_key=self.api_key)
        self.embedding_model = settings.default_embedding_model
        self.default_chat_model = settings.default_chat_model_openai

    async def embed_text(self, text: str) -> List[float]:
        response = await self.client.embeddings.create(
            input=text,
            model=self.embedding_model
        )
        return response.data[0].embedding

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        response = await self.client.embeddings.create(
            input=texts,
            model=self.embedding_model
        )
        return [data.embedding for data in response.data]

    async def embed_query(self, text: str) -> List[float]:
        return await self.embed_text(text)

    async def chat_stream(
        self,
        messages: List[Message],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> AsyncGenerator[str, None]:
        response = await self.client.chat.completions.create(
            model=model or self.default_chat_model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        )
        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def get_embedding_dimension(self) -> int:
        # text-embedding-3-small dimension
        return 1536
