"""DigestSubscriptionService -- CRUD for user digest subscriptions."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.automation.ai.capability_decorator import CapabilityDescriptor
from app.core.automation.ai.capability_registry import capability_registry
from app.core.automation.ai.capability_resolver import capability_resolver
from app.core.automation.ai.models import AIDigestSubscription
from app.core.exceptions import APIException


def compute_initial_fire_at(schedule: str) -> datetime:
    now = datetime.now(UTC)
    if schedule == "daily":
        return datetime(now.year, now.month, now.day, 9, 0, 0, tzinfo=UTC) + timedelta(
            days=1
        )
    if schedule == "weekly":
        days_until_monday = (7 - now.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        target = now + timedelta(days=days_until_monday)
        return datetime(target.year, target.month, target.day, 9, 0, 0, tzinfo=UTC)
    if schedule == "monthly":
        year = now.year
        month = now.month + 1
        if month > 12:
            month = 1
            year += 1
        return datetime(year, month, 1, 9, 0, 0, tzinfo=UTC)
    return datetime(now.year, now.month, now.day, 9, 0, 0, tzinfo=UTC) + timedelta(
        days=1
    )


class DigestSubscriptionService:
    def list_available(self, user_permissions: set[str]) -> list[CapabilityDescriptor]:
        all_caps = capability_registry.all_active()
        digest_caps = [c for c in all_caps if c.capability_type == "digest"]
        return capability_resolver.filter(
            digest_caps, user_permissions, max_candidates=100
        )

    def subscribe(
        self,
        db: Session,
        tenant_id: UUID,
        user_id: UUID,
        digest_name: str,
        schedule: str,
        channels: list[str],
    ) -> AIDigestSubscription:
        cap = capability_registry.by_qualified_name(digest_name)
        if cap is None:
            raise APIException(
                code="DIGEST_CAPABILITY_NOT_FOUND",
                message=f"Digest capability '{digest_name}' not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        if cap.capability_type != "digest":
            raise APIException(
                code="DIGEST_CAPABILITY_NOT_DIGEST",
                message=f"Capability '{digest_name}' is not a digest",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        next_fire = compute_initial_fire_at(schedule)
        sub = AIDigestSubscription(
            tenant_id=tenant_id,
            user_id=user_id,
            digest_name=digest_name,
            schedule=schedule,
            channels=channels,
            next_fire_at=next_fire,
        )
        db.add(sub)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            raise APIException(
                code="DIGEST_ALREADY_SUBSCRIBED",
                message="Already subscribed to this digest",
                status_code=status.HTTP_409_CONFLICT,
            )
        return sub

    def unsubscribe(
        self,
        db: Session,
        tenant_id: UUID,
        user_id: UUID,
        subscription_id: UUID,
    ) -> AIDigestSubscription:
        sub = (
            db.query(AIDigestSubscription)
            .filter(
                AIDigestSubscription.id == subscription_id,
                AIDigestSubscription.tenant_id == tenant_id,
                AIDigestSubscription.user_id == user_id,
                AIDigestSubscription.is_active == True,  # noqa: E712
            )
            .first()
        )
        if sub is None:
            raise APIException(
                code="DIGEST_SUBSCRIPTION_NOT_FOUND",
                message="Subscription not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        sub.is_active = False
        db.flush()
        return sub

    def list_subscriptions(
        self,
        db: Session,
        tenant_id: UUID,
        user_id: UUID,
    ) -> list[AIDigestSubscription]:
        return (
            db.query(AIDigestSubscription)
            .filter(
                AIDigestSubscription.tenant_id == tenant_id,
                AIDigestSubscription.user_id == user_id,
                AIDigestSubscription.is_active == True,  # noqa: E712
            )
            .all()
        )
