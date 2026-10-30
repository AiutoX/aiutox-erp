"""Pure ASGI middleware to normalize request body encoding to UTF-8."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_WRITE_METHODS = {b"POST", b"PUT", b"PATCH"}


def _normalize_encoding(body_bytes: bytes) -> bytes:
    """Attempt to decode body as UTF-8, falling back to Latin-1."""
    try:
        body_bytes.decode("utf-8")
        return body_bytes
    except UnicodeDecodeError:
        pass

    try:
        body_str = body_bytes.decode("latin-1")
        logger.warning(
            "Request body had encoding issues, decoded as Latin-1. "
            "Client should send UTF-8 encoded JSON."
        )
        return body_str.encode("utf-8")
    except UnicodeDecodeError:
        body_str = body_bytes.decode("utf-8", errors="replace")
        logger.error("Request body has severe encoding issues, using error replacement")
        return body_str.encode("utf-8")


class RequestBodyEncodingMiddleware:
    """Normalizes JSON request body encoding for POST/PUT/PATCH requests.

    If the body is valid UTF-8, it passes through untouched.
    If Latin-1, it is re-encoded as UTF-8.
    As a last resort, invalid bytes are replaced.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET").encode("ascii")
        if method not in _WRITE_METHODS:
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        content_type = headers.get(b"content-type", b"").decode("latin-1")

        if "application/json" not in content_type:
            await self.app(scope, receive, send)
            return

        body_consumed = False

        async def receive_wrapper():
            nonlocal body_consumed
            message = await receive()
            if message["type"] == "http.request" and not body_consumed:
                body_bytes = message.get("body", b"")
                if body_bytes:
                    message = dict(message)
                    message["body"] = _normalize_encoding(body_bytes)
                body_consumed = True
            return message

        await self.app(scope, receive_wrapper, send)
