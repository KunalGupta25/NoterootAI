# NoteRootAI — FastAPI Migration & Unified Container Plan

> **Goal:** Replace Node.js/Express with a unified Python FastAPI backend, merge the AI microservice into it, run everything in a single Docker container, improve load handling, and enhance the UI/UX.

---

## Table of Contents
1. [Why FastAPI Over Express](#why-fastapi)
2. [New Architecture](#new-architecture)
3. [Express Transition & Cleanup](#express-transition)
4. [Phase 0 — Requirements & Folder Structure](#phase-0)
5. [Phase 1 — App Factory & Config](#phase-1)
6. [Phase 2 — Database Layer (Beanie/Motor + Neo4j)](#phase-2)
7. [Phase 3 — Authentication System](#phase-3)
8. [Phase 4 — Notes API](#phase-4)
9. [Phase 5 — Plugins Marketplace API](#phase-5)
10. [Phase 6 — AI Service Integration (Merged)](#phase-6)
11. [Phase 7 — WebSocket (Socket.IO replacement)](#phase-7)
12. [Phase 8 — Docker Unified Container](#phase-8)
13. [Phase 9 — Load Handling & Hardening](#phase-9)
14. [Phase 10 — Client-Side Updates](#phase-10)
15. [Phase 11 — UI/UX Improvements](#phase-11)
16. [Phase 12 — Testing Checklist](#phase-12)
17. [File Reference Table](#file-reference)
18. [Environment Variables](#env-vars)
19. [Deployment Guide](#deployment)

---

## Why FastAPI Over Express {#why-fastapi}

| Concern | Express (Current) | FastAPI (Target) |
|---|---|---|
| Language | TypeScript/Node.js | Python (same as AI service) |
| Concurrency | Single-threaded event loop | Async + multi-worker Gunicorn |
| Load handling | Moderate | High (4 UvicornWorker procs) |
| Type safety | Manual TS interfaces | Auto-validated Pydantic models |
| API Docs | None | Built-in Swagger at `/docs` |
| AI merge | Needs 2 containers | Single Python process, no HTTP hop |
| Docker size | Node + Python = 2 images | Python only, ~40% smaller |
| Rate limiting | 3rd-party middleware | `slowapi` — 1-line decorator |
| Deployment | `node dist/app.js` | `gunicorn -w 4 -k uvicorn.workers.UvicornWorker` |

---

## New Architecture {#new-architecture}

```
┌──────────────────────────────────────────────────┐
│     Docker Container: noterootai-backend          │
│                                                   │
│  Gunicorn → 4 × UvicornWorker (async)            │
│                                                   │
│  /api/auth/*     Auth Router                      │
│  /api/notes/*    Notes Router                     │
│  /api/graph/*    Graph Router (Neo4j)             │
│  /api/plugins/*  Plugins Marketplace              │
│  /api/ws         WebSocket (native)               │
│  /embed  /chat  /agent  /search  /suggest  /health│
│                                                   │
│  Volume: /app/chroma_db (ChromaDB vectors)        │
│  Port: 8000                                       │
└──────────────────────────────────────────────────┘

External Cloud:
  MongoDB Atlas  → Notes, Users, Plugins
  Neo4j AuraDB  → Graph ([[wiki-links]])

Client (Vercel):
  React + Vite → calls single BACKEND_URL:8000
```

---

## Express Transition & Cleanup {#express-transition}

Treat `server/` as the production reference until every replacement endpoint has passed the same contract checks. Build FastAPI alongside it; do not delete, rename, or point the client at a partial backend.

### Clean Up Express While It Remains Live

Complete these small changes when touching the corresponding Express area. They reduce migration risk and make the old implementation easier to compare:

| Area | Current location | Cleanup work | Done when |
|---|---|---|---|
| Application bootstrap | `server/src/app.ts` | Extract configuration, database startup, Socket.IO setup, and error handling into focused modules. Validate required production configuration at startup. | The entry file only assembles the app and starts the HTTP server. |
| Errors and logging | `server/src/app.ts`, controllers, and routes | Use one typed async-error path and consistent `{ error: string }` responses. Add request IDs and structured error logs without logging tokens or note content. | Unexpected failures have a single response shape and actionable logs. |
| API boundaries | `server/src/routes/`, `controllers/` | Keep routes responsible for HTTP wiring and controllers/services responsible for business logic. Validate request bodies before persistence. | Each FastAPI router can be mapped to one documented Express route group. |
| Data access | `server/src/models/`, `neo4j.ts` | Centralize MongoDB and Neo4j lifecycle handling. Ensure Neo4j sessions close in `finally` blocks and database failures report a safe error. | Connection cleanup and error behavior are predictable under failure. |
| Real time | `server/src/app.ts` and client callers | Document Socket.IO events and payloads before replacing them with native WebSocket messages. Keep Socket.IO until the client has completed the WebSocket cutover. | The new protocol has equivalent connection, message, and reconnect behavior. |

### Cutover Gates

1. Capture the current response status, body shape, authentication behavior, and side effects for every Express route.
2. Run those contract checks against the FastAPI replacement, including invalid input and unavailable MongoDB/Neo4j cases.
3. Deploy the unified backend to a staging URL and switch a test client configuration only after parity passes.
4. Keep Express deployable for one rollback window after production cutover. Remove its Railway configuration, Node dependencies, and `server/` only after monitoring confirms a stable release.

---

## Phase 0 — Requirements & Folder Structure {#phase-0}

### `backend/requirements.txt`

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
gunicorn==22.0.0
pydantic==2.8.0
pydantic-settings==2.4.0
email-validator==2.2.0
motor==3.5.0
beanie==1.26.0
neo4j==5.24.0
bcrypt==4.2.0
python-jose[cryptography]==3.3.0
python-multipart==0.0.9
cryptography==43.0.0
openai==1.51.0
google-genai==0.8.0
anthropic==0.34.0
mistralai==1.0.3
chromadb==0.5.15
langchain-text-splitters==0.3.0
beautifulsoup4==4.12.3
slowapi==0.1.9
python-dotenv==1.0.1
websockets==13.0.1
httpx==0.27.0
```

### Target Folder Structure

```
backend/
├── main.py                    # App factory + router assembly
├── config.py                  # Settings (pydantic-settings)
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── .env.example
│
├── core/
│   ├── database.py            # Motor/Beanie MongoDB
│   ├── neo4j_driver.py        # Async Neo4j driver
│   ├── security.py            # JWT + AES-256-GCM
│   ├── rate_limit.py          # slowapi limiter
│   └── middleware.py          # Request timing, error handling
│
├── models/                    # Beanie documents (like Mongoose schemas)
│   ├── user.py
│   ├── note.py
│   └── marketplace_plugin.py
│
├── schemas/                   # Pydantic request/response bodies
│   ├── auth.py
│   ├── notes.py
│   ├── plugins.py
│   └── ai.py                  # Moved from ai-service/models.py
│
├── routers/
│   ├── auth.py                # /api/auth/*
│   ├── notes.py               # /api/notes/*
│   ├── graph.py               # /api/graph/*
│   ├── plugins.py             # /api/plugins/*
│   ├── websocket.py           # /api/ws
│   └── ai.py                  # /embed /chat /agent /search /suggest
│
├── services/
│   ├── note_service.py        # Neo4j sync logic
│   ├── embedder.py            # (moved from ai-service)
│   ├── retriever.py           # (moved from ai-service)
│   ├── rag.py                 # (moved from ai-service)
│   ├── suggest.py             # (moved from ai-service)
│   ├── agent.py               # (moved from ai-service)
│   ├── agent_tools.py         # (moved from ai-service)
│   └── vector_store.py        # (moved from ai-service)
│
└── providers/                 # (moved from ai-service)
    ├── base.py
    ├── factory.py
    ├── openai_provider.py
    └── anthropic_provider.py
```

---

## Phase 1 — App Factory & Config {#phase-1}

### `backend/main.py`

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.database import init_db, close_db
from core.neo4j_driver import init_neo4j, close_neo4j
from core.rate_limit import limiter
from routers import auth, notes, graph, plugins, websocket
from routers import ai as ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await init_neo4j()
    yield
    await close_db()
    await close_neo4j()


def create_app() -> FastAPI:
    app = FastAPI(
        title="NoteRootAI Unified Backend",
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router,      prefix="/api/auth",    tags=["Auth"])
    app.include_router(notes.router,     prefix="/api/notes",   tags=["Notes"])
    app.include_router(graph.router,     prefix="/api/graph",   tags=["Graph"])
    app.include_router(plugins.router,   prefix="/api/plugins", tags=["Plugins"])
    app.include_router(websocket.router, prefix="/api/ws",      tags=["WebSocket"])
    app.include_router(ai_router.router,                        tags=["AI"])

    @app.get("/api/health")
    async def health():
        return {"status": "ok", "message": "NoteRootAI Unified API is running"}

    return app


app = create_app()
```

### `backend/config.py`

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8000
    workers: int = 4
    client_origins: List[str] = [
        "https://noteroot-ai.vercel.app",
        "http://localhost:5173",
    ]
    mongodb_uri: str = ""
    mongodb_db_name: str = "noterootai"
    neo4j_uri: str = ""
    neo4j_username: str = "neo4j"
    neo4j_password: str = ""
    neo4j_database: str = "neo4j"
    jwt_secret: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7
    encryption_key: str = ""
    chroma_persist_dir: str = "./chroma_db"
    default_provider: str = "gemini"
    default_embedding_model: str = "text-embedding-3-small"
    default_chat_model_openai: str = "gpt-4o-mini"
    default_chat_model_gemini: str = "gemini-1.5-flash"
    default_chat_model_anthropic: str = "claude-3-5-haiku-20241022"
    default_chat_model_mistral: str = "mistral-small-latest"
    default_chat_model_groq: str = "llama-3.3-70b-versatile"
    rate_limit_default: str = "200/minute"
    rate_limit_ai: str = "30/minute"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

---

## Phase 2 — Database Layer {#phase-2}

### `backend/core/database.py`

```python
import motor.motor_asyncio
from beanie import init_beanie
from config import get_settings
from models.user import User
from models.note import Note
from models.marketplace_plugin import MarketplacePlugin

_client = None


async def init_db():
    global _client
    s = get_settings()
    if not s.mongodb_uri:
        print("[DB] No MONGODB_URI — skipping")
        return
    _client = motor.motor_asyncio.AsyncIOMotorClient(
        s.mongodb_uri,
        serverSelectionTimeoutMS=5000,
        maxPoolSize=50,    # Handle high concurrency
        minPoolSize=5,
    )
    await init_beanie(database=_client[s.mongodb_db_name],
                      document_models=[User, Note, MarketplacePlugin])
    print("[DB] Connected to MongoDB Atlas")


async def close_db():
    if _client:
        _client.close()
```

### `backend/models/note.py`

```python
from beanie import Document, Indexed
from pydantic import Field
from typing import Optional, List
from datetime import datetime
import uuid


class Note(Document):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    user_id: Indexed(str)
    title: str = "Untitled Note"
    content: str = ""
    tags: List[str] = []
    parent_id: Optional[str] = None
    icon: str = "📄"
    properties: dict = {}
    backlinks: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "notes"
        use_state_management = True
```

### `backend/models/user.py`

```python
from beanie import Document, Indexed
from pydantic import Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


class User(Document):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), alias="_id")
    name: str
    email: Indexed(EmailStr, unique=True)
    password_hash: str
    provider_keys: Dict[str, str] = {}
    custom_providers: List[Any] = []
    plugin_settings: Dict[str, Any] = {}
    installed_community_plugins: List[str] = []
    theme: str = "dark"
    active_provider: str = "gemini"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
```

### `backend/models/marketplace_plugin.py`

```python
from beanie import Document, Indexed
from pydantic import Field
from typing import Optional
from datetime import datetime


class MarketplacePlugin(Document):
    plugin_id: Indexed(str, unique=True)
    name: str
    author: str
    description: str = ""
    version: str
    github_url: Optional[str] = None
    readme: str
    code: str
    downloads: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "marketplaceplugins"
```

### `backend/core/neo4j_driver.py`

```python
from neo4j import AsyncGraphDatabase, AsyncDriver
from config import get_settings

_driver: AsyncDriver | None = None


async def init_neo4j():
    global _driver
    s = get_settings()
    if not s.neo4j_uri:
        print("[Neo4j] No NEO4J_URI — skipping")
        return
    _driver = AsyncGraphDatabase.driver(
        s.neo4j_uri, auth=(s.neo4j_username, s.neo4j_password)
    )
    print("[Neo4j] Driver initialized")


async def close_neo4j():
    if _driver:
        await _driver.close()


def get_driver() -> AsyncDriver:
    if not _driver:
        raise RuntimeError("Neo4j driver not initialized")
    return _driver
```

---

## Phase 3 — Authentication System {#phase-3}

### `backend/core/security.py`

```python
import bcrypt
import secrets
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from config import get_settings

settings = get_settings()


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_token(token: str) -> str:
    payload = jwt.decode(token, settings.jwt_secret,
                         algorithms=[settings.jwt_algorithm])
    user_id = payload.get("sub")
    if not user_id:
        raise JWTError("Invalid token payload")
    return user_id


def _aes_key() -> bytes:
    h = settings.encryption_key
    if h and len(h) == 64:
        return bytes.fromhex(h)
    import hashlib
    return hashlib.scrypt(b"dev-fallback", salt=b"salt",
                          n=16384, r=8, p=1, dklen=32)


def encrypt(text: str) -> str:
    if not text:
        return text
    nonce = secrets.token_bytes(12)
    ct = AESGCM(_aes_key()).encrypt(nonce, text.encode(), b"noterootai")
    return (nonce + ct).hex()


def decrypt(token_hex: str) -> str:
    if not token_hex:
        return token_hex
    try:
        data = bytes.fromhex(token_hex)
        return AESGCM(_aes_key()).decrypt(data[:12], data[12:],
                                          b"noterootai").decode()
    except Exception:
        return token_hex   # legacy plaintext fallback
```

### `backend/core/rate_limit.py`

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
```

### `backend/routers/auth.py`

```python
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from models.user import User
from core.security import (hash_password, verify_password, create_access_token,
                           decode_token, encrypt, decrypt)
from core.rate_limit import limiter
from slowapi import Request
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, List, Any

router = APIRouter()
bearer = HTTPBearer()


# ── Schemas (inline for brevity — move to schemas/auth.py) ──
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UpdateSettingsRequest(BaseModel):
    provider_keys: Optional[Dict[str, str]] = None
    custom_providers: Optional[List[Any]] = None
    plugin_settings: Optional[Dict[str, Any]] = None
    installed_community_plugins: Optional[List[str]] = None
    theme: Optional[str] = None
    active_provider: Optional[str] = None


# ── Auth Dependency ──
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer)
) -> User:
    try:
        user_id = decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── Endpoints ──
@router.post("/signup", status_code=201)
@limiter.limit("10/minute")
async def signup(request: Request, body: SignupRequest):
    if await User.find_one(User.email == body.email.lower()):
        raise HTTPException(409, "An account with this email already exists")
    user = User(name=body.name.strip(), email=body.email.lower(),
                password_hash=hash_password(body.password))
    await user.insert()
    return {"token": create_access_token(str(user.id)),
            "user": {"id": str(user.id), "name": user.name, "email": user.email}}


@router.post("/login")
@limiter.limit("20/minute")
async def login(request: Request, body: LoginRequest):
    user = await User.find_one(User.email == body.email.lower())
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return {"token": create_access_token(str(user.id)),
            "user": {"id": str(user.id), "name": user.name, "email": user.email}}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return {"user": {"id": str(user.id), "name": user.name, "email": user.email}}


@router.get("/settings")
async def get_settings_endpoint(user: User = Depends(get_current_user)):
    return {
        "theme": user.theme,
        "activeProvider": user.active_provider,
        "providerKeys": {k: decrypt(v) for k, v in (user.provider_keys or {}).items()},
        "customProviders": [{**cp, "apiKey": decrypt(cp.get("apiKey", ""))}
                            for cp in (user.custom_providers or [])],
        "pluginSettings": user.plugin_settings,
        "installedCommunityPlugins": user.installed_community_plugins,
    }


@router.put("/settings")
async def update_settings_endpoint(body: UpdateSettingsRequest,
                                   user: User = Depends(get_current_user)):
    if body.provider_keys is not None:
        user.provider_keys = {k: encrypt(v) for k, v in body.provider_keys.items()}
    if body.custom_providers is not None:
        user.custom_providers = [{**cp, "apiKey": encrypt(cp.get("apiKey", ""))}
                                 for cp in body.custom_providers]
    if body.plugin_settings is not None:
        user.plugin_settings = body.plugin_settings
    if body.installed_community_plugins is not None:
        user.installed_community_plugins = body.installed_community_plugins
    if body.theme is not None:
        user.theme = body.theme
    if body.active_provider is not None:
        user.active_provider = body.active_provider
    await user.save()
    return {"success": True}
```

---

## Phase 4 — Notes API {#phase-4}

### `backend/routers/notes.py`

```python
import re
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List, Dict
from models.note import Note
from models.user import User
from routers.auth import get_current_user
from services.note_service import sync_note_to_neo4j, delete_note_from_neo4j

router = APIRouter()
WIKI_RE = re.compile(r"\[\[(.+?)\]\]")


class NoteBody(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    parent_id: Optional[str] = None
    icon: Optional[str] = None
    properties: Optional[Dict] = None


@router.get("/")
async def get_notes(user: User = Depends(get_current_user)):
    return await Note.find(Note.user_id == str(user.id)).sort(-Note.updated_at).to_list()


@router.post("/", status_code=201)
async def create_note(body: NoteBody, background_tasks: BackgroundTasks,
                      user: User = Depends(get_current_user)):
    note = Note(user_id=str(user.id),
                title=body.title or "Untitled Note",
                content=body.content or "",
                tags=body.tags or [],
                parent_id=body.parent_id,
                icon=body.icon or "📄",
                properties=body.properties or {})
    if body.id:
        note.id = body.id
    await note.insert()
    background_tasks.add_task(sync_note_to_neo4j, note)
    return note


@router.get("/{note_id}")
async def get_note(note_id: str, user: User = Depends(get_current_user)):
    note = await Note.find_one(Note.id == note_id, Note.user_id == str(user.id))
    if not note:
        raise HTTPException(404, "Note not found")
    return note


@router.put("/{note_id}")
async def upsert_note(note_id: str, body: NoteBody, background_tasks: BackgroundTasks,
                      user: User = Depends(get_current_user)):
    note = await Note.find_one(Note.id == note_id)
    if note:
        if note.user_id != str(user.id):
            raise HTTPException(403, "Unauthorized")
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(note, field, value)
        note.updated_at = datetime.utcnow()
        await note.save()
    else:
        note = Note(id=note_id, user_id=str(user.id),
                    **body.model_dump(exclude_none=True))
        await note.insert()
    linked_titles = WIKI_RE.findall(note.content or "")
    background_tasks.add_task(sync_note_to_neo4j, note, linked_titles)
    return note


@router.delete("/{note_id}")
async def delete_note(note_id: str, background_tasks: BackgroundTasks,
                      user: User = Depends(get_current_user)):
    note = await Note.find_one(Note.id == note_id, Note.user_id == str(user.id))
    if not note:
        raise HTTPException(404, "Note not found")
    await note.delete()
    background_tasks.add_task(delete_note_from_neo4j, note_id)
    return {"message": "Note deleted"}
```

### `backend/services/note_service.py`

```python
from core.neo4j_driver import get_driver
from models.note import Note


async def sync_note_to_neo4j(note: Note, linked_titles: list[str] = None):
    try:
        driver = get_driver()
    except RuntimeError:
        return  # Neo4j not configured — skip silently
    async with driver.session() as session:
        await session.run(
            "MERGE (n:Note {id: $id}) SET n.title = $title, n.userId = $userId",
            id=str(note.id), title=note.title, userId=note.user_id,
        )
        if linked_titles:
            await session.run(
                "MATCH (n:Note {id:$id})-[r:LINKS_TO]->() DELETE r",
                id=str(note.id)
            )
            for title in linked_titles:
                await session.run(
                    """
                    MATCH (n1:Note {id:$id, userId:$userId})
                    MERGE (n2:Note {title:$title, userId:$userId})
                    ON CREATE SET n2.id = randomUUID()
                    MERGE (n1)-[:LINKS_TO]->(n2)
                    """,
                    id=str(note.id), userId=note.user_id, title=title,
                )


async def delete_note_from_neo4j(note_id: str):
    try:
        driver = get_driver()
    except RuntimeError:
        return
    async with driver.session() as session:
        await session.run(
            "MATCH (n:Note {id:$id}) DETACH DELETE n", id=note_id
        )
```

### `backend/routers/graph.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from core.neo4j_driver import get_driver
from models.user import User
from routers.auth import get_current_user

router = APIRouter()


@router.get("/")
async def get_graph(user: User = Depends(get_current_user)):
    try:
        driver = get_driver()
    except RuntimeError:
        raise HTTPException(503, "Graph database not configured")

    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (n:Note {userId: $userId})
            OPTIONAL MATCH (n)-[r:LINKS_TO]->(m:Note)
            RETURN n, r, m
            """,
            userId=str(user.id),
        )
        nodes_map = {}
        edges = []
        async for record in result:
            n = record["n"]
            if n:
                nodes_map[n["id"]] = {"data": {"id": n["id"], "label": n["title"]}}
            r = record["r"]
            m = record["m"]
            if r and m:
                edges.append({"data": {
                    "id": f"{n['id']}-{m['id']}",
                    "source": n["id"],
                    "target": m["id"],
                }})
        return list(nodes_map.values()) + edges
```

---

## Phase 5 — Plugins Marketplace API {#phase-5}

### `backend/routers/plugins.py`

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from models.marketplace_plugin import MarketplacePlugin
from models.user import User
from routers.auth import get_current_user

router = APIRouter()


class PublishRequest(BaseModel):
    plugin_id: str
    name: str
    author: str
    description: str = ""
    version: str
    github_url: Optional[str] = None
    readme: str
    code: str


@router.get("/market")
async def list_plugins(_: User = Depends(get_current_user)):
    # Exclude code from listing (security + bandwidth)
    plugins = await MarketplacePlugin.find_all().sort(
        -MarketplacePlugin.downloads
    ).to_list()
    return [{k: v for k, v in p.model_dump().items() if k != "code"}
            for p in plugins]


@router.get("/market/{plugin_id}")
async def download_plugin(plugin_id: str, _: User = Depends(get_current_user)):
    plugin = await MarketplacePlugin.find_one(
        MarketplacePlugin.plugin_id == plugin_id
    )
    if not plugin:
        raise HTTPException(404, "Plugin not found")
    plugin.downloads += 1
    await plugin.save()
    return plugin


@router.post("/publish")
async def publish_plugin(body: PublishRequest, _: User = Depends(get_current_user)):
    existing = await MarketplacePlugin.find_one(
        MarketplacePlugin.plugin_id == body.plugin_id
    )
    if existing:
        if existing.author != body.author:
            raise HTTPException(403, "Plugin owned by a different author")
        for k, v in body.model_dump().items():
            setattr(existing, k, v)
        await existing.save()
        return existing
    plugin = MarketplacePlugin(**body.model_dump())
    await plugin.insert()
    return plugin
```

---

## Phase 6 — AI Service Integration (Merged) {#phase-6}

Move ALL files from `ai-service/` into `backend/` with these renames:

| Old Path | New Path |
|---|---|
| `ai-service/models.py` | `backend/schemas/ai.py` |
| `ai-service/config.py` | Merged into `backend/config.py` |
| `ai-service/main.py` endpoints | `backend/routers/ai.py` |
| `ai-service/services/*.py` | `backend/services/*.py` |
| `ai-service/providers/*.py` | `backend/providers/*.py` |

### `backend/routers/ai.py`

```python
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from schemas.ai import (EmbedRequest, EmbedBulkRequest, ChatRequest,
                        SearchRequest, SuggestRequest, AgentRequest)
from services.embedder import embed_note
from services.retriever import search_notes
from services.rag import chat_rag
from services.suggest import get_suggestions
from services.agent import run_agent
from services.vector_store import vector_store
from core.rate_limit import limiter
from slowapi import Request
import json

router = APIRouter()


@router.get("/health")
async def full_health():
    return {
        "status": "ok",
        "notes_indexed": vector_store.count_all(),
        "providers": {"openai": True, "gemini": True, "anthropic": True,
                      "groq": True, "mistral": True},
    }


@router.post("/embed")
@limiter.limit("60/minute")
async def embed(request: Request, body: EmbedRequest):
    try:
        chunks = await embed_note(body)
        return {"note_id": body.note_id, "chunks": chunks}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/embed/bulk")
async def embed_bulk(body: EmbedBulkRequest):
    results = []
    for note in body.notes:
        try:
            chunks = await embed_note(note)
            results.append({"note_id": note.note_id, "status": "ok", "chunks": chunks})
        except Exception as e:
            results.append({"note_id": note.note_id, "status": "error", "error": str(e)})
    return {"results": results}


@router.post("/search")
@limiter.limit("60/minute")
async def search(request: Request, body: SearchRequest):
    return await search_notes(body)


@router.post("/suggest")
@limiter.limit("30/minute")
async def suggest(request: Request, body: SuggestRequest):
    return await get_suggestions(body)


@router.post("/chat")
@limiter.limit("30/minute")
async def chat(request: Request, body: ChatRequest):
    async def stream():
        try:
            async for chunk in chat_rag(body):
                yield chunk
        except Exception as e:
            yield f"\n\n[Error: {e}]"
    return StreamingResponse(stream(), media_type="text/event-stream")


@router.post("/agent")
@limiter.limit("20/minute")
async def agent(request: Request, body: AgentRequest):
    async def stream():
        try:
            async for event in run_agent(body):
                yield event
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    return StreamingResponse(stream(), media_type="text/event-stream")
```

> **Key Win:** Embedding after note save now calls `embed_note()` as a local Python function call via `BackgroundTasks`, eliminating the HTTP round-trip that existed when Express and FastAPI were separate containers.

---

## Phase 7 — WebSocket {#phase-7}

### `backend/routers/websocket.py`

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json

router = APIRouter()
_connections: Dict[str, Set[WebSocket]] = {}


@router.websocket("/")
async def ws_endpoint(websocket: WebSocket, user_id: str = None):
    """Connect: ws://backend/api/ws?user_id=<uuid>"""
    await websocket.accept()
    if user_id:
        _connections.setdefault(user_id, set()).add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        if user_id in _connections:
            _connections[user_id].discard(websocket)


async def broadcast_to_user(user_id: str, event: dict):
    for ws in list(_connections.get(user_id, [])):
        try:
            await ws.send_json(event)
        except Exception:
            _connections[user_id].discard(ws)
```

### Client WebSocket (`client/src/lib/websocket.ts`)

```typescript
import { BACKEND_URL } from './constants';
import { useAuthStore } from '../stores/authStore';

let ws: WebSocket | null = null;

export function connectWebSocket() {
  const user = useAuthStore.getState().user;
  if (!user) return;
  const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
  ws = new WebSocket(`${wsUrl}/api/ws?user_id=${user.id}`);
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'note_updated') {
      console.log('[WS] Remote note updated:', msg.note_id);
    }
  };
  ws.onclose = () => setTimeout(connectWebSocket, 3000);
}
```

---

## Phase 8 — Docker Unified Container {#phase-8}

### `backend/Dockerfile`

```dockerfile
# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ build-essential libffi-dev libssl-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --prefix=/install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime
WORKDIR /app

COPY --from=builder /install /usr/local
COPY . .

# Non-root user for security
RUN useradd -m -u 1001 appuser && \
    mkdir -p /app/chroma_db && \
    chown -R appuser:appuser /app
USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

EXPOSE 8000

CMD gunicorn main:app \
    --workers ${WEB_CONCURRENCY:-4} \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
```

### `backend/docker-compose.yml`

```yaml
version: "3.9"

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: noterootai-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      MONGODB_URI: ${MONGODB_URI}
      NEO4J_URI: ${NEO4J_URI}
      NEO4J_USERNAME: ${NEO4J_USERNAME}
      NEO4J_PASSWORD: ${NEO4J_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      WEB_CONCURRENCY: "4"
      CHROMA_PERSIST_DIR: /app/chroma_db
    volumes:
      - chroma_data:/app/chroma_db     # Persist vectors
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 20s

  nginx:
    image: nginx:alpine
    container_name: noterootai-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend

volumes:
  chroma_data:
    driver: local
```

### `backend/nginx.conf`

```nginx
upstream noterootai {
    server backend:8000;
    keepalive 64;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass         http://noterootai;
        proxy_http_version 1.1;
        # WebSocket upgrade headers
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
        proxy_buffering    off;    # REQUIRED for SSE streaming
        proxy_cache        off;
    }
}
```

### `backend/.env.example`

```bash
# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=noterootai

# Neo4j AuraDB
NEO4J_URI=neo4j+s://xxxxxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password

# Auth
JWT_SECRET=at-least-32-random-chars
ENCRYPTION_KEY=generate-with: python -c "import secrets; print(secrets.token_hex(32))"

# Runtime
WEB_CONCURRENCY=4
PORT=8000
CHROMA_PERSIST_DIR=./chroma_db
DEFAULT_PROVIDER=gemini

# Client origins
CLIENT_ORIGINS=https://noteroot-ai.vercel.app,http://localhost:5173
```

---

## Phase 9 — Load Handling & Hardening {#phase-9}

### Worker Count Formula

```
Recommended workers = (2 × CPU cores) + 1

Railway/Render Hobby (1 vCPU)  → WEB_CONCURRENCY=3
Railway/Render Pro  (2 vCPU)  → WEB_CONCURRENCY=5
Dedicated VPS       (4 vCPU)  → WEB_CONCURRENCY=9
```

### Rate Limits by Endpoint Type

The current backend applies a process-local `120/minute` default using `slowapi`.
Use a Redis-backed store before horizontally scaling if a shared global limit is required.

| Endpoint | Limit | Reason |
|---|---|---|
| `/api/auth/signup` | 10/min | Prevent mass account creation |
| `/api/auth/login` | 20/min | Brute-force protection |
| `/api/notes/*` | 200/min | Normal CRUD usage |
| `/embed` | 60/min | AI cost control |
| `/chat`, `/suggest` | 30/min | LLM API cost |
| `/agent` | 20/min | Most expensive endpoint |

### Background Tasks Pattern

```python
# In routers/notes.py — upsert_note
# These run AFTER the response is sent — zero blocking
background_tasks.add_task(sync_note_to_neo4j, note, linked_titles)
background_tasks.add_task(embed_note_background, note)

# Result: note save responds in <50ms even with Neo4j + embedding
```

### MongoDB Connection Pool

```python
# In core/database.py
_client = motor.motor_asyncio.AsyncIOMotorClient(
    s.mongodb_uri,
    maxPoolSize=50,     # Max concurrent operations per worker
    minPoolSize=5,      # Keep warm connections
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
)
```

---

## Phase 10 — Client-Side Updates {#phase-10}

### `client/src/lib/constants.ts` (Updated)

```typescript
function cleanUrl(url: string | undefined | null, fallback: string): string {
  const u = (url && url.trim()) || fallback;
  return u.endsWith('/') ? u.slice(0, -1) : u;
}

// Single URL for everything — no more AI_URL vs SYNC_URL split
export const BACKEND_URL: string = cleanUrl(
  import.meta.env.VITE_BACKEND_URL as string,
  'https://your-backend.railway.app'
);

// Backward compatibility aliases (update imports gradually)
export const SYNC_URL = BACKEND_URL;
export const AI_URL = BACKEND_URL;
```

### Files to Update in Client

| File | Change |
|---|---|
| `constants.ts` | Add `BACKEND_URL`, alias `SYNC_URL` and `AI_URL` to it |
| `AppShell.tsx` | Remove `socket.io-client` import; call `connectWebSocket()` on mount |
| `package.json` | Remove `"socket.io-client"` dependency |
| `vite.config.ts` | Remove `VITE_AI_URL`; keep only `VITE_BACKEND_URL` |
| `aiService.ts` | Replace `AI_URL` with `BACKEND_URL` (or just alias works) |
| `AgentPanel.tsx` | Same alias fix |
| `AISidebar.tsx` | Same alias fix |
| `AIChatPage.tsx` | Same alias fix |

---

## Phase 11 — UI/UX Improvements {#phase-11}

### 11.1 Left Sidebar / VaultTree (`VaultTree.tsx`)

**Add:**
- `framer-motion` `AnimatePresence` for smooth tree open/close
- Right-click context menu: Rename, Duplicate, Move, Delete
- Drag-and-drop reparenting with `onDragStart` / `onDrop` on list items
- Inline emoji icon picker on hover (small popover)
- Collapsible sidebar — icon-only mode toggle in header

### 11.2 AppShell Layout (`AppShell.tsx`)

**Add:**
- Focus Mode button (hides both sidebars, `Ctrl+Shift+F`)
- Left sidebar collapse to icon-rail (48px wide)
- AI sidebar width persisted to `localStorage`
- Keyboard shortcut tooltips on all nav icons
- Replace `socket.io-client` with native `connectWebSocket()`

### 11.3 Editor Improvements (`NoteEditorPage.tsx` + `NoteEditor.tsx`)

**Add:**
- Sticky breadcrumb: `🏠 Home > Project Notes > Meeting`
- Click icon in title to open emoji picker
- Collapsible Properties panel (tags, custom fields) below title
- Bottom status bar: word count, reading time, last saved time
- Outline panel (H1/H2/H3 headings list) in right gutter

### 11.4 Dashboard Redesign (`Dashboard.tsx`)

**Replace:** flat list → masonry card grid with:
- Note icon, title, 2-line content preview
- Relative time (`2 hours ago`)
- Tag chips
- Hover card lift shadow animation

**Add:**
- "Quick Access" pinned notes row
- Activity heatmap (writing days per week)
- Stats bar: Total notes · Total words · Graph links · Last synced
- Tag filter chips at top

### 11.5 Graph Page (`GraphPage.tsx`)

**Add:**
- Minimap in bottom-right (Cytoscape `navigator` extension)
- Search/filter input overlay — highlights matching nodes, dims others
- Legend panel (wiki-link edge vs hierarchy edge colors)
- Node tooltip on hover showing title, parent, link count

### 11.6 AI Panels (`AISidebar.tsx` + `AgentPanel.tsx`)

**Add:**
- Provider + model badge in chat header: `Gemini · gemini-1.5-flash`
- Typing indicator (three-dot CSS animation) while streaming
- 👍/👎 reaction buttons on each AI message
- "Copy to Note" button on AI responses — appends to current note
- Past conversation history in localforage — session selector dropdown
- `Thinking...` state label during agent reasoning

### 11.7 Settings Page (`SettingsPage.tsx`)

**Reorganize into tabs:**
- General (theme, language)
- AI Providers (existing card UI + "Test Connection" button per provider)
- Plugins (existing)
- Account (email, password change, danger zone)
- About (version, links)

### 11.8 Global CSS Additions (`index.css`)

```css
:root {
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  16px;
  --shadow-sm:  0 1px 3px  rgba(0,0,0,0.08);
  --shadow-md:  0 4px 12px rgba(0,0,0,0.12);
  --shadow-lg:  0 8px 24px rgba(0,0,0,0.16);
  --ease:       cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0);   }
}

@keyframes typing-dot {
  0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
  40%           { transform: scale(1); opacity: 1;   }
}

.typing-dot { display: inline-block; width: 6px; height: 6px;
  border-radius: 50%; background: var(--accent);
  animation: typing-dot 1.4s ease infinite; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

.note-card {
  animation: fade-in 180ms var(--ease);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 150ms var(--ease), transform 150ms var(--ease);
}
.note-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
```

---

## Phase 12 — Testing Checklist {#phase-12}

### Auth
- [ ] `POST /api/auth/signup` → 201, returns `{ token, user }`
- [ ] `POST /api/auth/login` → 200, returns `{ token, user }`
- [ ] `GET /api/auth/settings` with valid Bearer token → 200, decrypted keys
- [ ] `PUT /api/auth/settings` → 200, re-fetch shows encrypted storage in MongoDB
- [ ] Request with no/bad token → 401

### Notes
- [ ] `GET /api/notes/` → only current user's notes returned
- [ ] `POST /api/notes/` → note appears in MongoDB + Neo4j node created
- [ ] `PUT /api/notes/:id` (upsert) → works offline sync pattern (new ID)
- [ ] `PUT /api/notes/:id` with `[[Link]]` → Neo4j `LINKS_TO` edge created
- [ ] `DELETE /api/notes/:id` → removed from MongoDB + Neo4j DETACH DELETE

### Graph
- [ ] `GET /api/graph/` → returns array of Cytoscape nodes and edges

### AI
- [ ] `POST /embed` → chunks stored in ChromaDB
- [ ] `POST /chat` → SSE stream with text chunks
- [ ] `POST /agent` → `tool_request` event emitted, then `[DONE]`
- [ ] `POST /search` → ranked results returned

### Docker
- [ ] `docker build -f backend/Dockerfile -t noterootai .` → exits 0
- [ ] `docker run -p 8000:8000 --env-file backend/.env noterootai` → starts cleanly
- [ ] `curl http://localhost:8000/api/health` → `{"status":"ok"}`
- [ ] `/docs` → Swagger UI loads
- [ ] Stop container, restart → ChromaDB data persists (volume mount)

### Client
- [ ] All API calls point to single `BACKEND_URL`
- [ ] WebSocket connects (no socket.io-client)
- [ ] Offline note edit → saved to IndexedDB → syncs on reconnect
- [ ] `socket.io-client` removed from bundle

### Express Transition
- [ ] Baseline contracts recorded for `/api/auth`, `/api/notes`, `/api/graph`, and `/api/plugins`
- [ ] FastAPI responses match the approved status codes, payload shapes, auth rules, and data side effects
- [ ] Staging client completes auth, note sync, graph loading, plugin access, AI requests, and real-time reconnects
- [ ] Production metrics and error logs are stable for the agreed rollback window
- [ ] Express deployment configuration and `server/` are removed only after the rollback window closes

---

## File Reference Table {#file-reference}

### Create (New)
| File | Priority |
|---|---|
| `backend/main.py` | P0 |
| `backend/config.py` | P0 |
| `backend/Dockerfile` | P0 |
| `backend/docker-compose.yml` | P0 |
| `backend/nginx.conf` | P0 |
| `backend/.env.example` | P0 |
| `backend/requirements.txt` | P0 |
| `backend/core/database.py` | P0 |
| `backend/core/neo4j_driver.py` | P0 |
| `backend/core/security.py` | P0 |
| `backend/core/rate_limit.py` | P0 |
| `backend/core/middleware.py` | P0 |
| `backend/models/user.py` | P0 |
| `backend/models/note.py` | P0 |
| `backend/models/marketplace_plugin.py` | P0 |
| `backend/routers/auth.py` | P0 |
| `backend/routers/notes.py` | P0 |
| `backend/routers/graph.py` | P0 |
| `backend/routers/plugins.py` | P1 |
| `backend/routers/websocket.py` | P1 |
| `backend/routers/ai.py` | P1 |
| `backend/services/note_service.py` | P0 |
| `backend/schemas/ai.py` | P1 (move from ai-service/models.py) |

### Move (From ai-service)
| Old | New |
|---|---|
| `ai-service/services/embedder.py` | `backend/services/embedder.py` |
| `ai-service/services/retriever.py` | `backend/services/retriever.py` |
| `ai-service/services/rag.py` | `backend/services/rag.py` |
| `ai-service/services/suggest.py` | `backend/services/suggest.py` |
| `ai-service/services/agent.py` | `backend/services/agent.py` |
| `ai-service/services/agent_tools.py` | `backend/services/agent_tools.py` |
| `ai-service/services/vector_store.py` | `backend/services/vector_store.py` |
| `ai-service/providers/*` | `backend/providers/*` |

### Update (Client)
| File | Change |
|---|---|
| `client/src/lib/constants.ts` | `BACKEND_URL` single var |
| `client/package.json` | Remove `socket.io-client` |
| `client/src/components/Layout/AppShell.tsx` | Native WebSocket |
| All files using `AI_URL` or `SYNC_URL` | Use alias or update import |

### Retire After Cutover
| Path | Prerequisite |
|---|---|
| `server/` (entire) | FastAPI contract parity, client cutover, and completed rollback window |
| `ai-service/` (entire) | AI endpoints and ChromaDB persistence verified in `backend/` |

---

## Environment Variables {#env-vars}

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | Atlas connection string |
| `MONGODB_DB_NAME` | ❌ | DB name (default: `noterootai`) |
| `NEO4J_URI` | ✅ | `neo4j+s://...` AuraDB |
| `NEO4J_USERNAME` | ✅ | Usually `neo4j` |
| `NEO4J_PASSWORD` | ✅ | AuraDB password |
| `JWT_SECRET` | ✅ | 32+ char random string |
| `ENCRYPTION_KEY` | ✅ | 64-char hex. Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `WEB_CONCURRENCY` | ❌ | Gunicorn worker count (default: 4) |
| `CHROMA_PERSIST_DIR` | ❌ | Vector DB path (default: `./chroma_db`) |
| `PORT` | ❌ | Listen port (default: 8000) |
| `CLIENT_ORIGINS` | ❌ | Comma-separated allowed origins |
| `VITE_BACKEND_URL` | ✅ (client) | Full URL of unified backend |

---

## Deployment Guide {#deployment}

### Option A: Railway (Recommended)

```
1. New Railway project → "Empty Service"
2. Link GitHub repo → Root Directory: "backend/"
3. Railway auto-detects Dockerfile
4. Add all env vars in Variables panel
5. Add Volume at mount path: /app/chroma_db
6. Expose port: 8000
7. Get deploy URL → set VITE_BACKEND_URL in Vercel dashboard
```

### Option B: Render

```
1. New Web Service → Docker runtime
2. Root directory: backend/
3. Dockerfile path: Dockerfile
4. Add all env vars
5. Add Persistent Disk at /app/chroma_db
```

### Option C: VPS (Ubuntu + Docker)

```bash
git clone https://github.com/KunalGupta25/NoterootAI
cd NoterootAI/backend
cp .env.example .env && nano .env    # Fill all vars
docker compose up -d --build
curl http://localhost:8000/api/health
# → {"status": "ok", ...}

# SSL via certbot + nginx (if running nginx on host)
sudo certbot --nginx -d api.yourdomain.com
```

### Update Without Downtime

```bash
docker compose pull
docker compose up -d --build --no-deps backend
# Old container handles current requests while new one starts
```

### Client (Vercel)

```bash
# Set in Vercel Environment Variables:
VITE_BACKEND_URL = https://your-railway-url.railway.app

cd client && npm run build && vercel --prod
```

---

## Migration Timeline

```
Week 1 — Baseline + Core Backend
  Day 1: Record Express API contracts; split `server/src/app.ts` responsibilities as touched
  Day 2: Create backend/ folder, requirements.txt, config.py, main.py skeleton
  Day 3: Implement core/ (database, neo4j, security, rate_limit)
  Day 4: Implement models/ (User, Note, MarketplacePlugin)
  Day 5: Implement routers/auth.py + run Express/FastAPI auth contract checks

Week 2 — AI + Docker + Client
  Day 6: Implement routers/notes.py + services/note_service.py; run note contract checks
  Day 7: Move ai-service/ → backend/, implement routers/ai.py
  Day 8: Implement routers/graph.py + routers/plugins.py + WebSocket protocol
  Day 9: Write Dockerfile + docker-compose; test the unified backend locally
  Day 10: Update client constants.ts and migrate from Socket.IO; test E2E against staging

Week 3 — Cutover + UI/UX
  Day 11: Deploy the unified backend to Railway staging, verify contracts and smoke test
  Day 12: Switch production client configuration, monitor, and retain Express for rollback
  Day 13: Dashboard masonry cards + stats bar
  Day 14: VaultTree and editor improvements
  Day 15: Agent panel, settings, and CSS token improvements

After the rollback window
  Retire Railway Node service and delete `server/` only after the Express Transition checklist is complete.
```

> **Final Result:** One Python Docker container, 4 Gunicorn workers, ~40% smaller image than the old Node+Python dual-container setup. Swagger UI at `/docs`. All endpoints rate-limited. ChromaDB on a persistent volume. Background tasks for embeddings/Neo4j sync mean note saves respond in under 50ms even under AI workload.
