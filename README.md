# 🌿 NoteRoot AI

[![Live Demo](https://img.shields.io/badge/Live_Demo-noteroot--ai.vercel.app-e05438?style=for-the-badge&logo=vercel&logoColor=white)](https://noteroot-ai.vercel.app)
[![API Status](https://img.shields.io/badge/API_Live-noteroot--api.mexus.tech-27c93f?style=for-the-badge&logo=fastapi&logoColor=white)](https://noteroot-api.mexus.tech/health)
[![Author](https://img.shields.io/badge/Author-Kunal_Gupta-0A66C2?style=for-the-badge&logo=github&logoColor=white)](https://github.com/kunalgupta25)
[![Tech Stack](https://img.shields.io/badge/Stack-React_19_•_FastAPI_•_Neo4j_•_MongoDB-555555?style=for-the-badge)](https://github.com/KunalGupta25/NoterootAI)

> **Elevator Pitch:** NoteRoot AI is a privacy-first, local-capable Knowledge Management System and Second Brain engine that fuses block-based markdown editing with real-time bi-directional knowledge graphs and multi-model AI copilots. Built for researchers, engineers, and knowledge architects, it guarantees sub-10ms instantaneous writes via browser IndexedDB while maintaining cloud synchronization and autonomous Graph RAG synthesis.

---

## ⚡ Quick Links & Test Credentials

| Resource | Link / Access |
| :--- | :--- |
| **Production Web App** | [https://noteroot-ai.vercel.app](https://noteroot-ai.vercel.app) |
| **Backend API (Render)** | [https://noteroot-api.mexus.tech](https://noteroot-api.mexus.tech) |
| **GitHub Repository** | [https://github.com/kunalgupta25/NoterootAI](https://github.com/kunalgupta25/NoterootAI) |
| **Recruiter / Demo Email** | `demo@noteroot.ai` |
| **Recruiter / Demo Password** | `Demo1234!` |

*(Instant 1-click registration with isolated sandboxed vaults is also enabled.)*

---

## 🎯 Key Architectural Features

- **🛡️ Local-First & Multi-Account Isolation:** Zero-latency instantaneous reads and writes via browser IndexedDB (`localforage`). Fully operational offline with deterministic user-scoped key namespaces (`note_${userId}_${noteId}`) and complete memory/cache purging on session logout to prevent cross-account data bleeding.
- **🕸️ Bi-Directional Knowledge Graph (Cytoscape.js + Neo4j):** Interlink notes using `[[Wikilink]]` syntax. The client dynamically renders force-directed cluster graphs (COSE, concentric, and hierarchical layouts) with real-time backlink topology, while the backend maintains relational subgraphs in Neo4j AuraDB.
- **🧠 Retrieval-Augmented Copilot & Agent:** Notes are chunked and embedded into Neo4j vector indexes linked to `:Note` nodes. The copilot injects score-filtered top-k excerpts as grounded vault context (plus optional Tavily/Brave/SearXNG web search) before synthesis, with clickable citations back into the vault.
- **⚡ Bring-Your-Own-Key (BYOK) Multi-Provider AI:** One OpenAI-compatible gateway for OpenAI, Gemini, Mistral, Groq, and OpenRouter (Claude, DeepSeek, Llama, …), plus custom base-URL endpoints. Keys are AES-GCM-encrypted per user — zero middleman pricing markups.
- **📝 Heavy-Duty Mathematical & Rich Canvas:** Tiptap block editor engine with KaTeX LaTeX formula rendering, Mermaid architecture diagrams, syntax-highlighted code blocks, tables, and task lists.
- **🧩 Secure Plugin Runtime & Marketplace:** Event-driven extensibility framework supporting built-in and community plugins (Markdown Importers, ZIP vault unpackers, Tab Managers, and Theme Engines) inside an isolated execution runtime.

---

## 🛠️ Tech Stack Breakdown

```
Frontend                         Backend & AI Engine              Databases & Infrastructure
├── React 19 (TypeScript)       ├── FastAPI (Python 3.12)        ├── MongoDB Atlas (Primary Store)
├── Vite 8 Build Tool            ├── Pydantic v2 & Motor          ├── Neo4j AuraDB (Graph + Vectors)
├── Tailwind CSS                 ├── Neo4j Async Python Driver    ├── Render (Docker Backend)
├── Tiptap Editor v3             ├── SlowAPI (Rate Limiting)      ├── Vercel (Edge CDN Frontend)
├── Cytoscape.js (Graph View)    ├── JWT Authentication (HS256)   ├── IndexedDB (localforage)
└── Zustand v5 (State Sync)      └── OpenAI-compatible (BYOK)     └── GitHub Actions CI/CD
```

---

## 🔬 Engineering Challenges & Solutions

### 1. Multi-Account Local Storage Isolation & Cache Bleeding
* **The Roadblock:** In local-first offline PWA architectures using browser IndexedDB and in-memory Zustand stores, logging out and switching accounts could cause notes, cached AI chat logs, or starred bookmarks from User A to bleed into User B's session before server reconciliation completed.
* **The Architectural Solution:** Engineered an atomic session purging pipeline ([`sessionManager.ts`](client/src/lib/sessionManager.ts)) coupled with deterministic user prefix namespaces (`note_${userId}_${noteId}`). On logout or before new account authentication, in-memory Zustand states are wiped, chat memory is dropped, and IndexedDB readers strictly execute prefix-bound queries.
* **Measurable Impact:** Full in-memory and persistent-state isolation across accounts sharing the same browser profile, with zero cold-start delay.

### 2. Low-Latency Bi-Directional Graph Clustering at Scale
* **The Roadblock:** Parsing nested markdown documents for double-bracket `[[wikilinks]]` and recomputing topological graph clusters during active editing generates UI thread frame drops in heavy note-taking sessions.
* **The Architectural Solution:** Graph elements (hierarchy, wikilink, and shared-tag edges) are rebuilt in a memoized pass that runs only when the note collection changes, with edge-deduplication keeping the element set stable across re-renders. Cloud replication and embedding never touch the editing critical path: note saves debounce into `PUT /api/notes`, Neo4j link rebuilds happen server-side on sync, and chunk embeddings are pushed to `/embed` in the background after each save.
* **Measurable Impact:** Editing stays responsive regardless of graph size — graph, sync, and embedding work is deferred off the keystroke path, and Cytoscape.js renders the merged topology on demand.

---

## 🚀 Quick Local Setup

### Prerequisites
- Node.js 20+ & npm
- Python 3.12+ (with virtualenv)
- MongoDB instance (Local or Atlas URI)
- Neo4j AuraDB instance (or Dockerized Neo4j)

### 1. Clone & Install
```bash
git clone https://github.com/kunalgupta25/NoterootAI.git
cd NoterootAI

npm run install:all      # root + client dependencies
npm run setup:backend    # creates backend/.venv and installs Python deps
```

Manual alternative: `npm --prefix client install`, and inside `backend/` create a virtualenv (`python -m venv .venv`), activate it, then `pip install -r requirements.txt`.

### 2. Environment Configuration
Create `backend/.env`:
```env
ENVIRONMENT=development
PORT=8000
CLIENT_ORIGINS=http://localhost:5173,https://noteroot-ai.vercel.app
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/noteroot?retryWrites=true&w=majority
NEO4J_URI=neo4j+s://<your-neo4j-id>.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-neo4j-password
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ENCRYPTION_KEY=<64-hex-chars>          # required in production; encrypts BYOK keys
```

See [`backend/.env.example`](backend/.env.example) for the full list — optional server-side provider keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`, …), default models, and web search (`WEB_SEARCH_PROVIDER`, `TAVILY_API_KEY`, …). Generate `ENCRYPTION_KEY` with `python -c "import secrets; print(secrets.token_hex(32))"`.

Create `client/.env`:
```env
VITE_BACKEND_URL=http://localhost:8000
```

### 3. Run Development Servers
```bash
npm run dev              # client (:5173) + backend (:8000) together
```

Or in two terminals:
```bash
# Terminal 1: Backend API (FastAPI) — with backend/.venv activated
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend App (Vite React)
npm --prefix client run dev
```

Visit `http://localhost:5173/` in your browser.

---

## ☁️ Deployment

| Tier | Platform | Configuration |
| :--- | :--- | :--- |
| Frontend | Vercel (`client/`) | Set `VITE_BACKEND_URL` to the backend origin |
| Backend | Render (Docker) | [`render.yaml`](render.yaml) — single gunicorn worker, health check `/api/health` |

Local/alternative stacks ship as [`docker-compose.yml`](docker-compose.yml) and [`railway.toml`](railway.toml).

---

## 🧩 Plugin Development

- **Boilerplate:** [`plugin-template/`](plugin-template/) — copy, rename, register in `pluginManifest.ts`
- **Working example:** [`sample-plugin/`](sample-plugin/)
- **Agent skill:** [`skills/noteroot-plugin/`](skills/noteroot-plugin/) — install with `npx skills add KunalGupta25/NoterootAI --skill noteroot-plugin`

---

## 📄 License & Attribution
Distributed under the MIT License. Built with passion by [Kunal Gupta](https://github.com/kunalgupta25).
For in-depth system architecture, data mapping, and sequence flows, refer to [**`flow.md`**](flow.md).
