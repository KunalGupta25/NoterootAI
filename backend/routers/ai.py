from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from schemas.ai import AgentRequest, ChatRequest, EmbedBulkRequest, EmbedRequest, EmbedResponse, SearchRequest, SearchResponse, SuggestRequest, SuggestResponse
from services.agent_service import run_agent
from services.ai_service import chat, embed_note, search_notes, suggest_notes
from services.vector_store import vector_store

router = APIRouter(tags=["ai"])


@router.get("/health")
async def ai_health() -> dict:
    return {"status": "ok", "providers": {name: True for name in ("openai", "anthropic", "gemini", "mistral", "groq")}, "vector_store": True, "notes_indexed": vector_store.count_all()}


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
    return StreamingResponse(chat(request), media_type="text/event-stream")


@router.post("/agent")
async def agent(request: AgentRequest) -> StreamingResponse:
    return StreamingResponse(run_agent(request), media_type="text/event-stream")
