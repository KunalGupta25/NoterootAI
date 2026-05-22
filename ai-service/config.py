from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    port: int = 8000
    mongodb_uri: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    mistral_api_key: str = ""
    groq_api_key: str = ""
    chroma_persist_dir: str = "./chroma_db"
    default_provider: str = "openai"
    default_embedding_model: str = "text-embedding-3-small"
    default_chat_model_openai: str = "gpt-4o-mini"
    default_chat_model_anthropic: str = "claude-3-5-haiku-20241022"
    default_chat_model_gemini: str = "gemini-1.5-flash"
    default_chat_model_mistral: str = "mistral-small-latest"
    default_chat_model_groq: str = "llama-3.3-70b-versatile"
    default_embedding_model_mistral: str = "mistral-embed"
    default_embedding_model_groq: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
