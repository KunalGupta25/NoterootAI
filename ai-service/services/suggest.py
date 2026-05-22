from models import SuggestRequest, SuggestResponse, SuggestResult, SearchRequest
from services.retriever import search_notes
import re

async def get_suggestions(request: SuggestRequest) -> SuggestResponse:
    # 1. Find related notes based on current note content
    search_req = SearchRequest(
        query=f"Title: {request.title}\n{request.content}",
        provider=request.provider,
        api_key=request.api_key,
        top_k=request.top_k + 1  # Get extra in case we match ourselves
    )
    
    search_resp = await search_notes(search_req)
    
    related = []
    for res in search_resp.results:
        if res.note_id != request.note_id:  # Don't suggest the current note
            related.append(
                SuggestResult(
                    note_id=res.note_id,
                    title=res.title,
                    reason="Semantic similarity",
                    score=res.score
                )
            )
            if len(related) >= request.top_k:
                break

    # 2. Backlink / phrase suggestions (simple heuristic for now)
    # In a full implementation, this would use the LLM to extract key phrases
    # or match against known titles in the vault.
    # For now we'll just extract Capitalized Phrases as potential links.
    phrases = re.findall(r'\b[A-Z][a-zA-Z\s]+[A-Z][a-z]+\b', request.content)
    # filter out very long ones or duplicates
    suggested_links = list(set([p.strip() for p in phrases if 5 < len(p) < 30]))[:5]

    return SuggestResponse(
        related=related,
        suggested_links=suggested_links
    )
