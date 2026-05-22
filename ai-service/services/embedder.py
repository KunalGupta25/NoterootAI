from langchain_text_splitters import RecursiveCharacterTextSplitter
from bs4 import BeautifulSoup
from models import EmbedRequest
from providers.factory import get_provider
from services.vector_store import vector_store

# Text splitter configuration
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
    is_separator_regex=False,
)

def extract_text_from_html(html_content: str) -> str:
    """Extract plain text from HTML content (useful for ProseMirror HTML)."""
    soup = BeautifulSoup(html_content, "html.parser")
    return soup.get_text(separator="\n\n", strip=True)

async def embed_note(request: EmbedRequest) -> int:
    """
    Chunk the note, generate embeddings using the specified provider,
    and upsert into the vector store. Returns the number of chunks.
    """
    provider = get_provider(request.provider, request.api_key, custom_base_url=request.custom_base_url)
    collection_name = provider.get_collection_name()
    
    # 1. Prepare raw text
    raw_text = extract_text_from_html(request.content)
    # prepend title to text to ensure title is part of semantics
    full_text = f"Title: {request.title}\nTags: {', '.join(request.tags)}\n\n{raw_text}"
    
    # 2. Chunk text
    chunks = text_splitter.split_text(full_text)
    if not chunks:
        # even if empty, delete old chunks
        vector_store.delete_note_chunks(request.note_id, collection_name=collection_name)
        return 0

    # 3. Generate embeddings
    embeddings = await provider.embed_texts(chunks)

    # 4. Prepare metadata and IDs
    ids = []
    documents = []
    metadatas = []
    
    for i, chunk in enumerate(chunks):
        ids.append(f"{request.note_id}_{i}")
        documents.append(chunk)
        metadatas.append({
            "note_id": request.note_id,
            "title": request.title,
            "chunk_index": i,
            "tags": ",".join(request.tags),
            "provider": request.provider,
        })

    # 5. Delete old chunks first (to handle cases where note shrank)
    vector_store.delete_note_chunks(request.note_id, collection_name=collection_name)

    # 6. Upsert new chunks
    vector_store.upsert_chunks(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
        collection_name=collection_name,
    )

    return len(chunks)
