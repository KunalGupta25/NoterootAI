import re

from core.neo4j_driver import neo4j


class VectorStore:
    """Store note embeddings in Neo4j, alongside the existing note graph."""

    @staticmethod
    def _identifier(collection: str, prefix: str) -> str:
        value = re.sub(r"[^A-Za-z0-9]", "_", collection).strip("_")
        if not value:
            raise ValueError("Vector collection name is required")
        return f"{prefix}_{value}"

    def _index_name(self, collection: str) -> str:
        return self._identifier(collection, "vector")

    def _label(self, collection: str) -> str:
        return self._identifier(collection, "VectorChunk")

    async def ensure_collection(self, collection: str, dimensions: int) -> None:
        if neo4j.driver is None:
            raise RuntimeError("Graph database unavailable")
        if not 1 <= dimensions <= 4096:
            raise ValueError("Embedding dimensions must be between 1 and 4096")
        index = self._index_name(collection)
        label = self._label(collection)
        query = (
            f"CREATE VECTOR INDEX `{index}` IF NOT EXISTS "
            f"FOR (chunk:`{label}`) ON (chunk.embedding) "
            "OPTIONS {indexConfig: {`vector.dimensions`: "
            f"{dimensions}, `vector.similarity_function`: 'cosine'}}}}"
        )
        async with neo4j.session() as session:
            await session.run(query)

    async def upsert(
        self,
        collection: str,
        note_id: str,
        title: str,
        tags: list[str],
        documents: list[str],
        embeddings: list[list[float]],
    ) -> None:
        if len(documents) != len(embeddings):
            raise ValueError("Each document must have an embedding")
        if not documents:
            return
        await self.ensure_collection(collection, len(embeddings[0]))
        label = self._label(collection)
        items = [
            {"id": f"{note_id}_{index}", "content": document, "embedding": embedding}
            for index, (document, embedding) in enumerate(zip(documents, embeddings, strict=True))
        ]
        async with neo4j.session() as session:
            await session.run(
                f"MATCH (note:Note {{id: $note_id}})-[:HAS_CHUNK]->(chunk:`{label}`) DETACH DELETE chunk",
                note_id=note_id,
            )
            await session.run(
                f"""
                MERGE (note:Note {{id: $note_id}})
                ON CREATE SET note.title = $title
                WITH note
                UNWIND $items AS item
                MERGE (chunk:NoteChunk:`{label}` {{id: item.id}})
                SET chunk.noteId = $note_id,
                    chunk.title = $title,
                    chunk.tags = $tags,
                    chunk.content = item.content,
                    chunk.embedding = item.embedding
                MERGE (note)-[:HAS_CHUNK]->(chunk)
                """,
                note_id=note_id,
                title=title,
                tags=tags,
                items=items,
            )

    async def search(self, collection: str, embedding: list[float], top_k: int) -> list[dict]:
        if neo4j.driver is None:
            raise RuntimeError("Graph database unavailable")
        if not embedding:
            return []
        index = self._index_name(collection)
        label = self._label(collection)
        await self.ensure_collection(collection, len(embedding))
        query = f"""
            MATCH (node:`{label}`)
            SEARCH node IN (
                VECTOR INDEX `{index}`
                FOR $embedding
                LIMIT $limit
            ) SCORE AS score
            RETURN node[$note_id_property] AS note_id,
                   node[$title_property] AS title,
                   node[$content_property] AS content,
                   node[$tags_property] AS tags,
                   score
            ORDER BY score DESC
        """
        async with neo4j.session() as session:
            result = await session.run(
                query,
                limit=top_k,
                embedding=embedding,
                note_id_property="noteId",
                title_property="title",
                content_property="content",
                tags_property="tags",
            )
            return await result.data()

    async def count_all(self) -> int:
        if neo4j.driver is None:
            return 0
        async with neo4j.session() as session:
            result = await session.run(
                "MATCH (chunk) WHERE 'NoteChunk' IN labels(chunk) RETURN count(chunk) AS count"
            )
            record = await result.single()
        return int(record["count"]) if record else 0


vector_store = VectorStore()
