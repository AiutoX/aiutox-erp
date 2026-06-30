"""Finances data source for the reporting module."""

from typing import Any
from uuid import UUID


class FinancesDataSource:
    """Data source that provides financial data (accounts, periods, P&L, snapshots) for reports."""

    name: str = "finances"
    label: str = "Finances"
    description: str = (
        "Financial periods, owner accounts, P&L analysis, monthly snapshots"
    )

    def __init__(self, db: Any = None, tenant_id: UUID | None = None) -> None:
        self.db = db
        self.tenant_id = tenant_id

    def fetch(
        self,
        filters: dict[str, Any] | None = None,
        pagination: dict[str, int] | None = None,
    ) -> dict[str, Any]:
        """Fetch financial data for a report."""
        if self.db is None or self.tenant_id is None:
            return {"data": [], "total": 0}

        skip = (pagination or {}).get("skip", 0)
        limit = (pagination or {}).get("limit", 100)

        from app.modules.finances.service import FinancesService

        service = FinancesService(self.db)
        filters = filters or {}

        if filters.get("report_type") == "snapshots":
            from app.modules.finances.models import MonthlySnapshot

            q = self.db.query(MonthlySnapshot).filter(
                MonthlySnapshot.tenant_id == self.tenant_id
            )
            total = q.count()
            snapshots = (
                q.order_by(MonthlySnapshot.year.desc(), MonthlySnapshot.month.desc())
                .offset(skip)
                .limit(limit)
                .all()
            )
            rows = [
                {
                    "period": f"{s.year}/{s.month:02d}",
                    "year": s.year,
                    "month": s.month,
                    "total_income": float(s.total_income),
                    "total_expenses": float(s.total_expenses),
                    "net_result": float(s.net_result),
                    "aging_0_30": float(s.aging_0_30),
                    "aging_31_60": float(s.aging_31_60),
                    "aging_61_90": float(s.aging_61_90),
                    "aging_over_90": float(s.aging_over_90),
                }
                for s in snapshots
            ]
            return {"data": rows, "total": total}

        documents, total = service.list_financial_documents(
            tenant_id=self.tenant_id, skip=skip, limit=limit
        )
        rows = [
            {
                "id": str(d.id),
                "document_type": d.document_type,
                "amount": float(d.amount),
                "status": d.status,
                "issued_at": d.issued_at.isoformat() if d.issued_at else None,
                "description": d.description,
            }
            for d in documents
        ]
        return {"data": rows, "total": len(rows)}

    # ─── Dashboard KPIs ──────────────────────────────────────────────────────

    def get_profit_loss(self, tenant_id: UUID, year: int, month: int) -> dict[str, Any]:
        """P&L for a given month from MonthlySnapshot (immutable record)."""
        from app.modules.finances.models import MonthlySnapshot

        snap = (
            self.db.query(MonthlySnapshot)
            .filter(
                MonthlySnapshot.tenant_id == tenant_id,
                MonthlySnapshot.year == year,
                MonthlySnapshot.month == month,
            )
            .first()
        )
        if snap is None:
            return {
                "year": year,
                "month": month,
                "total_income": 0.0,
                "total_expenses": 0.0,
                "net_result": 0.0,
            }
        return {
            "year": snap.year,
            "month": snap.month,
            "total_income": float(snap.total_income),
            "total_expenses": float(snap.total_expenses),
            "net_result": float(snap.net_result),
        }

    def get_cash_flow(self, tenant_id: UUID, year: int, months: int = 12) -> list[dict]:
        """Monthly cash flow for the last N months (aggregated in DB)."""
        from app.modules.finances.models import MonthlySnapshot

        rows = (
            self.db.query(MonthlySnapshot)
            .filter(
                MonthlySnapshot.tenant_id == tenant_id,
                MonthlySnapshot.year >= year - 1,
            )
            .order_by(MonthlySnapshot.year, MonthlySnapshot.month)
            .limit(months)
            .all()
        )
        return [
            {
                "period": f"{s.year}/{s.month:02d}",
                "income": float(s.total_income),
                "expenses": float(s.total_expenses),
                "net": float(s.net_result),
            }
            for s in rows
        ]

    def top_properties_by_revenue(self, tenant_id: UUID, limit: int = 5) -> list[dict]:
        """Top properties by total income from FinancialDocuments (aggregated in DB)."""
        from sqlalchemy import func

        from app.modules.finances.models import FinancialDocument

        rows = (
            self.db.query(
                FinancialDocument.entity_id,
                func.sum(FinancialDocument.amount).label("total_revenue"),
            )
            .filter(
                FinancialDocument.tenant_id == tenant_id,
                FinancialDocument.entity_type == "property",
                FinancialDocument.entity_id.isnot(None),
                FinancialDocument.document_type == "invoice",
            )
            .group_by(FinancialDocument.entity_id)
            .order_by(func.sum(FinancialDocument.amount).desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "property_id": str(r.entity_id),
                "total_revenue": float(r.total_revenue or 0),
            }
            for r in rows
        ]

    def get_columns(self) -> list[dict[str, str]]:
        return [
            {"name": "id", "label": "ID", "type": "uuid"},
            {"name": "document_type", "label": "Document Type", "type": "string"},
            {"name": "amount", "label": "Amount", "type": "decimal"},
            {"name": "status", "label": "Status", "type": "string"},
            {"name": "issued_at", "label": "Issued At", "type": "datetime"},
            {"name": "description", "label": "Description", "type": "string"},
        ]
