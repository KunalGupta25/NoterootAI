from functools import lru_cache

import chromadb
from chromadb.config import Settings as ChromaSettings

from config import get_settings


class VectorStore:
    def __init__(self) -> None:
        self.client = chromadb.PersistentClient(
            path=get_settings().chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

    @lru_cache(maxsize=16)
    def collection(self, name: str):
        return self.client.get_or_create_collection(name=name, metadata={"hnsw:space": "cosine"})

    def count(self, name: str) -> int:
        return self.collection(name).count()

    def count_all(self) -> int:
        return sum(self.collection(item.name if hasattr(item, "name") else str(item)).count() for item in self.client.list_collections() if str(item.name if hasattr(item, "name") else item).startswith("notes_"))


vector_store = VectorStore()
