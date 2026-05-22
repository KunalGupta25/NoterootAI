from providers.factory import get_provider
from services.vector_store import vector_store
from models import SearchRequest, SearchResult, SearchResponse

async def search_notes(request: SearchRequest) -> SearchResponse:
    provider = get_provider(request.provider, request.api_key, custom_base_url=request.custom_base_url)
    collection_name = provider.get_collection_name()
    
    # Guard: ChromaDB crashes if n_results > number of documents in the collection
    count = vector_store.count(collection_name=collection_name)
    if count == 0:
        return SearchResponse(results=[])
    
    safe_top_k = min(request.top_k, count)
    
    # 1. Embed query
    query_embedding = await provider.embed_query(request.query)

    # 2. Search vector store
    results = vector_store.search(
        query_embedding=query_embedding,
        top_k=safe_top_k,
        collection_name=collection_name,
    )

    if not results["ids"][0]:
        return SearchResponse(results=[])

    search_results = []
    # Chroma returns lists of lists
    for idx, doc_id in enumerate(results["ids"][0]):
        doc_content = results["documents"][0][idx]
        metadata = results["metadatas"][0][idx]
        distance = results["distances"][0][idx] if "distances" in results and results["distances"] else 0.0

        # Calculate semantic score from distance (assuming cosine)
        score = max(0.0, 1.0 - distance)

        tags_str = metadata.get("tags", "")
        tags = tags_str.split(",") if tags_str else []

        search_results.append(
            SearchResult(
                note_id=metadata["note_id"],
                title=metadata["title"],
                excerpt=doc_content[:300] + "..." if len(doc_content) > 300 else doc_content,
                score=score,
                tags=tags
            )
        )

    # Dedup by note_id, keeping the highest scoring chunk
    seen = set()
    deduped_results = []
    for r in search_results:
        if r.note_id not in seen:
            seen.add(r.note_id)
            deduped_results.append(r)

    return SearchResponse(results=deduped_results)
