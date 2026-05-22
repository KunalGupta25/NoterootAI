from config import get_settings
from providers.openai_compatible_provider import OpenAICompatibleProvider


class GrokProvider(OpenAICompatibleProvider):
    provider_name = "grok"

    def __init__(self, api_key: str = None):
        settings = get_settings()
        super().__init__(
            api_key=api_key or settings.grok_api_key,
            base_url="https://api.x.ai/v1",
            embedding_model=settings.default_embedding_model_grok,
            chat_model=settings.default_chat_model_grok,
            embedding_dimension=1536,
            api_key_label="Grok",
        )
