"""Column visibility rule service for the reporting module (FR-7).

Filters a data source's columns/rows against tenant-defined FieldPermission
rules. Rule lookups are cached per (tenant_id, dataset_type) in Redis with
the same setex/300s pattern app.core.cache.cache_service.CacheService uses
for user permission caching — not a new caching abstraction.
"""

import json
from typing import Any
from uuid import UUID

from app.core.auth.permissions import has_permission
from app.core.config_file import get_settings
from app.repositories.reporting_repository import ReportingRepository

settings = get_settings()

_CACHE_TTL_SECONDS = 300


class ReportingColumnRuleService:
    """Loads FieldPermission rules (cached) and filters columns/rows by them."""

    def __init__(self, repository: ReportingRepository):
        self.repository = repository
        self.redis: Any = None
        self._init_redis()

    def _init_redis(self) -> None:
        try:
            import redis

            self.redis = redis.from_url(
                settings.REDIS_URL,
                password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                decode_responses=True,
            )
        except Exception:
            # Redis not available — cache disabled, rules loaded from DB every call.
            pass

    def _cache_key(self, tenant_id: UUID, dataset_type: str) -> str:
        return f"reporting:field_permissions:{tenant_id}:{dataset_type}"

    def _get_rules(self, tenant_id: UUID, dataset_type: str) -> dict[str, str]:
        """Return {column_name: required_permission} for this dataset,
        cached for 300s per (tenant_id, dataset_type)."""
        cache_key = self._cache_key(tenant_id, dataset_type)

        if self.redis:
            try:
                cached = self.redis.get(cache_key)
                if cached is not None:
                    return json.loads(cached)
            except Exception:
                pass

        rules = self.repository.list_field_permissions(tenant_id, dataset_type)
        rule_map = {rule.column_name: rule.required_permission for rule in rules}

        if self.redis:
            try:
                self.redis.setex(cache_key, _CACHE_TTL_SECONDS, json.dumps(rule_map))
            except Exception:
                pass

        return rule_map

    def invalidate(self, tenant_id: UUID, dataset_type: str) -> None:
        """Invalidate the cached rule set for a dataset — call after any
        FieldPermission create/update/delete for that (tenant_id, dataset_type)."""
        if not self.redis:
            return
        try:
            self.redis.delete(self._cache_key(tenant_id, dataset_type))
        except Exception:
            pass

    def filter_columns(
        self,
        tenant_id: UUID,
        dataset_type: str,
        columns: list[dict[str, Any]],
        user_permissions: set[str] | None,
    ) -> list[dict[str, Any]]:
        """Drop any column the user's permission set fails the rule for.

        user_permissions=None means no restriction (internal/system callers).
        """
        if user_permissions is None:
            return columns

        rules = self._get_rules(tenant_id, dataset_type)
        if not rules:
            return columns

        return [
            column
            for column in columns
            if column.get("name") not in rules
            or has_permission(user_permissions, rules[column["name"]])
        ]

    def filter_rows(
        self,
        tenant_id: UUID,
        dataset_type: str,
        rows: list[dict[str, Any]],
        user_permissions: set[str] | None,
    ) -> list[dict[str, Any]]:
        """Strip any ruled-out column key from every row (defense in depth —
        get_data() may return rows even for columns get_columns() would hide)."""
        if user_permissions is None or not rows:
            return rows

        rules = self._get_rules(tenant_id, dataset_type)
        if not rules:
            return rows

        blocked_columns = {
            column_name
            for column_name, required_permission in rules.items()
            if not has_permission(user_permissions, required_permission)
        }
        if not blocked_columns:
            return rows

        return [
            {k: v for k, v in row.items() if k not in blocked_columns} for row in rows
        ]
