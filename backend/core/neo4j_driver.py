from neo4j import AsyncDriver, AsyncGraphDatabase

from config import Settings, get_settings


class Neo4jDatabase:
    driver: AsyncDriver | None = None

    async def connect(self, settings: Settings) -> None:
        if not settings.neo4j_uri:
            return
        self.driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_username, settings.neo4j_password),
            max_connection_pool_size=settings.neo4j_max_connection_pool_size,
        )
        await self.driver.verify_connectivity()

    async def close(self) -> None:
        if self.driver:
            await self.driver.close()
        self.driver = None

    def session(self):
        if self.driver is None:
            raise RuntimeError("Graph database unavailable")
        database = get_settings().neo4j_database
        return self.driver.session(database=database) if database else self.driver.session()


neo4j = Neo4jDatabase()
