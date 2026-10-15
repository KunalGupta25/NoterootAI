import asyncio
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


async def assist(request: "AssistRequest"):
    import html
    import json
    import logging
    from schemas.ai import AssistRequest
    from services.web_search import web_search_service

    try:
        provider = get_provider(request.provider, request.api_key, request.custom_base_url)

        # Defensive server-side history cap (limit total historical messages)
        max_history_turns = 20
        raw_messages = list(request.messages)
        if len(raw_messages) > max_history_turns + 2:
            # Keep first system prompt if present, plus latest turns
            if raw_messages and raw_messages[0].role == "system":
                raw_messages = [raw_messages[0]] + raw_messages[-(max_history_turns + 1):]
            else:
                raw_messages = raw_messages[-max_history_turns:]

        # Extract user question from the final message
        final_msg = raw_messages[-1] if raw_messages else None
        clean_question = ""
        if final_msg and final_msg.role == "user":
            clean_question = re.sub(r"<context>[\s\S]*?</context>", "", final_msg.content).strip()

        vault_tags: list[str] = []
        vault_meta: list[dict] = []
        if request.vault.enabled and clean_question:
            try:
                search_res = await search_notes(
                    SearchRequest(
                        query=clean_question[:200],
                        provider=request.provider,
                        api_key=request.api_key,
                        custom_base_url=request.custom_base_url,
                        top_k=request.vault.top_k + 2,
                    )
                )
                total_vault_chars = 0
                max_vault_chars = 2400  # ~600 tokens
                seen_ids: set[str] = set()

                for item in search_res.results:
                    if request.vault.exclude_note_id and item.note_id == request.vault.exclude_note_id:
                        continue
                    if item.score < request.vault.min_score:
                        continue
                    if item.note_id in seen_ids:
                        continue
                    seen_ids.add(item.note_id)

                    excerpt = (item.excerpt or "").strip()[:400]
                    if total_vault_chars + len(excerpt) > max_vault_chars:
                        break
                    total_vault_chars += len(excerpt)

                    v_title = html.escape(item.title, quote=True)
                    v_id = html.escape(item.note_id, quote=True)
                    vault_tags.append(f'<vault title="{v_title}" id="{v_id}">\n{excerpt}\n</vault>')
                    vault_meta.append({"title": item.title, "id": item.note_id, "score": item.score})
                    if len(vault_tags) >= request.vault.top_k:
                        break
            except Exception as v_err:
                logging.warning("Vault search skipped: %s", v_err)

        web_tags: list[str] = []
        web_meta: list[dict] = []
        extra_body = None

        if request.web.enabled and clean_question:
            if web_search_service.is_available():
                try:
                    web_results = await web_search_service.search(
                        clean_question[:200], max_results=request.web.max_results
                    )
                    for idx, w in enumerate(web_results, 1):
                        w_title = html.escape(w.get("title", ""), quote=True)
                        w_url = html.escape(w.get("url", ""), quote=True)
                        snippet = w.get("snippet", "")[:300]
                        web_tags.append(f'<web n="{idx}" url="{w_url}" title="{w_title}">\n{snippet}\n</web>')
                        web_meta.append({"n": idx, "title": w.get("title"), "url": w.get("url")})
                except Exception as w_err:
                    logging.warning("Web search skipped: %s", w_err)
            elif request.provider == "openrouter":
                # Use OpenRouter's web plugin via extra_body
                extra_body = {"plugins": [{"id": "web"}]}
                web_meta.append({"plugin": "openrouter-web"})

        # Inject vault and web tags into ephemeral <context> block in final user message
        if (vault_tags or web_tags) and final_msg and final_msg.role == "user":
            new_tags = "\n".join(vault_tags + web_tags)
            if "<context>" in final_msg.content and "</context>" in final_msg.content:
                # Insert inside existing context block
                final_msg.content = final_msg.content.replace("</context>", f"{new_tags}\n</context>")
            else:
                # Prepend new context block
                final_msg.content = f"<context>\n{new_tags}\n</context>\n\n{final_msg.content}"

        # Estimate input tokens
        estimated_input_tokens = sum(
            int(len(m.content or "") / 4) + 4 for m in raw_messages
        )

        # Emit meta event
        meta_payload = {
            "type": "meta",
            "sources": {
                "vault": vault_meta,
                "web": web_meta,
            },
            "estimated_input_tokens": estimated_input_tokens,
        }
        yield f"data: {json.dumps(meta_payload)}\n\n"

        # Stream LLM generation with keep-alive ping and finish detection
        messages_dicts = [{"role": m.role, "content": m.content} for m in raw_messages]
        stream_gen = provider.chat_stream(
            messages=messages_dicts,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            extra_body=extra_body,
        )
        has_sent_done = False
        while True:
            try:
                chunk = await asyncio.wait_for(stream_gen.__anext__(), timeout=15.0)
            except TimeoutError:
                yield ": ping\n\n"
                continue
            except StopAsyncIteration:
                break
            if chunk.get("type") == "done":
                has_sent_done = True
            yield f"data: {json.dumps(chunk)}\n\n"

        if not has_sent_done:
            yield f"data: {json.dumps({'type': 'done', 'finish_reason': 'stop'})}\n\n"

        yield "data: [DONE]\n\n"

    except Exception as err:
        import json
        import logging
        logging.exception("Assist error: %s", err)
        yield f"data: {json.dumps({'type': 'error', 'error': str(err)})}\n\n"
        yield "data: [DONE]\n\n"

