from typing import Any

from pydantic import BaseModel


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
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
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
    max_tokens: int = 2048


class SearchRequest(BaseModel):
    query: str
    provider: str = "openai"
    api_key: str | None = None
    custom_base_url: str | None = None
    top_k: int = 5


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
    top_k: int = 5


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
    content: str | None = None
    tool_call_id: str | None = None
    tool_name: str | None = None
    tool_calls: list[dict[str, Any]] | None = None


class AgentToolResult(BaseModel):
    tool_call_id: str
    tool_name: str
    result: Any
    error: str | None = None


class AgentRequest(BaseModel):
    messages: list[AgentMessage]
    provider: str = "openai"
    model: str | None = None
    api_key: str | None = None
    custom_base_url: str | None = None
    context_note_id: str | None = None
    temperature: float = 0.5
    max_tokens: int = 4096
    tool_result: AgentToolResult | None = None


class ModelsRequest(BaseModel):
    provider: str = "openai"
    api_key: str | None = None
    custom_base_url: str | None = None


class ModelsResponse(BaseModel):
    provider: str
    models: list[str]
