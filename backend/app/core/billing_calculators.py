"""PayerProfileCalculator — Assess payer risk based on payment history.

Calculates real-time payment behavior metrics:
  - On-time payment rate
  - Average days late
  - Risk level (low/medium/high)

NOT STORED — calculated on-demand for each query.
"""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.logging import get_logger

logger = get_logger(__name__)

try:
    from app.modules.billing.models import Charge, ChargeStatus

    _billing_available = True
except ImportError:
    Charge = None  # type: ignore[assignment,misc]
    ChargeStatus = None  # type: ignore[assignment,misc]
    _billing_available = False


class PayerProfileCalculator:
    """Assess payer creditworthiness in real-time."""

    @staticmethod
    def calculate(
        db: Session,
        tenant_id: UUID,
        entity_id: UUID,
        entity_type: str = "lease",
    ) -> dict:
        """Calculate a payer profile based on payment history.

        Args:
            db: Database session
            tenant_id: Tenant ID
            entity_id: Entity ID (e.g., lease ID)
            entity_type: Entity type string (e.g., "lease")

        Returns:
            Dict with payment metrics and risk assessment
        """
        if not _billing_available:
            return {
                "total_charges": 0,
                "on_time_rate": 0.0,
                "avg_days_late": 0,
                "risk_level": "unknown",
            }

        # Get all charges for this entity
        charges = (
            db.query(Charge)
            .filter(
                Charge.tenant_id == tenant_id,
                Charge.entity_id == entity_id,
                Charge.entity_type == entity_type,
            )
            .all()
        )

        if not charges:
            return PayerProfileCalculator._empty_profile(entity_id, entity_type)

        # Analyze payment behavior
        paid_charges = [c for c in charges if c.status == ChargeStatus.PAID]
        overdue_charges = [
            c
            for c in charges
            if c.status
            in (ChargeStatus.PENDING, ChargeStatus.PARTIAL, ChargeStatus.OVERDUE)
            and c.due_date
        ]

        total_charges = len(charges)
        paid_count = len(paid_charges)
        overdue_count = len(overdue_charges)

        # Calculate on-time payment rate
        if paid_count == 0:
            on_time_rate = 0.0
            avg_days_late = 0.0
        else:
            on_time_rate = paid_count / total_charges

            # Estimate average days late (based on current overdue charges)
            if overdue_charges:
                today = datetime.now(UTC).date()
                days_late_list = []
                for charge in overdue_charges:
                    if charge.due_date:
                        due = (
                            charge.due_date.date()
                            if hasattr(charge.due_date, "date")
                            else charge.due_date
                        )
                        if due < today:
                            days_late_list.append((today - due).days)
                avg_days_late = (
                    sum(days_late_list) / len(days_late_list) if days_late_list else 0.0
                )
            else:
                avg_days_late = 0.0

        # Determine risk level
        if on_time_rate >= 0.95:
            risk_level = "low"
        elif on_time_rate >= 0.80:
            risk_level = "medium"
        elif on_time_rate >= 0.50:
            risk_level = "high"
        else:
            risk_level = "very_high"

        # Calculate total outstanding
        outstanding = Decimal("0.00")
        for charge in overdue_charges:
            outstanding += Decimal(str(charge.amount))

        return {
            "entity_id": str(entity_id),
            "entity_type": entity_type,
            "total_charges": total_charges,
            "paid_charges": paid_count,
            "overdue_charges": overdue_count,
            "on_time_rate": round(on_time_rate, 4),
            "avg_days_late": round(avg_days_late, 1),
            "outstanding_amount": float(outstanding),
            "outstanding_decimal": str(outstanding),
            "risk_level": risk_level,
            "last_charge_date": (
                max(c.created_at for c in charges).isoformat() if charges else None
            ),
        }

    @staticmethod
    def _empty_profile(entity_id: UUID, entity_type: str) -> dict:
        """Return default profile when no history exists."""
        return {
            "entity_id": str(entity_id),
            "entity_type": entity_type,
            "total_charges": 0,
            "paid_charges": 0,
            "overdue_charges": 0,
            "on_time_rate": 1.0,  # Unknown = assume best case
            "avg_days_late": 0.0,
            "outstanding_amount": 0.0,
            "outstanding_decimal": "0.00",
            "risk_level": "unknown",
            "last_charge_date": None,
        }

    @staticmethod
    def is_high_risk(profile: dict) -> bool:
        """Quick check if payer is high risk."""
        return profile["risk_level"] in ("high", "very_high")

    @staticmethod
    def is_delinquent(profile: dict, threshold_days: int = 60) -> bool:
        """Check if payer is delinquent beyond threshold."""
        return profile["avg_days_late"] > threshold_days
