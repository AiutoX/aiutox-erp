"""Pure ASGI license middleware -- attaches active license modules to scope state.

This middleware runs on every authenticated request and adds
`scope["state"]["license_modules"]` dict (module_id -> tier) so downstream
handlers can check tier without hitting the DB again.

License enforcement is skipped when AIUTOX_LICENSE_ENFORCEMENT=off.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.db.session import SessionLocal
from app.core.licensing.models import TenantLicense

logger = logging.getLogger(__name__)

_SKIP_PATHS = {"/health", "/metrics", "/docs", "/openapi.json", "/redoc"}


class LicenseMiddleware:
    """Reads active license from DB and attaches modules to scope state."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        state = scope.setdefault("state", {})
        path = scope.get("path", "")

        enforcement = os.getenv("AIUTOX_LICENSE_ENFORCEMENT", "on").lower()
        if enforcement != "on" or path in _SKIP_PATHS:
            state["license_modules"] = {}
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        if b"authorization" not in headers:
            state["license_modules"] = {}
            await self.app(scope, receive, send)
            return

        tenant_id = state.get("tenant_id")
        if not tenant_id:
            state["license_modules"] = {}
            await self.app(scope, receive, send)
            return

        db: Session | None = None
        try:
            db = SessionLocal()
            now = datetime.now(UTC)
            record: TenantLicense | None = (
                db.query(TenantLicense)
                .filter(
                    TenantLicense.tenant_id == str(tenant_id),
                    TenantLicense.revoked_at.is_(None),
                    TenantLicense.expires_at > now,
                )
                .order_by(TenantLicense.created_at.desc())
                .first()
            )
            state["license_modules"] = json.loads(record.modules_json) if record else {}
        except Exception:
            state["license_modules"] = {}
        finally:
            if db is not None:
                try:
                    db.close()
                except Exception:
                    pass

        await self.app(scope, receive, send)
