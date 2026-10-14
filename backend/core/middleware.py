import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def install_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
        started_at = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as e:
            logger.exception("Unhandled API error", extra={"request_id": request_id, "path": request.url.path})
            response = JSONResponse(status_code=500, content={"error": "Internal server error", "details": str(e)})
        response.headers["X-Request-Id"] = request_id
        logger.info(
            "%s %s %s %.3fs",
            request.method,
            request.url.path,
            response.status_code,
            time.perf_counter() - started_at,
        )
        return response
