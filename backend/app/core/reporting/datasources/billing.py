"""Billing data source for the reporting module."""

from datetime import date, timedelta
from typing import Any
from uuid import UUID


class BillingDataSource:
    """Data source that provides billing data (charges, payments, aging) for reports."""

    name: str = "billing"
    label: str = "Billing"
    description: str = "Charges, payments, and aging analysis"

    def __init__(self, db: Any = None, tenant_id: UUID | None = None) -> None:
        self.db = db
        self.tenant_id = tenant_id

    def fetch(
        self,
        filters: dict[str, Any] | None = None,
        pagination: dict[str, int] | None = None,
    ) -> dict[str, Any]:
        """Fetch billing data for a report."""
        if self.db is None or self.tenant_id is None:
            return {"data": [], "total": 0}

        skip = (pagination or {}).get("skip", 0)
        limit = (pagination or {}).get("limit", 100)

        from app.modules.billing.service import BillingService

        service = BillingService(self.db)
        charges, _ = service.list_charges(
            tenant_id=self.tenant_id, skip=skip, limit=limit
        )
        rows = [
            {
                "id": str(c.id),
                "entity_type": c.entity_type,
                "entity_id": str(c.entity_id),
                "amount": float(c.amount),
                "status": c.status,
                "due_date": c.due_date.isoformat() if c.due_date else None,
                "description": c.description,
            }
            for c in charges
        ]
        return {"data": rows, "total": len(rows)}

    # ─── Dashboard KPIs ──────────────────────────────────────────────────────

    def get_aging(self, tenant_id: UUID) -> dict[str, Any]:
        """Aging buckets for overdue charges (aggregated in DB).

        Returns counts and totals for 4 aging ranges:
          0-30 days, 31-60 days, 61-90 days, >90 days
        """
        from sqlalchemy import func

        from app.modules.billing.models import Charge, ChargeStatus

        today = date.today()
        d30 = today - timedelta(days=30)
        d60 = today - timedelta(days=60)
        d90 = today - timedelta(days=90)

        def _bucket(min_date, max_date):
            q = (
                self.db.query(
                    func.count(Charge.id).label("count"),
                    func.coalesce(func.sum(Charge.amount), 0).label("total"),
                )
                .filter(
                    Charge.tenant_id == tenant_id,
                    Charge.status == ChargeStatus.OVERDUE,
                    Charge.due_date >= min_date if min_date else True,
                    Charge.due_date < max_date if max_date else True,
                )
                .one()
            )
            return {"count": q.count, "total": float(q.total)}

        return {
            "0_30": _bucket(d30, today),
            "31_60": _bucket(d60, d30),
            "61_90": _bucket(d90, d60),
            "over_90": _bucket(None, d90),
        }

    def top_debtors(self, tenant_id: UUID, limit: int = 5) -> list[dict]:
        """Top debtors by total overdue amount (aggregated in DB)."""
        from sqlalchemy import func

        from app.modules.billing.models import Charge, ChargeStatus

        rows = (
            self.db.query(
                Charge.entity_id,
                Charge.entity_type,
                func.sum(Charge.amount).label("total_debt"),
                func.count(Charge.id).label("charge_count"),
            )
            .filter(
                Charge.tenant_id == tenant_id,
                Charge.status == ChargeStatus.OVERDUE,
            )
            .group_by(Charge.entity_id, Charge.entity_type)
            .order_by(func.sum(Charge.amount).desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "entity_id": str(r.entity_id),
                "entity_type": r.entity_type,
                "total_debt": float(r.total_debt),
                "charge_count": r.charge_count,
            }
            for r in rows
        ]

    def get_columns(self) -> list[dict[str, str]]:
        return [
            {"name": "id", "label": "ID", "type": "uuid"},
            {"name": "entity_type", "label": "Entity Type", "type": "string"},
            {"name": "entity_id", "label": "Entity ID", "type": "uuid"},
            {"name": "amount", "label": "Amount", "type": "decimal"},
            {"name": "status", "label": "Status", "type": "string"},
            {"name": "due_date", "label": "Due Date", "type": "date"},
            {"name": "description", "label": "Description", "type": "string"},
        ]
