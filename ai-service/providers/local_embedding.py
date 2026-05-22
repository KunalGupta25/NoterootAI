import hashlib
import math
import re
from typing import List


class LocalHashEmbeddingMixin:
    """Small dependency-free embedding fallback for providers without embeddings."""

    local_embedding_dimension = 768

    def _hash_embed(self, text: str) -> List[float]:
        vector = [0.0] * self.local_embedding_dimension
        tokens = re.findall(r"[a-z0-9]+", text.lower())

        for token in tokens:
            digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
            bucket = int.from_bytes(digest[:4], "big") % self.local_embedding_dimension
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[bucket] += sign

        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector
        return [value / norm for value in vector]

    async def embed_text(self, text: str) -> List[float]:
        return self._hash_embed(text)

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return [self._hash_embed(text) for text in texts]

    async def embed_query(self, text: str) -> List[float]:
        return self._hash_embed(text)

    def get_embedding_dimension(self) -> int:
        return self.local_embedding_dimension
