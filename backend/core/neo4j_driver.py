import asyncio
import logging
import time
from neo4j import AsyncDriver, AsyncGraphDatabase

from config import Settings, get_settings

logger = logging.getLogger(__name__)


class Neo4jSessionContext:
    def __init__(self, db: "Neo4jDatabase"):
        self.db = db
        self._session = None

    async def __aenter__(self):
        if self.db.driver is None:
            await self.db.reconnect_if_needed()
        if self.db.driver is None:
            raise RuntimeError("Graph database unavailable")
        database = get_settings().neo4j_database
        self._session = self.db.driver.session(database=database) if database else self.db.driver.session()
        return await self._session.__aenter__()

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._session:
            return await self._session.__aexit__(exc_type, exc_val, exc_tb)


class Neo4jDatabase:
    driver: AsyncDriver | None = None
    _last_connect_attempt: float = 0.0
    _reconnect_cooldown: float = 60.0
    _lock = asyncio.Lock()

    @property
    def is_connected(self) -> bool:
        return self.driver is not None

    async def connect(self, settings: Settings) -> None:
        if not settings.neo4j_uri:
            return
        async with self._lock:
            self._last_connect_attempt = time.monotonic()
            temp_driver = AsyncGraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_username, settings.neo4j_password),
                max_connection_pool_size=settings.neo4j_max_connection_pool_size,
                connection_timeout=5,
                connection_acquisition_timeout=5,
            )
            try:
                await asyncio.wait_for(temp_driver.verify_connectivity(), timeout=8)
                self.driver = temp_driver
            except Exception:
                await temp_driver.close()
                self.driver = None
                raise

    async def reconnect_if_needed(self) -> None:
        now = time.monotonic()
        if self.driver is not None:
            return
        if now - self._last_connect_attempt < self._reconnect_cooldown:
            return
        settings = get_settings()
        if not settings.neo4j_uri:
            return
        try:
            logger.info("Attempting lazy reconnection to Neo4j...")
            await self.connect(settings)
        except Exception as e:
            logger.warning("Neo4j reconnection attempt failed: %s", e)

    async def close(self) -> None:
        if self.driver:
            await self.driver.close()
        self.driver = None

    def session(self):
        return Neo4jSessionContext(self)


neo4j = Neo4jDatabase()
