from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NoteRootAI Backend"
    environment: str = "development"
    port: int = 8000
    mongodb_uri: str = ""
    mongodb_db_name: str = "noterootai"
    database_max_pool_size: int = 5
    neo4j_uri: str = ""
    neo4j_username: str = ""
    neo4j_password: str = ""
    neo4j_database: str = ""
    neo4j_max_connection_pool_size: int = 5
    jwt_secret: str = ""
    encryption_key: str = ""
    client_origins: str = "http://localhost:5173,http://localhost:3000"
    default_provider: str = "openai"
    default_embedding_model: str = "text-embedding-3-small"
    default_chat_model_openai: str = "gpt-4o-mini"
    default_chat_model_gemini: str = "gemini-1.5-flash"
    default_chat_model_mistral: str = "mistral-small-latest"
    default_chat_model_groq: str = "llama-3.3-70b-versatile"
    openai_api_key: str = ""
    gemini_api_key: str = ""
    mistral_api_key: str = ""
    groq_api_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.client_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
