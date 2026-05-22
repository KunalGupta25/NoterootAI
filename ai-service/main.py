from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn

from models import (
    EmbedRequest, EmbedBulkRequest, EmbedResponse,
    ChatRequest, SearchRequest, SearchResponse,
    SuggestRequest, SuggestResponse, HealthResponse
)
from services.embedder import embed_note
from services.retriever import search_notes
from services.rag import chat_rag
from services.suggest import get_suggestions
from services.vector_store import vector_store
from providers.factory import get_provider

app = FastAPI(title="NoteRootAI Service", version="1.0.0")

# Allow all origins for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check service health and configured providers."""
    # Note: in a real app you'd check connection to ChromaDB etc.
    return HealthResponse(
        status="ok",
        providers={
            "openai": True,
            "anthropic": True,
            "gemini": True,
            "mistral": True,
            "groq": True,
        },
        vector_store=True,
        notes_indexed=vector_store.count_all()
    )

@app.post("/embed", response_model=EmbedResponse)
async def embed_endpoint(request: EmbedRequest, background_tasks: BackgroundTasks):
    """Embed a single note. Usually called on save."""
    try:
        # We can do this in the background, but for immediate searchability 
        # doing it inline is okay for single notes.
        chunks = await embed_note(request)
        return EmbedResponse(note_id=request.note_id, chunks=chunks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed/bulk")
async def embed_bulk_endpoint(request: EmbedBulkRequest):
    """Embed multiple notes. Used for initial index building."""
    results = []
    for note in request.notes:
        try:
            chunks = await embed_note(note)
            results.append({"note_id": note.note_id, "status": "ok", "chunks": chunks})
        except Exception as e:
            results.append({"note_id": note.note_id, "status": "error", "error": str(e)})
    return {"results": results}

@app.post("/search", response_model=SearchResponse)
async def search_endpoint(request: SearchRequest):
    """Semantic search across notes."""
    try:
        return await search_notes(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/suggest", response_model=SuggestResponse)
async def suggest_endpoint(request: SuggestRequest):
    """Get related notes and link suggestions for a note."""
    try:
        return await get_suggestions(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Streaming RAG chat."""
    try:
        generator = chat_rag(request)
        return StreamingResponse(generator, media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from services.agent import run_agent
from models import AgentRequest

@app.post("/agent")
async def agent_endpoint(request: AgentRequest):
    """Streaming Agent chat with tool calling."""
    try:
        generator = run_agent(request)
        return StreamingResponse(generator, media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
