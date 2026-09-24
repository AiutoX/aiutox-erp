"""LicenseActivationService — activate, query, and revoke tenant licenses — P10-T04."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.licensing.exceptions import LicenseInvalidError
from app.core.licensing.keys import get_key_store
from app.core.licensing.models import TenantLicense
from app.core.licensing.service import LicenseService


class LicenseActivationService:
    """Handles lifecycle of activated License JWTs in the database."""

    def __init__(self, db: Session, user_id: str | None = None) -> None:
        self._db = db
        self._user_id = user_id
        self._license_svc = LicenseService(key_store=get_key_store())

    def activate(self, token: str, tenant_id: str) -> TenantLicense:
        """Validate JWT and persist it as an active license.

        Raises:
            LicenseInvalidError: on bad signature, expiry, or duplicate jti
        """
        claims = self._license_svc.verify_token(token)

        jti = claims.get("jti")
        if not jti:
            raise LicenseInvalidError("Missing jti claim in license token")

        existing = (
            self._db.query(TenantLicense)
            .filter_by(tenant_id=tenant_id, license_jti=jti)
            .first()
        )
        if existing:
            return existing

        token_hash = hashlib.sha256(token.encode()).hexdigest()
        modules_json = json.dumps(claims.get("modules", {}))
        issued_at = datetime.fromtimestamp(claims["iat"], tz=UTC)
        expires_at = self._license_svc.get_expires_at(claims)

        record = TenantLicense(
            tenant_id=tenant_id,
            license_jti=jti,
            token_hash=token_hash,
            issued_at=issued_at,
            expires_at=expires_at,
            modules_json=modules_json,
            activated_by=self._user_id,
        )
        self._db.add(record)
        self._db.commit()
        self._db.refresh(record)
        return record

    def get_active_license(self, tenant_id: str) -> TenantLicense | None:
        """Return the most recently activated non-revoked, non-expired license."""
        now = datetime.now(UTC)
        return (
            self._db.query(TenantLicense)
            .filter(
                TenantLicense.tenant_id == str(tenant_id),
                TenantLicense.revoked_at.is_(None),
                TenantLicense.expires_at > now,
            )
            .order_by(TenantLicense.created_at.desc())
            .first()
        )

    def revoke(self, license_jti: str) -> bool:
        """Mark a license as revoked. Returns True if found, False if not."""
        record = (
            self._db.query(TenantLicense).filter_by(license_jti=license_jti).first()
        )
        if not record:
            return False
        record.revoked_at = datetime.now(UTC)
        self._db.commit()
        return True

    def get_active_modules(self, tenant_id: str) -> dict[str, str]:
        """Return the modules dict from the active license, or {} if none."""
        license_record = self.get_active_license(tenant_id)
        if not license_record:
            return {}
        return json.loads(license_record.modules_json)
