"""Core facade for billing operations."""

from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session


class CoreBillingService:
    """Infrastructure facade that delegates billing actions at runtime."""

    def __init__(self, db: Session):
        self.db = db

    async def create_charge(
        self,
        tenant_id: UUID,
        amount: Decimal,
        description: str | None = None,
        currency: str = "COP",
        due_date=None,
        entity_type: str | None = None,
        entity_id: UUID | None = None,
        notes: str | None = None,
        metadata: dict | None = None,
    ):
        """Create a billing charge through the billing module service."""
        try:
            from app.modules.billing.service import BillingService
        except ImportError:
            raise RuntimeError("Billing module is not available")

        billing_service = BillingService(self.db)
        return await billing_service.create_charge(
            tenant_id=tenant_id,
            amount=amount,
            description=description,
            currency=currency,
            due_date=due_date,
            entity_type=entity_type,
            entity_id=entity_id,
            notes=notes,
            metadata=metadata,
        )
