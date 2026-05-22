from pydantic import BaseModel
from typing import Optional, List, Dict

# ── Embed ──────────────────────────────────────────────────────────
class EmbedRequest(BaseModel):
    note_id: str
    title: str
    content: str          # raw HTML or plain text
    tags: List[str] = []
    provider: str = "openai"
    api_key: Optional[str] = None
    custom_base_url: Optional[str] = None   # for custom OpenAI-compatible providers

class EmbedBulkRequest(BaseModel):
    notes: List[EmbedRequest]

class EmbedResponse(BaseModel):
    note_id: str
    chunks: int
    status: str = "ok"

# ── Chat ───────────────────────────────────────────────────────────
class Message(BaseModel):
    role: str             # "user" | "assistant" | "system"
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    provider: str = "openai"
    model: Optional[str] = None
    api_key: Optional[str] = None
    custom_base_url: Optional[str] = None   # for custom OpenAI-compatible providers
    custom_provider_name: Optional[str] = None  # display name
    context_note_id: Optional[str] = None
    context_note_title: Optional[str] = None
    context_note_content: Optional[str] = None
    use_vault: bool = True
    temperature: float = 0.7
    max_tokens: int = 2048

# ── Search ─────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str
    provider: str = "openai"
    api_key: Optional[str] = None
    custom_base_url: Optional[str] = None
    top_k: int = 5

class SearchResult(BaseModel):
    note_id: str
    title: str
    excerpt: str
    score: float
    tags: List[str] = []

class SearchResponse(BaseModel):
    results: List[SearchResult]

# ── Suggest ────────────────────────────────────────────────────────
class SuggestRequest(BaseModel):
    note_id: str
    title: str
    content: str
    provider: str = "openai"
    api_key: Optional[str] = None
    custom_base_url: Optional[str] = None
    top_k: int = 5

class SuggestResult(BaseModel):
    note_id: str
    title: str
    reason: str
    score: float

class SuggestResponse(BaseModel):
    related: List[SuggestResult]
    suggested_links: List[str] = []

# ── Health ─────────────────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str
    providers: Dict[str, bool]
    vector_store: bool
    notes_indexed: int
