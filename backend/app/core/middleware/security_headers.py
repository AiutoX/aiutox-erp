"""Pure ASGI middleware to add security headers to all responses.

Also exports `build_security_headers()` for use in exception handlers.
"""

from __future__ import annotations

_CSP_TEMPLATE_PROD = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data: https:; "
    "connect-src 'self' http://localhost:8000 https:; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "worker-src 'self' blob:;"
)

_CSP_TEMPLATE_DEBUG = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data: https: http://localhost:8000; "
    "connect-src 'self' http://localhost:8000 https:; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "worker-src 'self' blob:;"
)


def build_security_headers(*, debug: bool = False) -> list[tuple[bytes, bytes]]:
    """Build the list of security header tuples (key, value) as bytes."""
    headers = [
        (b"x-content-type-options", b"nosniff"),
        (b"x-frame-options", b"DENY"),
        (b"x-xss-protection", b"1; mode=block"),
        (b"referrer-policy", b"strict-origin-when-cross-origin"),
        (b"permissions-policy", b"geolocation=(), microphone=(), camera=()"),
    ]

    if not debug:
        headers.append(
            (b"strict-transport-security", b"max-age=31536000; includeSubDomains")
        )

    csp = _CSP_TEMPLATE_DEBUG if debug else _CSP_TEMPLATE_PROD
    headers.append((b"content-security-policy", csp.encode("utf-8")))

    return headers


def add_security_headers(response, *, debug: bool = False) -> None:
    """Add security headers to a Starlette/FastAPI Response object.

    Kept for backward compatibility with exception handlers in main.py.
    """
    for key, value in build_security_headers(debug=debug):
        response.headers[key.decode("utf-8")] = value.decode("utf-8")


class SecurityHeadersMiddleware:
    """Adds security headers (CSP, HSTS, X-Frame-Options, etc.) to all HTTP responses."""

    def __init__(self, app, *, debug: bool = False):
        self.app = app
        self._extra_headers = build_security_headers(debug=debug)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend(self._extra_headers)
                message = dict(message)
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)
