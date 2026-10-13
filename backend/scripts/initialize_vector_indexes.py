import asyncio

from config import get_settings
from core.neo4j_driver import neo4j
from services.vector_store import vector_store


async def main() -> None:
    settings = get_settings()
    await neo4j.connect(settings)
    try:
        for provider in ("openai", "gemini", "mistral", "groq"):
            await vector_store.ensure_collection(f"notes_{provider}_1536", 1536)
        await vector_store.search("notes_openai_1536", [1.0, *([0.0] * 1535)], 1)
        print("Neo4j vector indexes are ready and searchable")
    finally:
        await neo4j.close()


if __name__ == "__main__":
    asyncio.run(main())
