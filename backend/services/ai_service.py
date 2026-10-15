import re

from bs4 import BeautifulSoup
from providers.factory import get_provider
from schemas.ai import ChatRequest, EmbedRequest, SearchRequest, SearchResponse, SearchResult, SuggestRequest, SuggestResponse, SuggestResult
from services.vector_store import vector_store


def split_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text on word boundaries without loading a general-purpose RAG framework."""
    chunks: list[str] = []
    start = 0
    text = text.strip()
    while start < len(text):
        end = min(start + chunk_size, len(text))
        if end < len(text):
            boundary = text.rfind(" ", start + chunk_size // 2, end)
            if boundary > start:
                end = boundary
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)
    return chunks


async def embed_note(request: EmbedRequest) -> int:
    provider = get_provider(request.provider, request.api_key, request.custom_base_url)
    collection = provider.collection_name()
    text = BeautifulSoup(request.content, "html.parser").get_text(separator="\n\n", strip=True)
    chunks = split_text(f"Title: {request.title}\nTags: {', '.join(request.tags)}\n\n{text}")
    if not chunks:
        return 0
    await vector_store.upsert(
        collection=collection,
        note_id=request.note_id,
        title=request.title,
        tags=request.tags,
        documents=chunks,
        embeddings=await provider.embed(chunks),
    )
    return len(chunks)


async def search_notes(request: SearchRequest) -> SearchResponse:
    provider = get_provider(request.provider, request.api_key, request.custom_base_url)
    result = await vector_store.search(
        provider.collection_name(),
        (await provider.embed([request.query]))[0],
        request.top_k,
    )
    found: list[SearchResult] = []
    seen: set[str] = set()
    for item in result:
        source_id = item["note_id"]
        if source_id in seen:
            continue
        seen.add(source_id)
        found.append(SearchResult(
            note_id=source_id,
            title=item.get("title") or "Untitled Note",
            excerpt=(item.get("content") or "")[:300],
            score=float(item["score"]),
            tags=item.get("tags") or [],
        ))
    return SearchResponse(results=found)


async def suggest_notes(request: SuggestRequest) -> SuggestResponse:
    results = await search_notes(SearchRequest(query=f"Title: {request.title}\n{request.content}", provider=request.provider, api_key=request.api_key, custom_base_url=request.custom_base_url, top_k=request.top_k + 1))
    related = [SuggestResult(note_id=item.note_id, title=item.title, reason="Semantic similarity", score=item.score) for item in results.results if item.note_id != request.note_id][: request.top_k]
    phrases = {phrase.strip() for phrase in re.findall(r"\b[A-Z][a-zA-Z\s]+[A-Z][a-z]+\b", request.content) if 5 < len(phrase.strip()) < 30}
    return SuggestResponse(related=related, suggested_links=list(phrases)[:5])


async def chat(request: ChatRequest):
    try:
        provider = get_provider(request.provider, request.api_key, request.custom_base_url)
        context: list[str] = []
        if request.context_note_content:
            context.append(BeautifulSoup(request.context_note_content, "html.parser").get_text(separator="\n\n", strip=True)[:4000])
        if request.use_vault and request.messages:
            try:
                matches = await search_notes(SearchRequest(query=request.messages[-1].content, provider=request.provider, api_key=request.api_key, custom_base_url=request.custom_base_url))
                context.extend(item.excerpt for item in matches.results)
            except Exception:
                # Vault search unavailable or no indexed notes; proceed with normal conversation
                pass
        messages = list(request.messages)
        if context:
            from schemas.ai import Message
            messages.insert(0, Message(role="system", content="Answer using the following vault context:\n\n" + "\n\n".join(context)))
        async for chunk in provider.chat(messages, request.model, request.temperature, request.max_tokens):
            yield chunk
    except Exception as err:
        import logging
        logging.exception("Chat generation error: %s", err)
        yield f"\n\n[Error from {request.provider}: {str(err)}]"
