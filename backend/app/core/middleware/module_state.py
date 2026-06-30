"""Pure ASGI middleware to enforce module state access control."""

from __future__ import annotations

import json
import logging
import re
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.db.session import engine
from app.core.tenant_modules.models import TenantModule, TenantModuleState

logger = logging.getLogger(__name__)

_MODULE_PATH_PATTERN = re.compile(r"^/api/v1/([a-z_]+)(?:/|$)")

_WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

_BYPASS_PREFIXES = (
    "/api/v1/admin/modules",
    "/api/v1/auth",
    "/api/v1/users",
    "/api/v1/config",
    "/api/v1/pubsub",
    "/api/v1/dashboard",
    "/health",
)


async def _send_json_error(send, status_code: int, detail: str, code: str, **extra):
    """Send an error response directly via ASGI send."""
    body = {"detail": detail, "code": code}
    body.update(extra)
    payload = json.dumps(body).encode("utf-8")
    await send(
        {
            "type": "http.response.start",
            "status": status_code,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(payload)).encode("ascii")),
            ],
        }
    )
    await send({"type": "http.response.body", "body": payload})


class ModuleStateMiddleware:
    """Blocks API access based on module lifecycle state.

    Rules:
    - disabled -> 404
    - not_installed -> 404
    - grace_period + write method -> 423 (locked)
    - grace_period + read method -> allow
    - Otherwise -> allow
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")

        if any(path.startswith(prefix) for prefix in _BYPASS_PREFIXES):
            await self.app(scope, receive, send)
            return

        if not path.startswith("/api/v1/"):
            await self.app(scope, receive, send)
            return

        match = _MODULE_PATH_PATTERN.match(path)
        if not match:
            await self.app(scope, receive, send)
            return

        module_id = match.group(1)
        headers = scope.get("headers", [])
        tenant_id = self._extract_tenant_id_from_headers(headers)

        if not tenant_id:
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")

        try:
            result = self._check_module_state(tenant_id, module_id, method)
        except Exception:
            await self.app(scope, receive, send)
            return

        if result is not None:
            status_code, code, detail = result
            await _send_json_error(send, status_code, detail, code)
            return

        await self.app(scope, receive, send)

    def _extract_tenant_id_from_headers(
        self, headers: list[tuple[bytes, bytes]]
    ) -> str | None:
        """Extract and validate tenant_id from X-Tenant-ID header."""
        for key, value in headers:
            if key.lower() == b"x-tenant-id":
                raw = value.decode("latin-1")
                try:
                    UUID(raw)
                    return raw
                except ValueError:
                    return None
        return None

    def _check_module_state(
        self, tenant_id: str, module_id: str, method: str
    ) -> tuple[int, str, str] | None:
        """Check module state in the database.

        Returns None if access is allowed, or (status_code, code, detail) to block.
        """
        try:
            with Session(engine) as db:
                tm = (
                    db.query(TenantModule)
                    .filter_by(tenant_id=tenant_id, module=module_id)
                    .first()
                )

                if not tm or tm.state == TenantModuleState.NOT_INSTALLED:
                    return (
                        404,
                        "MODULE_NOT_AVAILABLE",
                        f"Module '{module_id}' is not available",
                    )

                if tm.state == TenantModuleState.DISABLED:
                    return (404, "MODULE_DISABLED", f"Module '{module_id}' is disabled")

                if tm.state == TenantModuleState.GRACE_PERIOD:
                    if method in _WRITE_METHODS:
                        return (
                            423,
                            "MODULE_GRACE_PERIOD",
                            f"Module '{module_id}' is in read-only mode (grace period)",
                        )
        except Exception:
            pass

        return None
