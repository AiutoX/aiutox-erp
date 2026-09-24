"""TierService — get and set commercial tiers per tenant per module with Redis cache."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.core.tiers.models import TenantModuleTier

_CACHE_TTL_SECONDS = 300  # 5 minutes


class TierService:
    """Manages commercial tier assignments with Redis-backed caching."""

    def __init__(self, db: Session, redis: Any | None = None) -> None:
        self.db = db
        self.redis = redis

    @staticmethod
    def cache_key(tenant_id: UUID | str, module_id: str) -> str:
        return f"tier:{tenant_id}:{module_id}"

    def _get_from_cache(self, tenant_id: UUID | str, module_id: str) -> str | None:
        if not self.redis:
            return None
        try:
            value = self.redis.get(self.cache_key(tenant_id, module_id))
            return value if isinstance(value, str) else None
        except Exception:
            return None

    def _set_cache(self, tenant_id: UUID | str, module_id: str, tier: str) -> None:
        if not self.redis:
            return
        try:
            self.redis.setex(
                self.cache_key(tenant_id, module_id),
                _CACHE_TTL_SECONDS,
                tier,
            )
        except Exception:
            pass

    def invalidate_cache(self, tenant_id: UUID | str, module_id: str) -> None:
        if not self.redis:
            return
        try:
            self.redis.delete(self.cache_key(tenant_id, module_id))
        except Exception:
            pass

    def get_active_tier(self, tenant_id: UUID | str, module_id: str) -> str:
        """Return the active tier string for a tenant+module. Defaults to 'basic'.

        Checks Redis first (TTL 5 min), falls back to DB. Expired tiers downgrade to basic.
        """
        cached = self._get_from_cache(tenant_id, module_id)
        if cached is not None:
            return cached

        record: TenantModuleTier | None = (
            self.db.query(TenantModuleTier)
            .filter(
                and_(
                    TenantModuleTier.tenant_id == str(tenant_id),
                    TenantModuleTier.module_id == module_id,
                )
            )
            .first()
        )

        if record is None:
            return "basic"

        if record.expires_at is not None:
            now = datetime.now(UTC)
            expires = record.expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=UTC)
            if now > expires:
                return "basic"

        tier = str(record.tier)
        self._set_cache(tenant_id, module_id, tier)
        return tier

    def set_tier(
        self,
        tenant_id: UUID | str,
        module_id: str,
        tier: str,
        expires_at: datetime | None = None,
        license_token_jti: str | None = None,
    ) -> TenantModuleTier:
        """Create or update the tier for a tenant+module."""
        record = (
            self.db.query(TenantModuleTier)
            .filter(
                and_(
                    TenantModuleTier.tenant_id == str(tenant_id),
                    TenantModuleTier.module_id == module_id,
                )
            )
            .first()
        )

        if record is None:
            record = TenantModuleTier(
                tenant_id=str(tenant_id),
                module_id=module_id,
                tier=tier,
                expires_at=expires_at,
                license_token_jti=license_token_jti,
            )
            self.db.add(record)
        else:
            record.tier = tier
            record.expires_at = expires_at
            if license_token_jti is not None:
                record.license_token_jti = license_token_jti

        self.db.commit()
        self.db.refresh(record)
        self.invalidate_cache(tenant_id, module_id)
        return record

    def get_all_tiers(self, tenant_id: UUID | str) -> dict[str, str]:
        """Return all active tiers for a tenant as {module_id: tier}."""
        now = datetime.now(UTC)
        records = (
            self.db.query(TenantModuleTier)
            .filter(TenantModuleTier.tenant_id == str(tenant_id))
            .all()
        )
        result: dict[str, str] = {}
        for record in records:
            if record.expires_at is not None:
                expires = record.expires_at
                if expires.tzinfo is None:
                    expires = expires.replace(tzinfo=UTC)
                if now > expires:
                    result[record.module_id] = "basic"
                    continue
            result[record.module_id] = str(record.tier)
        return result
