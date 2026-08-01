"""Pure ASGI middleware to ensure all response headers are properly UTF-8 encoded."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_ESSENTIAL_HEADERS = {b"content-type", b"content-length"}


class HeaderEncodingMiddleware:
    """Sanitizes response headers that contain invalid UTF-8 bytes.

    Essential headers (content-type, content-length) are fixed with replacement
    characters. Non-essential headers with encoding issues are removed entirely.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                raw_headers = message.get("headers", [])
                sanitized: list[tuple[bytes, bytes]] = []
                for key, value in raw_headers:
                    try:
                        value.decode("utf-8")
                        sanitized.append((key, value))
                    except (UnicodeDecodeError, AttributeError):
                        if key.lower() in _ESSENTIAL_HEADERS:
                            try:
                                fixed = value.decode("utf-8", errors="replace").encode(
                                    "utf-8"
                                )
                                sanitized.append((key, fixed))
                            except Exception:
                                sanitized.append((key, value))
                        else:
                            logger.warning(
                                "Removed header with invalid encoding: %s",
                                key.decode("latin-1", errors="replace"),
                            )
                message["headers"] = sanitized
            await send(message)

        await self.app(scope, receive, send_wrapper)
