"""InsightsService — refresh + query insights materialized views."""

from __future__ import annotations

import logging
import time
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

_MV_NAMES = [
    "insights.billing_monthly_revenue",
    "insights.maintenance_backlog_by_tech",
    "insights.crm_pipeline_by_stage",
]


_MV_REFRESH_ALERT_THRESHOLD_SECONDS = 60.0


class _HistogramStub:
    """Minimal histogram stub — structured-logs slow refreshes as WARNING.

    Emits a WARNING log when a refresh exceeds _MV_REFRESH_ALERT_THRESHOLD_SECONDS.
    This fulfils the plan's observability requirement without requiring prometheus_client.

    To upgrade: replace MV_REFRESH_HISTOGRAM with a real prometheus_client.Histogram
    and wire the /metrics endpoint. The observe() interface is identical.
    """

    def labels(self, **kwargs: Any) -> _HistogramStub:
        self._labels = kwargs
        return self

    def observe(self, value: float) -> None:
        view = getattr(self, "_labels", {}).get("view", "unknown")
        logger.info(
            "insights_mv_refresh_duration_seconds view=%s duration=%.3f",
            view,
            value,
        )
        if value > _MV_REFRESH_ALERT_THRESHOLD_SECONDS:
            logger.warning(
                "ALERT: insights MV refresh exceeded %ss threshold — view=%s duration=%.3fs",
                _MV_REFRESH_ALERT_THRESHOLD_SECONDS,
                view,
                value,
            )


MV_REFRESH_HISTOGRAM = _HistogramStub()


class InsightsService:
    """Manages refreshing the three insights materialized views."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def refresh_all_views(self) -> None:
        """Refresh all insights materialized views concurrently.

        Uses REFRESH MATERIALIZED VIEW CONCURRENTLY so reads are not blocked.
        Requires a UNIQUE index on each MV (created in insights_001 migration).

        Errors in individual refreshes are logged and skipped so a single
        failing MV does not abort the others.
        """
        for mv in _MV_NAMES:
            start = time.monotonic()
            try:
                self._db.execute(text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {mv}"))
                self._db.commit()
                elapsed = time.monotonic() - start
                MV_REFRESH_HISTOGRAM.labels(view=mv).observe(elapsed)
                logger.info("Refreshed %s in %.3fs", mv, elapsed)
            except Exception as exc:
                elapsed = time.monotonic() - start
                logger.error("Failed to refresh %s after %.3fs: %s", mv, elapsed, exc)

    # ── Read queries ─────────────────────────────────────────────────────────

    def get_billing_monthly_revenue(
        self, tenant_id: UUID, months: int = 12
    ) -> list[dict[str, Any]]:
        """Return monthly revenue rows for the tenant, last N months."""
        rows = self._db.execute(
            text("""
                SELECT tenant_id, month, revenue, invoice_count
                FROM insights.billing_monthly_revenue
                WHERE tenant_id = :tenant_id
                  AND month >= DATE_TRUNC('month', NOW() - INTERVAL ':months months')::DATE
                ORDER BY month DESC
            """),
            {"tenant_id": str(tenant_id), "months": months},
        ).fetchall()
        return [dict(r._mapping) for r in rows]

    def get_maintenance_backlog(self, tenant_id: UUID) -> list[dict[str, Any]]:
        """Return maintenance backlog by technician for the tenant."""
        rows = self._db.execute(
            text("""
                SELECT tenant_id, tech_user_id, backlog_count, oldest_days
                FROM insights.maintenance_backlog_by_tech
                WHERE tenant_id = :tenant_id
                ORDER BY backlog_count DESC
            """),
            {"tenant_id": str(tenant_id)},
        ).fetchall()
        return [dict(r._mapping) for r in rows]

    def get_crm_pipeline(self, tenant_id: UUID) -> list[dict[str, Any]]:
        """Return CRM pipeline by stage for the tenant."""
        rows = self._db.execute(
            text("""
                SELECT tenant_id, stage, deal_count, total_value
                FROM insights.crm_pipeline_by_stage
                WHERE tenant_id = :tenant_id
                ORDER BY total_value DESC
            """),
            {"tenant_id": str(tenant_id)},
        ).fetchall()
        return [dict(r._mapping) for r in rows]
