from typing import Any

from pydantic import BaseModel, Field, model_validator


class EmbedRequest(BaseModel):
    note_id: str
    title: str
    content: str
    tags: list[str] = []
    provider: str = "openai"
    api_key: str | None = None
    custom_base_url: str | None = None


class EmbedBulkRequest(BaseModel):
    notes: list[EmbedRequest]


class EmbedResponse(BaseModel):
    note_id: str
    chunks: int
    status: str = "ok"


class Message(BaseModel):
    role: str
    content: str = Field(..., max_length=100_000)


class ChatRequest(BaseModel):
    messages: list[Message] = Field(..., max_length=30)
    provider: str = "openai"
    model: str | None = None
    api_key: str | None = None
    custom_base_url: str | None = None
    custom_provider_name: str | None = None
    context_note_id: str | None = None
    context_note_title: str | None = None
    context_note_content: str | None = None
    use_vault: bool = True
    temperature: float = 0.7
    max_tokens: int = Field(default=2048, le=4096)

    @model_validator(mode="after")
    def validate_total_chars(self) -> "ChatRequest":
        total = sum(len(m.content) for m in self.messages)
        if total > 120_000:
            raise ValueError(f"Total message content exceeds 120,000 characters (got {total})")
        return self


class SearchRequest(BaseModel):
    query: str
    provider: str = "openai"
    api_key: str | None = None
    custom_base_url: str | None = None
    top_k: int = Field(default=5, le=5)


class SearchResult(BaseModel):
    note_id: str
    title: str
    excerpt: str
    score: float
    tags: list[str] = []


class SearchResponse(BaseModel):
    results: list[SearchResult]


class SuggestRequest(BaseModel):
    note_id: str
    title: str
    content: str
    provider: str = "openai"
    api_key: str | None = None
    custom_base_url: str | None = None
    top_k: int = Field(default=5, le=5)


class SuggestResult(BaseModel):
    note_id: str
    title: str
    reason: str
    score: float


class SuggestResponse(BaseModel):
    related: list[SuggestResult]
    suggested_links: list[str] = []


class AgentMessage(BaseModel):
    role: str
    content: str | None = Field(default=None, max_length=100_000)
    tool_call_id: str | None = None
    tool_name: str | None = None
    tool_calls: list[dict[str, Any]] | None = None


class AgentToolResult(BaseModel):
    tool_call_id: str
    tool_name: str
    result: Any
    error: str | None = None


class AgentRequest(BaseModel):
    messages: list[AgentMessage] = Field(..., max_length=30)
    provider: str = "openai"
    model: str | None = None
    api_key: str | None = None
    custom_base_url: str | None = None
    context_note_id: str | None = None
    temperature: float = 0.5
    max_tokens: int = Field(default=4096, le=4096)
    tool_result: AgentToolResult | None = None

    @model_validator(mode="after")
    def validate_total_chars(self) -> "AgentRequest":
        total = sum(len(m.content or "") for m in self.messages)
        if total > 120_000:
            raise ValueError(f"Total message content exceeds 120,000 characters (got {total})")
        return self


class ModelsRequest(BaseModel):
    provider: str = "openai"
    api_key: str | None = None
    custom_base_url: str | None = None


class ModelsResponse(BaseModel):
    provider: str
    models: list[str]


class VaultOptions(BaseModel):
    enabled: bool = False
    top_k: int = Field(default=3, le=5)
    exclude_note_id: str | None = None
    min_score: float = 0.65


class WebOptions(BaseModel):
    enabled: bool = False
    max_results: int = Field(default=3, le=5)


class AssistRequest(BaseModel):
    messages: list[Message] = Field(..., max_length=30)
    mode: str = "chat"
    provider: str = "openai"
    model: str | None = None
    api_key: str | None = None
    custom_base_url: str | None = None
    vault: VaultOptions = VaultOptions()
    web: WebOptions = WebOptions()
    temperature: float = 0.5
    max_tokens: int = Field(default=1024, le=4096)

    @model_validator(mode="after")
    def validate_total_chars(self) -> "AssistRequest":
        total = sum(len(m.content) for m in self.messages)
        if total > 120_000:
            raise ValueError(f"Total message content exceeds 120,000 characters (got {total})")
        return self


class CapabilitiesResponse(BaseModel):
    web_available: bool
    web_provider: str | None = None
