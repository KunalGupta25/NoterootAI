import re

from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter

from providers.factory import get_provider
from schemas.ai import ChatRequest, EmbedRequest, SearchRequest, SearchResponse, SearchResult, SuggestRequest, SuggestResponse, SuggestResult
from services.vector_store import vector_store

splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)


async def embed_note(request: EmbedRequest) -> int:
    provider = get_provider(request.provider, request.api_key, request.custom_base_url)
    collection = vector_store.collection(provider.collection_name())
    text = BeautifulSoup(request.content, "html.parser").get_text(separator="\n\n", strip=True)
    chunks = splitter.split_text(f"Title: {request.title}\nTags: {', '.join(request.tags)}\n\n{text}")
    collection.delete(where={"note_id": request.note_id})
    if not chunks:
        return 0
    collection.upsert(
        ids=[f"{request.note_id}_{index}" for index in range(len(chunks))],
        embeddings=await provider.embed(chunks),
        documents=chunks,
        metadatas=[{"note_id": request.note_id, "title": request.title, "tags": ",".join(request.tags)} for _ in chunks],
    )
    return len(chunks)


async def search_notes(request: SearchRequest) -> SearchResponse:
    provider = get_provider(request.provider, request.api_key, request.custom_base_url)
    collection = vector_store.collection(provider.collection_name())
    count = collection.count()
    if not count:
        return SearchResponse(results=[])
    result = collection.query(query_embeddings=await provider.embed([request.query]), n_results=min(request.top_k, count), include=["documents", "metadatas", "distances"])
    found: list[SearchResult] = []
    seen: set[str] = set()
    for index, note_id in enumerate(result["ids"][0]):
        metadata = result["metadatas"][0][index]
        source_id = metadata["note_id"]
        if source_id in seen:
            continue
        seen.add(source_id)
        document = result["documents"][0][index]
        found.append(SearchResult(note_id=source_id, title=metadata["title"], excerpt=document[:300], score=max(0.0, 1 - result["distances"][0][index]), tags=metadata.get("tags", "").split(",") if metadata.get("tags") else []))
    return SearchResponse(results=found)


async def suggest_notes(request: SuggestRequest) -> SuggestResponse:
    results = await search_notes(SearchRequest(query=f"Title: {request.title}\n{request.content}", provider=request.provider, api_key=request.api_key, custom_base_url=request.custom_base_url, top_k=request.top_k + 1))
    related = [SuggestResult(note_id=item.note_id, title=item.title, reason="Semantic similarity", score=item.score) for item in results.results if item.note_id != request.note_id][: request.top_k]
    phrases = {phrase.strip() for phrase in re.findall(r"\b[A-Z][a-zA-Z\s]+[A-Z][a-z]+\b", request.content) if 5 < len(phrase.strip()) < 30}
    return SuggestResponse(related=related, suggested_links=list(phrases)[:5])


async def chat(request: ChatRequest):
    provider = get_provider(request.provider, request.api_key, request.custom_base_url)
    context: list[str] = []
    if request.context_note_content:
        context.append(BeautifulSoup(request.context_note_content, "html.parser").get_text(separator="\n\n", strip=True)[:4000])
    if request.use_vault and request.messages:
        matches = await search_notes(SearchRequest(query=request.messages[-1].content, provider=request.provider, api_key=request.api_key, custom_base_url=request.custom_base_url))
        context.extend(item.excerpt for item in matches.results)
    messages = list(request.messages)
    if context:
        from schemas.ai import Message
        messages.insert(0, Message(role="system", content="Answer using the following vault context:\n\n" + "\n\n".join(context)))
    async for chunk in provider.chat(messages, request.model, request.temperature, request.max_tokens):
        yield chunk
