import chromadb
from chromadb.config import Settings
from config import get_settings
import os
from functools import lru_cache

class VectorStore:
    def __init__(self):
        settings = get_settings()
        persist_dir = settings.chroma_persist_dir
        
        # Ensure the directory exists
        os.makedirs(persist_dir, exist_ok=True)
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False)
        )
        
        self.default_collection_name = "notes_openai_1536"

    @lru_cache(maxsize=16)
    def get_collection(self, collection_name: str = None):
        name = collection_name or self.default_collection_name
        return self.client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"}
        )

    def upsert_chunks(self, ids: list[str], embeddings: list[list[float]], documents: list[str], metadatas: list[dict], collection_name: str = None):
        """Insert or update chunks with their vector embeddings."""
        if not ids:
            return
            
        self.get_collection(collection_name).upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )

    def search(self, query_embedding: list[float], top_k: int = 5, where: dict = None, collection_name: str = None):
        """Search the vector store using a query embedding."""
        results = self.get_collection(collection_name).query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where,
            include=["documents", "metadatas", "distances"]
        )
        return results

    def get_note_documents(self, note_id: str, collection_name: str = None):
        """Return all stored chunks for a note."""
        return self.get_collection(collection_name).get(
            where={"note_id": note_id},
            include=["documents", "metadatas"]
        )

    def delete_note_chunks(self, note_id: str, collection_name: str = None):
        """Delete all chunks belonging to a specific note."""
        self.get_collection(collection_name).delete(
            where={"note_id": note_id}
        )

    def count(self, collection_name: str = None) -> int:
        """Return the total number of chunks in the collection."""
        return self.get_collection(collection_name).count()

    def count_all(self) -> int:
        """Return chunks across NoteRoot provider collections."""
        total = 0
        for collection in self.client.list_collections():
            name = collection.name if hasattr(collection, "name") else collection
            if str(name).startswith("notes_"):
                total += self.get_collection(str(name)).count()
        return total

# Singleton instance
vector_store = VectorStore()
