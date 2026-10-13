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


@asynccontextmanager
async def lifespan(_: FastAPI):
    for name, connect in (("MongoDB", mongo.connect), ("Neo4j", neo4j.connect)):
        try:
            await connect(settings)
        except Exception:
            logging.exception("%s connection failed; the service will remain available for health checks", name)
    try:
        await mongo.ensure_indexes()
    except Exception:
        logging.exception("MongoDB index setup failed")
    yield
    await neo4j.close()
    await mongo.close()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Request-Id"],
    )
    install_middleware(app)
    app.include_router(auth_router)
    app.include_router(ai_router)
    app.include_router(notes_router)
    app.include_router(graph_router)
    app.include_router(plugins_router)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, error: HTTPException) -> JSONResponse:
        return JSONResponse(status_code=error.status_code, content={"error": error.detail})

    @app.get("/api/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "message": "NoteRoot API is running"}

    return app


app = create_app()
