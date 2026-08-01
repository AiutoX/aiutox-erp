"""AI analytics aggregation service — cost, usage, and capability metrics."""

import hashlib
import json
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

_CACHE_TTL = 3600
_GRANULARITY_VALUES = {"day", "week", "month"}


class AIAnalyticsService:
    def __init__(self, db: Session, redis: Any) -> None:
        self._db = db
        self._redis = redis

    # ------------------------------------------------------------------
    # Cache helpers
    # ------------------------------------------------------------------

    def _cache_key(self, method: str, tenant_id: UUID, params: dict) -> str:
        params_hash = hashlib.md5(
            json.dumps(params, sort_keys=True, default=str).encode(),
            usedforsecurity=False,
        ).hexdigest()
        return f"ai_analytics:{tenant_id}:{method}:{params_hash}"

    async def _get_cached(self, key: str) -> list[dict] | None:
        raw = await self._redis.get(key)
        if raw is not None:
            return json.loads(raw)  # type: ignore[return-value]
        return None

    async def _set_cached(self, key: str, data: list[dict]) -> None:
        await self._redis.setex(key, _CACHE_TTL, json.dumps(data, default=str))

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    async def cost_by_period(
        self,
        tenant_id: UUID,
        from_dt: datetime,
        to_dt: datetime,
        group_by: str = "day",
    ) -> list[dict]:
        granularity = group_by if group_by in _GRANULARITY_VALUES else "day"
        params: dict = {"from_dt": from_dt, "to_dt": to_dt, "granularity": granularity}
        key = self._cache_key("cost_by_period", tenant_id, params)

        cached = await self._get_cached(key)
        if cached is not None:
            return cached

        query = text("""
            SELECT DATE_TRUNC(:granularity, m.created_at) AS period,
                   SUM((m.metadata->>'cost_usd')::numeric)    AS cost_usd,
                   SUM((m.metadata->>'token_count')::numeric)  AS token_count
            FROM ai_conversation_messages m
            WHERE m.tenant_id = :tenant_id
              AND m.created_at BETWEEN :from_dt AND :to_dt
              AND m.metadata ? 'cost_usd'
            GROUP BY 1
            ORDER BY 1
            """)
        rows = self._db.execute(
            query,
            {
                "tenant_id": str(tenant_id),
                "granularity": granularity,
                "from_dt": from_dt,
                "to_dt": to_dt,
            },
        )
        result = [
            {
                "date": (
                    row.period.isoformat()
                    if hasattr(row.period, "isoformat")
                    else str(row.period)
                ),
                "cost_usd": float(row.cost_usd) if row.cost_usd is not None else 0.0,
                "token_count": (
                    int(row.token_count) if row.token_count is not None else 0
                ),
            }
            for row in rows
        ]
        await self._set_cached(key, result)
        return result

    async def cost_by_capability(
        self,
        tenant_id: UUID,
        from_dt: datetime,
        to_dt: datetime,
    ) -> list[dict]:
        params: dict = {"from_dt": from_dt, "to_dt": to_dt}
        key = self._cache_key("cost_by_capability", tenant_id, params)

        cached = await self._get_cached(key)
        if cached is not None:
            return cached

        query = text("""
            SELECT m.metadata->>'capability_name'           AS capability,
                   SUM((m.metadata->>'cost_usd')::numeric)  AS total_cost_usd,
                   COUNT(*)                                  AS invocation_count,
                   AVG((m.metadata->>'latency_ms')::numeric) AS avg_latency_ms
            FROM ai_conversation_messages m
            WHERE m.tenant_id = :tenant_id
              AND m.created_at BETWEEN :from_dt AND :to_dt
              AND m.metadata ? 'capability_name'
            GROUP BY 1
            ORDER BY total_cost_usd DESC
            """)
        rows = self._db.execute(
            query,
            {"tenant_id": str(tenant_id), "from_dt": from_dt, "to_dt": to_dt},
        )
        result = [
            {
                "capability": row.capability,
                "total_cost_usd": (
                    float(row.total_cost_usd) if row.total_cost_usd is not None else 0.0
                ),
                "invocation_count": int(row.invocation_count),
                "avg_latency_ms": (
                    float(row.avg_latency_ms) if row.avg_latency_ms is not None else 0.0
                ),
            }
            for row in rows
        ]
        await self._set_cached(key, result)
        return result

    async def cost_by_user(
        self,
        tenant_id: UUID,
        from_dt: datetime,
        to_dt: datetime,
    ) -> list[dict]:
        params: dict = {"from_dt": from_dt, "to_dt": to_dt}
        key = self._cache_key("cost_by_user", tenant_id, params)

        cached = await self._get_cached(key)
        if cached is not None:
            return cached

        query = text("""
            SELECT c.user_id,
                   COUNT(DISTINCT c.id)                         AS conversations,
                   SUM((m.metadata->>'token_count')::numeric)   AS token_count,
                   SUM((m.metadata->>'cost_usd')::numeric)      AS cost_usd
            FROM ai_conversation_messages m
            JOIN ai_conversations c ON c.id = m.conversation_id
            WHERE m.tenant_id = :tenant_id
              AND m.created_at BETWEEN :from_dt AND :to_dt
              AND m.metadata ? 'cost_usd'
            GROUP BY c.user_id
            ORDER BY cost_usd DESC
            """)
        rows = self._db.execute(
            query,
            {"tenant_id": str(tenant_id), "from_dt": from_dt, "to_dt": to_dt},
        )
        result = [
            {
                "user_id": str(row.user_id),
                "conversations": int(row.conversations),
                "token_count": (
                    int(row.token_count) if row.token_count is not None else 0
                ),
                "cost_usd": float(row.cost_usd) if row.cost_usd is not None else 0.0,
            }
            for row in rows
        ]
        await self._set_cached(key, result)
        return result

    async def capability_metrics(self, tenant_id: UUID) -> list[dict]:
        key = self._cache_key("capability_metrics", tenant_id, {})

        cached = await self._get_cached(key)
        if cached is not None:
            return cached

        query = text("""
            SELECT m.metadata->>'capability_name'              AS capability,
                   COUNT(*)                                     AS invocation_count,
                   AVG((m.metadata->>'latency_ms')::numeric)    AS avg_latency_ms,
                   SUM(CASE WHEN m.status = 'failed' THEN 1.0 ELSE 0.0 END)
                     / NULLIF(COUNT(*), 0) * 100               AS error_rate_pct
            FROM ai_conversation_messages m
            WHERE m.tenant_id = :tenant_id
              AND m.created_at >= NOW() - INTERVAL '30 days'
              AND m.metadata ? 'capability_name'
            GROUP BY 1
            ORDER BY invocation_count DESC
            """)
        rows = self._db.execute(query, {"tenant_id": str(tenant_id)})
        result = [
            {
                "capability": row.capability,
                "invocation_count": int(row.invocation_count),
                "avg_latency_ms": (
                    float(row.avg_latency_ms) if row.avg_latency_ms is not None else 0.0
                ),
                "error_rate_pct": (
                    float(row.error_rate_pct) if row.error_rate_pct is not None else 0.0
                ),
            }
            for row in rows
        ]
        await self._set_cached(key, result)
        return result
