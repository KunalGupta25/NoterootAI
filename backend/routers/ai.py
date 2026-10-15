from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from config import get_settings
from providers.factory import get_provider
from schemas.ai import (
    AgentRequest, AssistRequest, CapabilitiesResponse, ChatRequest, EmbedBulkRequest,
    EmbedRequest, EmbedResponse, ModelsRequest, ModelsResponse, SearchRequest,
    SearchResponse, SuggestRequest, SuggestResponse
)
from services.agent_service import run_agent
from services.ai_service import assist, chat, embed_note, search_notes, suggest_notes
from services.vector_store import vector_store
from services.web_search import web_search_service

router = APIRouter(tags=["ai"])


@router.get("/health")
async def ai_health() -> dict:
    return {"status": "ok", "providers": {name: True for name in ("openai", "gemini", "mistral", "groq")}, "vector_store": "neo4j", "notes_indexed": await vector_store.count_all()}


@router.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest) -> EmbedResponse:
    try:
        return EmbedResponse(note_id=request.note_id, chunks=await embed_note(request))
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.post("/embed/bulk")
async def embed_bulk(request: EmbedBulkRequest) -> dict:
    results = []
    for item in request.notes:
        try:
            results.append({"note_id": item.note_id, "status": "ok", "chunks": await embed_note(item)})
        except Exception as error:
            results.append({"note_id": item.note_id, "status": "error", "error": str(error)})
    return {"results": results}


@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest) -> SearchResponse:
    return await search_notes(request)


@router.post("/suggest", response_model=SuggestResponse)
async def suggest(request: SuggestRequest) -> SuggestResponse:
    return await suggest_notes(request)


@router.post("/chat")
async def streaming_chat(request: ChatRequest) -> StreamingResponse:
    try:
        get_provider(request.provider, request.api_key, request.custom_base_url)
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return StreamingResponse(chat(request), media_type="text/event-stream")


@router.post("/assist")
async def streaming_assist(request: AssistRequest) -> StreamingResponse:
    try:
        get_provider(request.provider, request.api_key, request.custom_base_url)
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return StreamingResponse(assist(request), media_type="text/event-stream")


@router.get("/assist/capabilities", response_model=CapabilitiesResponse)
async def assist_capabilities() -> CapabilitiesResponse:
    settings = get_settings()
    return CapabilitiesResponse(
        web_available=web_search_service.is_available(),
        web_provider=settings.web_search_provider or None,
    )


@router.post("/agent")
async def agent(request: AgentRequest) -> StreamingResponse:
    return StreamingResponse(run_agent(request), media_type="text/event-stream")


@router.post("/models", response_model=ModelsResponse)
async def fetch_models(request: ModelsRequest) -> ModelsResponse:
    try:
        provider = get_provider(request.provider, request.api_key, request.custom_base_url)
        models = await provider.list_models()
        return ModelsResponse(provider=request.provider, models=models)
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
