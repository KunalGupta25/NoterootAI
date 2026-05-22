from providers.base import BaseProvider
from providers.openai_provider import OpenAIProvider
from providers.gemini_provider import GeminiProvider
from providers.anthropic_provider import AnthropicProvider
from providers.mistral_provider import MistralProvider
from providers.grok_provider import GrokProvider
from providers.custom_openai_provider import CustomOpenAIProvider
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
        return GeminiProvider(api_key=api_key)
    elif provider_name == "mistral":
        return MistralProvider(api_key=api_key)
    elif provider_name in {"grok", "xai"}:
        return GrokProvider(api_key=api_key)
    elif provider_name == "custom" or custom_base_url:
        return CustomOpenAIProvider(
            api_key=api_key,
            base_url=custom_base_url,
            default_model=custom_default_model,
        )
    else:
        raise ValueError(f"Unknown provider: {provider_name}")
