import openai
from typing import List, AsyncGenerator
from providers.base import BaseProvider
from models import Message


class CustomOpenAIProvider(BaseProvider):
    """
    OpenAI-compatible provider for any service that exposes an OpenAI-style API.
    Examples: Ollama, LM Studio, OpenRouter, Together AI, Groq, etc.
    """
    provider_name = "custom"

    def __init__(self, api_key: str = None, base_url: str = None, default_model: str = None):
        self.api_key = api_key or "custom"
        self.base_url = base_url or "http://localhost:11434/v1"
        self.default_chat_model = default_model or "gpt-3.5-turbo"
        self.embedding_model = "text-embedding-3-small"

        self.client = openai.AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )

    async def embed_text(self, text: str) -> List[float]:
        """Try embedding — may not be supported by all custom providers."""
        try:
            response = await self.client.embeddings.create(
                input=text,
                model=self.embedding_model,
            )
            return response.data[0].embedding
        except Exception as e:
            raise RuntimeError(f"Custom provider embedding failed: {e}")

    async def embed_query(self, text: str) -> List[float]:
        return await self.embed_text(text)

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        try:
            response = await self.client.embeddings.create(
                input=texts,
                model=self.embedding_model,
            )
            return [d.embedding for d in response.data]
        except Exception as e:
            raise RuntimeError(f"Custom provider batch embedding failed: {e}")

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
        return 1536

    def get_collection_name(self) -> str:
        # Use a stable name based on the base URL so notes stay indexed
        import hashlib
        url_hash = hashlib.md5(self.base_url.encode()).hexdigest()[:8]
        return f"notes_custom_{url_hash}_1536"
