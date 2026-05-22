import openai
from typing import List, AsyncGenerator
from providers.base import BaseProvider
from models import Message
from config import get_settings

class OpenAIProvider(BaseProvider):
    provider_name = "openai"

    def __init__(self, api_key: str = None, base_url: str = None, default_model: str = None, default_embedding_model: str = None, provider_name: str = None):
        settings = get_settings()
        if provider_name:
            self.provider_name = provider_name
            
        self.api_key = api_key or getattr(settings, f"{self.provider_name}_api_key", settings.openai_api_key)
        if not self.api_key:
            raise ValueError(f"{self.provider_name} API key not provided")
            
        kwargs = {"api_key": self.api_key}
        if base_url:
            kwargs["base_url"] = base_url
        self.base_url = base_url
            
        self.client = openai.AsyncOpenAI(**kwargs)
        self.embedding_model = default_embedding_model or settings.default_embedding_model
        self.default_chat_model = default_model or settings.default_chat_model_openai

    def _hash_embed(self, text: str) -> List[float]:
        """Dependency-free local embedding fallback for providers without embedding APIs."""
        import hashlib, math, re
        dim = self.get_embedding_dimension()
        vector = [0.0] * dim
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        for token in tokens:
            digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
            bucket = int.from_bytes(digest[:4], "big") % dim
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[bucket] += sign
        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector
        return [value / norm for value in vector]

    async def embed_text(self, text: str) -> List[float]:
        try:
            response = await self.client.embeddings.create(
                input=text,
                model=self.embedding_model
            )
            return response.data[0].embedding
        except Exception:
            return self._hash_embed(text)

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        try:
            response = await self.client.embeddings.create(
                input=texts,
                model=self.embedding_model
            )
            return [data.embedding for data in response.data]
        except Exception:
            return [self._hash_embed(t) for t in texts]

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
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            if getattr(delta, 'content', None):
                yield delta.content
            elif getattr(delta, 'reasoning_content', None):
                yield delta.reasoning_content

    async def agent_stream(
        self,
        messages: list,
        tools: list,
        model: str = None,
        temperature: float = 0.5,
        max_tokens: int = 4096,
    ):
        import json
        
        response = await self.client.chat.completions.create(
            model=model or self.default_chat_model,
            messages=messages,
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        )

        current_tool_calls = {}

        async for chunk in response:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta

            if getattr(delta, 'content', None):
                yield {"type": "text", "content": delta.content}
            elif getattr(delta, 'reasoning_content', None):
                yield {"type": "text", "content": delta.reasoning_content}

            if delta.tool_calls:
                for tool_call in delta.tool_calls:
                    index = tool_call.index
                    if index not in current_tool_calls:
                        current_tool_calls[index] = {
                            "id": tool_call.id,
                            "type": "function",
                            "function": {
                                "name": tool_call.function.name or "",
                                "arguments": tool_call.function.arguments or ""
                            }
                        }
                    else:
                        if tool_call.function.name:
                            current_tool_calls[index]["function"]["name"] += tool_call.function.name
                        if tool_call.function.arguments:
                            current_tool_calls[index]["function"]["arguments"] += tool_call.function.arguments

        for tc in current_tool_calls.values():
            try:
                args_str = tc["function"]["arguments"]
                # Fix for LLMs (like Gemini) that compress markdown tables by stripping newlines in JSON arguments.
                args_str = args_str.replace(" | |", " |\\n|")
                args = json.loads(args_str)
            except json.JSONDecodeError:
                args = {}
            yield {
                "type": "tool_request",
                "tool": tc["function"]["name"],
                "args": args,
                "call_id": tc["id"]
            }

    def get_embedding_dimension(self) -> int:
        return 1536

    def get_collection_name(self) -> str:
        if self.provider_name == "custom" and self.base_url:
            import hashlib
            url_hash = hashlib.md5(self.base_url.encode()).hexdigest()[:8]
            return f"notes_custom_{url_hash}_1536"
        return super().get_collection_name()
