import asyncio
from typing import AsyncGenerator, List

from google import genai
from google.genai import types

from config import get_settings
from models import Message
from providers.base import BaseProvider


class GeminiProvider(BaseProvider):
    provider_name = "gemini"

    # Embedding model names available for the Gemini API
    EMBEDDING_MODELS = ["models/gemini-embedding-2", "models/gemini-embedding-001"]
    EMBED_DIMENSION = 3072  # gemini-embedding-2

    def __init__(self, api_key: str = None):
        settings = get_settings()
        self.api_key = api_key or settings.gemini_api_key
        if not self.api_key:
            raise ValueError("Gemini API key not provided")

        self.client = genai.Client(api_key=self.api_key)
        self.embedding_model = self.EMBEDDING_MODELS[0]
        self.default_chat_model = settings.default_chat_model_gemini

    # ── Embedding ──────────────────────────────────────────────────────────────

    def _sync_embed(self, model: str, contents, task_type: str):
        """Synchronous embed call — run via asyncio.to_thread."""
        return self.client.models.embed_content(
            model=model,
            contents=contents,
            config=types.EmbedContentConfig(task_type=task_type),
        )

    async def _embed(self, contents, task_type: str) -> list:
        """Try each embedding model in order until one succeeds."""
        last_error = None
        for model in self.EMBEDDING_MODELS:
            try:
                result = await asyncio.to_thread(self._sync_embed, model, contents, task_type)
                return result
            except Exception as e:
                print(f"[Gemini] Embedding failed with {model}: {e}")
                last_error = e
        raise last_error

    async def embed_text(self, text: str) -> List[float]:
        result = await self._embed(text, "RETRIEVAL_DOCUMENT")
        return result.embeddings[0].values

    async def embed_query(self, text: str) -> List[float]:
        result = await self._embed(text, "RETRIEVAL_QUERY")
        return result.embeddings[0].values

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        result = await self._embed(texts, "RETRIEVAL_DOCUMENT")
        embeddings = [e.values for e in result.embeddings]
        return embeddings

    # ── Chat Streaming ──────────────────────────────────────────────────────────

    def _build_contents(self, messages: List[Message]):
        """Convert our Message list into google.genai Content objects."""
        system_instruction = None
        contents = []
        for m in messages:
            if m.role == "system":
                system_instruction = m.content
            elif m.role == "user":
                contents.append(
                    types.Content(role="user", parts=[types.Part(text=m.content)])
                )
            elif m.role == "assistant":
                contents.append(
                    types.Content(role="model", parts=[types.Part(text=m.content)])
                )
        return system_instruction, contents

    def _sync_stream(self, model_name, system_instruction, contents, temperature, max_tokens):
        """Run synchronous streaming in a thread, collect chunks."""
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
        chunks = []
        for chunk in self.client.models.generate_content_stream(
            model=model_name,
            contents=contents,
            config=config,
        ):
            if chunk.text:
                chunks.append(chunk.text)
        return chunks

    async def chat_stream(
        self,
        messages: List[Message],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        system_instruction, contents = self._build_contents(messages)

        if not contents:
            return

        model_name = model or self.default_chat_model

        # Try primary model, then fall back dynamically
        try:
            chunks = await asyncio.to_thread(
                self._sync_stream, model_name, system_instruction, contents, temperature, max_tokens
            )
        except Exception as e:
            print(f"[Gemini] Chat failed with {model_name}: {e}")
            # Auto-discover a working model
            try:
                available = await asyncio.to_thread(
                    lambda: [
                        m.name for m in self.client.models.list()
                        if hasattr(m, "supported_generation_methods")
                        and "generateContent" in m.supported_generation_methods
                        and "vision" not in m.name
                    ]
                )
                fallback = available[0] if available else "gemini-2.0-flash"
                print(f"[Gemini] Trying fallback: {fallback}")
                chunks = await asyncio.to_thread(
                    self._sync_stream, fallback, system_instruction, contents, temperature, max_tokens
                )
            except Exception as e2:
                yield f"[Error: {e2}]"
                return

        for chunk in chunks:
            yield chunk

    def get_embedding_dimension(self) -> int:
        return self.EMBED_DIMENSION

    def get_collection_name(self) -> str:
        return f"notes_gemini_{self.EMBED_DIMENSION}"
