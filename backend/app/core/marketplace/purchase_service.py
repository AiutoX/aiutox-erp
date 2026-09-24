"""PurchaseService — trial activation and module licensing."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import raise_conflict
from app.core.licensing.service import LicenseService
from app.core.marketplace.catalog import ModuleCatalogEntry
from app.core.marketplace.models import MarketplacePurchase
from app.core.marketplace.schemas import PurchaseResult

logger = logging.getLogger(__name__)

_TRIAL_DAYS = 14


class PurchaseService:
    """Handles module purchase and trial activation."""

    def __init__(
        self,
        db: Session,
        license_service: LicenseService | None = None,
    ) -> None:
        self._db = db
        self._license_service = license_service or LicenseService()

    def create_trial(
        self,
        tenant_id: UUID,
        user_id: UUID,
        entry: ModuleCatalogEntry,
        tier: str,
    ) -> PurchaseResult:
        """Create a 14-day trial license for a module.

        Raises APIException(409, TRIAL_ALREADY_USED) if tenant already trialled this module.
        """
        # Check for existing trial
        existing = (
            self._db.query(MarketplacePurchase)
            .filter_by(
                tenant_id=tenant_id,
                module_id=entry.module_id,
                plan_type="trial",
            )
            .first()
        )
        if existing:
            raise_conflict(
                "TRIAL_ALREADY_USED",
                f"Trial for module '{entry.module_id}' already used by this tenant",
            )

        expires_at = datetime.now(UTC) + timedelta(days=_TRIAL_DAYS)

        # Sign trial License JWT
        jwt_token = self._license_service.sign_token(
            tenant_id=str(tenant_id),
            modules={entry.module_id: tier},
            features=[],
            expires_in_days=_TRIAL_DAYS,
        )

        # Extract jti from token payload
        import jwt as pyjwt

        try:
            payload = pyjwt.decode(jwt_token, options={"verify_signature": False})
            jti = payload.get("jti", str(uuid.uuid4()))
        except Exception:
            jti = str(uuid.uuid4())

        purchase = MarketplacePurchase(
            tenant_id=tenant_id,
            module_id=entry.module_id,
            tier=tier,
            plan_type="trial",
            license_jti=jti,
            expires_at=expires_at,
            created_by=user_id,
        )

        try:
            self._db.add(purchase)
            self._db.flush()
        except IntegrityError:
            self._db.rollback()
            raise_conflict(
                "TRIAL_ALREADY_USED",
                f"Trial for module '{entry.module_id}' already used by this tenant",
            )

        result = PurchaseResult(
            module_id=entry.module_id,
            tier=tier,
            plan="trial",
            license_jwt=jwt_token,
            expires_at=expires_at,
            purchase_id=str(purchase.id),
        )

        # Emit marketplace.module.purchased event (fire-and-forget; failure does not abort purchase)
        self._emit_purchased_event(
            tenant_id=tenant_id,
            user_id=user_id,
            module_id=entry.module_id,
            tier=tier,
            license_jti=jti,
        )

        return result

    def _emit_purchased_event(
        self,
        tenant_id: UUID,
        user_id: UUID,
        module_id: str,
        tier: str,
        license_jti: str,
    ) -> None:
        """Publish marketplace.module.purchased to the event bus (best-effort)."""
        try:
            from app.core.pubsub import get_event_publisher
            from app.core.pubsub.event_helpers import safe_publish_event

            publisher = get_event_publisher()
            if publisher is None:
                return

            safe_publish_event(
                event_publisher=publisher,
                event_type="marketplace.module.purchased",
                entity_type="marketplace_purchase",
                entity_id=module_id,
                tenant_id=str(tenant_id),
                user_id=str(user_id),
                metadata={
                    "module_id": module_id,
                    "tier": tier,
                    "plan": "trial",
                    "purchased_by": str(user_id),
                    "license_jti": license_jti,
                },
            )
        except Exception as exc:
            logger.warning("Failed to emit marketplace.module.purchased event: %s", exc)
