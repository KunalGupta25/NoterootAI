import logging
import time
import uuid

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger(__name__)

MAX_BODY_SIZE = 1_048_576  # 1 MB


class RequestBodyLimitMiddleware:
    def __init__(self, app: ASGIApp, max_bytes: int = MAX_BODY_SIZE):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        for name, value in scope.get("headers", []):
            if name.lower() == b"content-length":
                try:
                    if int(value) > self.max_bytes:
                        response = JSONResponse(
                            status_code=413,
                            content={"error": f"Request body too large. Maximum size is {self.max_bytes} bytes."},
                        )
                        await response(scope, receive, send)
                        return
                except ValueError:
                    pass

        received_bytes = 0

        async def receive_wrapper():
            nonlocal received_bytes
            message = await receive()
            if message["type"] == "http.request":
                body = message.get("body", b"")
                received_bytes += len(body)
                if received_bytes > self.max_bytes:
                    raise ValueError(f"Request body exceeded {self.max_bytes} bytes limit")
            return message

        try:
            await self.app(scope, receive_wrapper, send)
        except ValueError as err:
            response = JSONResponse(
                status_code=413,
                content={"error": str(err)},
            )
            await response(scope, receive, send)


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = str(uuid.uuid4())
        started_at = time.perf_counter()

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode("latin-1")))
                message["headers"] = headers
            elif message["type"] == "http.response.body" and not message.get("more_body", False):
                logger.info(
                    "%s %s %.3fs",
                    scope.get("method"),
                    scope.get("path"),
                    time.perf_counter() - started_at,
                )
            await send(message)

        await self.app(scope, receive, send_wrapper)


def install_middleware(app) -> None:
    app.add_middleware(RequestBodyLimitMiddleware)
    app.add_middleware(RequestContextMiddleware)
