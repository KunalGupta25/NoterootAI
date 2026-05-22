from config import get_settings
from providers.openai_compatible_provider import OpenAICompatibleProvider


class MistralProvider(OpenAICompatibleProvider):
    provider_name = "mistral"

    def __init__(self, api_key: str = None):
        settings = get_settings()
        super().__init__(
            api_key=api_key or settings.mistral_api_key,
            base_url="https://api.mistral.ai/v1",
            embedding_model=settings.default_embedding_model_mistral,
            chat_model=settings.default_chat_model_mistral,
            embedding_dimension=1024,
            api_key_label="Mistral",
        )
