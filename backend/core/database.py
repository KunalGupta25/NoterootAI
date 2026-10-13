from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config import Settings


class MongoDatabase:
    client: AsyncIOMotorClient | None = None
    database: AsyncIOMotorDatabase | None = None

    async def connect(self, settings: Settings) -> None:
        if not settings.mongodb_uri:
            return
        self.client = AsyncIOMotorClient(settings.mongodb_uri)
        self.database = self.client[settings.mongodb_db_name]
        await self.database.command("ping")

    async def close(self) -> None:
        if self.client:
            self.client.close()
        self.client = None
        self.database = None

    async def ensure_indexes(self) -> None:
        if self.database is None:
            return
        await self.database.users.create_index("email", unique=True)
        await self.database.notes.create_index([("userId", 1), ("updatedAt", -1)])
        await self.database.marketplaceplugins.create_index("pluginId", unique=True)


mongo = MongoDatabase()


def get_database() -> AsyncIOMotorDatabase:
    if mongo.database is None:
        raise RuntimeError("MongoDB is unavailable")
    return mongo.database
