from providers.base import BaseProvider
from providers.openai_provider import OpenAIProvider
from providers.anthropic_provider import AnthropicProvider
from config import get_settings


def get_provider(
    provider_name: str = None,
    api_key: str = None,
    custom_base_url: str = None,
    custom_default_model: str = None,
) -> BaseProvider:
    settings = get_settings()
    provider_name = (provider_name or settings.default_provider).lower()

    if provider_name == "openai":
        return OpenAIProvider(api_key=api_key)
    elif provider_name == "anthropic":
        return AnthropicProvider(api_key=api_key)
    elif provider_name == "gemini":
        return OpenAIProvider(
            api_key=api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            default_model=settings.default_chat_model_gemini,
            provider_name="gemini",
        )
    elif provider_name == "mistral":
        return OpenAIProvider(
            api_key=api_key,
            base_url="https://api.mistral.ai/v1",
            default_model=settings.default_chat_model_mistral,
            provider_name="mistral",
        )
    elif provider_name == "groq":
        return OpenAIProvider(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
            default_model=settings.default_chat_model_groq,
            provider_name="groq",
            default_embedding_model="",
        )
    elif provider_name == "custom" or custom_base_url:
        return OpenAIProvider(
            api_key=api_key,
            base_url=custom_base_url,
            default_model=custom_default_model,
            provider_name="custom",
        )
    else:
        raise ValueError(f"Unknown provider: {provider_name}")
