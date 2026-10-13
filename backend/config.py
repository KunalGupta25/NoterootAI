from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NoteRootAI Backend"
    environment: str = "development"
    port: int = 8000
    mongodb_uri: str = ""
    mongodb_db_name: str = "noterootai"
    neo4j_uri: str = ""
    neo4j_username: str = ""
    neo4j_password: str = ""
    neo4j_database: str = "neo4j"
    jwt_secret: str = ""
    encryption_key: str = ""
    client_origins: str = "http://localhost:5173,http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.client_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
