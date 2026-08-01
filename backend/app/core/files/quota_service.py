"""Storage quota service for the `files` module.

Two independent quota layers, both scoped to Regime A (the personal
library — files with no `entity_type`; see `FileService.check_permissions`'s
docstring for the Regime A/B split):

- Tenant quota: a hard ceiling on the tenant's total storage, configured by
  the tenant admin via `ConfigService` (same storage mechanism as the
  existing `/config/files` "Límites" tab — see `StorageConfigService`).
- Personal quota: a per-user ceiling within the tenant, configured via
  `PreferencesService` as a tenant-wide default with an optional per-user
  override — the same org->user inheritance pattern already used for
  notification channel preferences.

Warning thresholds (percentages of the relevant quota) are configurable
per layer and independently of each other, since a tenant admin may want a
tighter early-warning window on the tenant-wide quota than on individual
users' personal quotas.

Files attached to a business entity (Regime B) are NOT counted against
either quota — that storage belongs to the module/tenant relationship, not
a person's personal allowance, and modules that want their own storage
limits are expected to enforce them independently (out of scope here).
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config.service import ConfigService
from app.core.exceptions import APIException
from app.core.files.models import File
from app.core.preferences.service import PreferencesService

logger = logging.getLogger(__name__)

_MODULE = "files"
_PREFERENCE_TYPE = "storage_quota"

_DEFAULT_TENANT_QUOTA_BYTES = 50 * 1024 * 1024 * 1024  # 50GB
_DEFAULT_USER_QUOTA_BYTES = 1 * 1024 * 1024 * 1024  # 1GB
_DEFAULT_TENANT_THRESHOLDS = [75, 90, 100]
_DEFAULT_USER_THRESHOLDS = [80, 100]


def _validate_bytes(value: Any, field_name: str) -> None:
    if not isinstance(value, int) or value <= 0:
        raise APIException(
            status_code=400,
            code="INVALID_QUOTA_VALUE",
            message=f"{field_name} must be a positive integer (bytes).",
        )


def _validate_thresholds(value: Any) -> None:
    if not isinstance(value, list) or not value:
        raise APIException(
            status_code=400,
            code="INVALID_QUOTA_THRESHOLDS",
            message="Thresholds must be a non-empty list of percentages.",
        )
    for pct in value:
        if not isinstance(pct, int) or not (0 < pct <= 100):
            raise APIException(
                status_code=400,
                code="INVALID_QUOTA_THRESHOLDS",
                message=f"Each threshold must be an integer in (0, 100], got: {pct}",
            )


class QuotaService:
    """Manages tenant and personal storage quotas for Regime A files."""

    def __init__(self, db: Session):
        self.db = db
        self.config_service = ConfigService(db)
        self.preferences_service = PreferencesService(db)

    # -- Tenant quota -----------------------------------------------------

    def get_tenant_quota_bytes(self, tenant_id: UUID) -> int:
        return self.config_service.get(
            tenant_id, _MODULE, "quota.tenant_max_bytes", _DEFAULT_TENANT_QUOTA_BYTES
        )

    def update_tenant_quota_bytes(
        self,
        tenant_id: UUID,
        max_bytes: int,
        user_id: UUID | None = None,
    ) -> int:
        _validate_bytes(max_bytes, "Tenant quota")
        self.config_service.set(
            tenant_id=tenant_id,
            module=_MODULE,
            key="quota.tenant_max_bytes",
            value=max_bytes,
            user_id=user_id,
        )
        return max_bytes

    def get_tenant_thresholds(self, tenant_id: UUID) -> list[int]:
        return self.config_service.get(
            tenant_id,
            _MODULE,
            "quota.tenant_warning_thresholds",
            list(_DEFAULT_TENANT_THRESHOLDS),
        )

    def update_tenant_thresholds(
        self, tenant_id: UUID, thresholds: list[int], user_id: UUID | None = None
    ) -> list[int]:
        _validate_thresholds(thresholds)
        sorted_thresholds = sorted(set(thresholds))
        self.config_service.set(
            tenant_id=tenant_id,
            module=_MODULE,
            key="quota.tenant_warning_thresholds",
            value=sorted_thresholds,
            user_id=user_id,
        )
        return sorted_thresholds

    # -- Personal quota (tenant-wide default + optional per-user override) -

    def get_default_user_quota_bytes(self, tenant_id: UUID) -> int:
        return self.config_service.get(
            tenant_id,
            _MODULE,
            "quota.user_default_max_bytes",
            _DEFAULT_USER_QUOTA_BYTES,
        )

    def update_default_user_quota_bytes(
        self, tenant_id: UUID, max_bytes: int, user_id: UUID | None = None
    ) -> int:
        _validate_bytes(max_bytes, "Default personal quota")
        self.config_service.set(
            tenant_id=tenant_id,
            module=_MODULE,
            key="quota.user_default_max_bytes",
            value=max_bytes,
            user_id=user_id,
        )
        return max_bytes

    def get_user_quota_bytes(self, user_id: UUID, tenant_id: UUID) -> int:
        """Effective personal quota: per-user override if set, else the
        tenant-wide default.
        """
        default = self.get_default_user_quota_bytes(tenant_id)
        return self.preferences_service.get_preference(
            user_id, tenant_id, _PREFERENCE_TYPE, "max_bytes", default
        )

    def set_user_quota_override(
        self, target_user_id: UUID, tenant_id: UUID, max_bytes: int
    ) -> int:
        """Admin sets a per-user override, distinct from the tenant default."""
        _validate_bytes(max_bytes, "Personal quota override")
        self.preferences_service.set_preference(
            target_user_id, tenant_id, _PREFERENCE_TYPE, "max_bytes", max_bytes
        )
        return max_bytes

    def get_user_thresholds(self, user_id: UUID, tenant_id: UUID) -> list[int]:
        default = self.config_service.get(
            tenant_id,
            _MODULE,
            "quota.user_warning_thresholds",
            list(_DEFAULT_USER_THRESHOLDS),
        )
        return self.preferences_service.get_preference(
            user_id, tenant_id, _PREFERENCE_TYPE, "warning_thresholds", default
        )

    def update_default_user_thresholds(
        self, tenant_id: UUID, thresholds: list[int], user_id: UUID | None = None
    ) -> list[int]:
        _validate_thresholds(thresholds)
        sorted_thresholds = sorted(set(thresholds))
        self.config_service.set(
            tenant_id=tenant_id,
            module=_MODULE,
            key="quota.user_warning_thresholds",
            value=sorted_thresholds,
            user_id=user_id,
        )
        return sorted_thresholds

    # -- Usage --------------------------------------------------------------

    def get_tenant_usage_bytes(self, tenant_id: UUID) -> int:
        """Total bytes used by Regime A (entity-less) files for this tenant."""
        total = (
            self.db.query(func.sum(File.size))
            .filter(
                File.tenant_id == tenant_id,
                File.is_current,
                File.entity_type.is_(None),
            )
            .scalar()
        )
        return int(total) if total is not None else 0

    def get_user_usage_bytes(self, user_id: UUID, tenant_id: UUID) -> int:
        """Total bytes used by this user's Regime A (entity-less) files."""
        total = (
            self.db.query(func.sum(File.size))
            .filter(
                File.tenant_id == tenant_id,
                File.uploaded_by == user_id,
                File.is_current,
                File.entity_type.is_(None),
            )
            .scalar()
        )
        return int(total) if total is not None else 0

    def get_tenant_usage_breakdown(self, tenant_id: UUID) -> list[dict[str, Any]]:
        """Per-user usage breakdown for Regime A files, for the admin dashboard."""
        rows = (
            self.db.query(File.uploaded_by, func.sum(File.size).label("total"))
            .filter(
                File.tenant_id == tenant_id,
                File.is_current,
                File.entity_type.is_(None),
                File.uploaded_by.isnot(None),
            )
            .group_by(File.uploaded_by)
            .all()
        )
        return [
            {"user_id": user_id, "bytes_used": int(total) if total else 0}
            for user_id, total in rows
        ]

    # -- Enforcement ----------------------------------------------------

    def check_quota_before_upload(
        self, user_id: UUID, tenant_id: UUID, incoming_bytes: int
    ) -> None:
        """Raise APIException if accepting `incoming_bytes` would exceed
        either the tenant or the user's personal quota. No-op for Regime B
        uploads — caller must only invoke this for entity-less uploads.
        """
        tenant_quota = self.get_tenant_quota_bytes(tenant_id)
        tenant_usage = self.get_tenant_usage_bytes(tenant_id)
        if tenant_usage + incoming_bytes > tenant_quota:
            raise APIException(
                status_code=400,
                code="TENANT_STORAGE_QUOTA_EXCEEDED",
                message=(
                    f"This upload would exceed the tenant's storage quota "
                    f"({tenant_quota} bytes). Current usage: {tenant_usage} bytes."
                ),
            )

        user_quota = self.get_user_quota_bytes(user_id, tenant_id)
        user_usage = self.get_user_usage_bytes(user_id, tenant_id)
        if user_usage + incoming_bytes > user_quota:
            raise APIException(
                status_code=400,
                code="USER_STORAGE_QUOTA_EXCEEDED",
                message=(
                    f"This upload would exceed your personal storage quota "
                    f"({user_quota} bytes). Current usage: {user_usage} bytes."
                ),
            )
