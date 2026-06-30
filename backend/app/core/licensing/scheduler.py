"""License expiration notification scheduler — P10-T11.

Daily job: find licenses expiring in 30, 7, or 1 days and emit
a notification event. The actual delivery (email/in-app) is handled
by the notifications module via PubSub.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.licensing.models import TenantLicense

logger = logging.getLogger(__name__)

_NOTIFY_DAYS = [30, 7, 1]


def check_license_expirations(db: Session) -> list[dict]:
    """Scan for licenses expiring within notification windows.

    Returns list of records that had notifications dispatched.
    """
    now = datetime.now(UTC)
    notified: list[dict] = []

    for days in _NOTIFY_DAYS:
        window_start = now + timedelta(days=days - 1)
        window_end = now + timedelta(days=days)

        expiring = (
            db.query(TenantLicense)
            .filter(
                TenantLicense.revoked_at.is_(None),
                TenantLicense.expires_at >= window_start,
                TenantLicense.expires_at < window_end,
            )
            .all()
        )

        for record in expiring:
            try:
                _dispatch_expiry_notification(record, days)
                notified.append(
                    {
                        "license_jti": record.license_jti,
                        "tenant_id": str(record.tenant_id),
                        "days_remaining": days,
                    }
                )
            except Exception as e:
                logger.warning(
                    "Failed to dispatch expiry notification for %s: %s",
                    record.license_jti,
                    e,
                )

    return notified


def _dispatch_expiry_notification(record: TenantLicense, days_remaining: int) -> None:
    """Emit a license expiration event to the PubSub bus."""
    try:
        from app.core.pubsub import get_event_publisher
        from app.core.pubsub.event_helpers import safe_publish_event

        publisher = get_event_publisher()
        safe_publish_event(
            event_publisher=publisher,
            event_type="license.expiring_soon",
            entity_type="tenant_license",
            entity_id=record.license_jti,
            tenant_id=record.tenant_id,
            metadata={
                "days_remaining": days_remaining,
                "expires_at": record.expires_at.isoformat(),
            },
        )
    except Exception as e:
        logger.debug("PubSub dispatch skipped (not configured): %s", e)
        logger.info(
            "LICENSE_EXPIRY_NOTICE tenant=%s jti=%s days=%d",
            record.tenant_id,
            record.license_jti,
            days_remaining,
        )
