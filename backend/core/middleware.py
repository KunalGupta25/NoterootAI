import logging
import time
import uuid

from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger(__name__)


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
    app.add_middleware(RequestContextMiddleware)
