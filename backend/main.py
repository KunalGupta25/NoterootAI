import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config import get_settings
from core.database import mongo
from core.middleware import install_middleware
from core.neo4j_driver import neo4j
from core.rate_limit import limiter
from routers.auth import router as auth_router
from routers.ai import router as ai_router
from routers.graph import router as graph_router
from routers.notes import router as notes_router
from routers.plugins import router as plugins_router

settings = get_settings()


async def _connect_mongo():
    try:
        await mongo.connect(settings)
        await mongo.ensure_indexes()
    except Exception:
        logging.exception("MongoDB connection failed; the service will remain available for health checks")


async def _connect_neo4j():
    try:
        await neo4j.connect(settings)
    except Exception:
        logging.exception("Neo4j connection failed; the service will remain available for health checks")


@asynccontextmanager
async def lifespan(_: FastAPI):
    mongo_task = asyncio.create_task(_connect_mongo())
    neo4j_task = asyncio.create_task(_connect_neo4j())
    yield
    mongo_task.cancel()
    neo4j_task.cancel()
    await neo4j.close()
    await mongo.close()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    install_middleware(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    @app.get("/api/health")
    async def health() -> dict:
        return {
            "status": "ok",
            "message": "NoteRoot API is running",
            "db": {
                "mongo": mongo.is_connected,
                "neo4j": neo4j.is_connected,
            },
        }

    app.include_router(auth_router)
    app.include_router(ai_router)
    app.include_router(notes_router)
    app.include_router(graph_router)
    app.include_router(plugins_router)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, error: HTTPException) -> JSONResponse:
        return JSONResponse(status_code=error.status_code, content={"error": error.detail})

    return app


app = create_app()
