from typing import AsyncGenerator

from bs4 import BeautifulSoup

from models import ChatRequest, Message, SearchRequest
from providers.factory import get_provider
from services.retriever import search_notes
from services.vector_store import vector_store


def _html_to_text(content: str) -> str:
    return BeautifulSoup(content or "", "html.parser").get_text(separator="\n\n", strip=True)


async def chat_rag(request: ChatRequest) -> AsyncGenerator[str, None]:
    provider = get_provider(request.provider, request.api_key, custom_base_url=request.custom_base_url)
    collection_name = provider.get_collection_name()

    system_prompt = (
        "You are NoteRootAI, a helpful knowledge base assistant. "
        "Answer questions based on the provided context."
    )
    context_parts = []

    if request.context_note_content:
        note_title = request.context_note_title or "Current note"
        note_text = _html_to_text(request.context_note_content)
        if note_text:
            context_parts.append(f"--- Current Note: {note_title} ---\n{note_text[:4000]}\n")
    elif request.context_note_id:
        try:
            note_chunks = vector_store.get_note_documents(
                request.context_note_id,
                collection_name=collection_name,
            )
            documents = note_chunks.get("documents", [])
            metadatas = note_chunks.get("metadatas", [])
            if documents:
                title = metadatas[0].get("title") if metadatas and metadatas[0] else "Current note"
                context_parts.append(
                    f"--- Current Note: {title} ---\n" + "\n\n".join(documents[:4]) + "\n"
                )
        except Exception as e:
            print(f"[RAG] Current-note lookup failed, proceeding without it: {e}")

    if request.use_vault and request.messages:
        last_user_msg = next((m.content for m in reversed(request.messages) if m.role == "user"), None)

        if last_user_msg:
            try:
                search_req = SearchRequest(
                    query=last_user_msg,
                    provider=request.provider,
                    api_key=request.api_key,
                    custom_base_url=request.custom_base_url,
                    top_k=5,
                )
                search_resp = await search_notes(search_req)

                for res in search_resp.results:
                    if request.context_note_id and res.note_id == request.context_note_id:
                        continue
                    context_parts.append(f"--- Note: {res.title} ---\n{res.excerpt}\n")
            except Exception as e:
                print(f"[RAG] Vault search failed, proceeding without context: {e}")

    if context_parts:
        context = "\n".join(context_parts)
        system_prompt += f"\n\nHere is relevant context from the user's vault:\n\n{context}"

    final_messages = [Message(role="system", content=system_prompt)]
    final_messages.extend(request.messages)

    try:
        async for chunk in provider.chat_stream(
            messages=final_messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        ):
            yield chunk
    except Exception as e:
        yield f"\n\n[Error during generation: {str(e)}]"
