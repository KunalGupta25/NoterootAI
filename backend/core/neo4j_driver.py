from neo4j import AsyncDriver, AsyncGraphDatabase

from config import Settings


class Neo4jDatabase:
    driver: AsyncDriver | None = None

    async def connect(self, settings: Settings) -> None:
        if not settings.neo4j_uri:
            return
        self.driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_username, settings.neo4j_password),
        )
        await self.driver.verify_connectivity()

    async def close(self) -> None:
        if self.driver:
            await self.driver.close()
        self.driver = None


neo4j = Neo4jDatabase()
