"""Threshold-crossing storage quota notifications.

No existing pattern in this codebase implements multi-tier (e.g. 50/75/90%)
usage warnings — this module is a fresh design, but delivery is routed
through the existing `NotificationService.send()` (same call shape already
used by `inventory.stock_low` / `task.assigned`), so recipients' own channel
preferences still govern where the notification actually lands.

Called after a successful Regime A (personal library) upload, once we know
the new usage totals.
"""

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.files.quota_service import QuotaService
from app.core.notifications.service import NotificationService

logger = logging.getLogger(__name__)


def _highest_crossed_threshold(
    usage_before: int, usage_after: int, quota: int, thresholds: list[int]
) -> int | None:
    """Return the highest threshold percentage newly crossed by this
    upload, or None if no configured threshold was crossed. "Newly crossed"
    means usage_before was under it and usage_after is at or over it — this
    keeps notifications one-shot per threshold rather than firing on every
    subsequent upload once already over a threshold.
    """
    if quota <= 0:
        return None
    pct_before = (usage_before / quota) * 100
    pct_after = (usage_after / quota) * 100

    crossed = [t for t in thresholds if pct_before < t <= pct_after]
    return max(crossed) if crossed else None


def _format_bytes(num_bytes: int) -> str:
    size = float(num_bytes)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} PB"


async def notify_user_quota_if_crossed(
    db: Session,
    user_id: UUID,
    tenant_id: UUID,
    usage_before_bytes: int,
    usage_after_bytes: int,
) -> None:
    """Notify the user themselves if their personal quota crossed a new
    configured warning threshold with this upload.
    """
    quota_service = QuotaService(db)
    quota = quota_service.get_user_quota_bytes(user_id, tenant_id)
    thresholds = quota_service.get_user_thresholds(user_id, tenant_id)

    crossed = _highest_crossed_threshold(
        usage_before_bytes, usage_after_bytes, quota, thresholds
    )
    if crossed is None:
        return

    notification_service = NotificationService(db)
    try:
        await notification_service.send(
            event_type="files.quota_warning_user",
            recipient_id=user_id,
            channels=["in-app", "email"],
            data={
                "porcentaje": crossed,
                "usado": _format_bytes(usage_after_bytes),
                "limite": _format_bytes(quota),
            },
            tenant_id=tenant_id,
        )
    except Exception as e:
        logger.warning(
            f"Failed to send personal quota warning to user {user_id} "
            f"(tenant {tenant_id}, threshold {crossed}%): {e}"
        )


async def notify_tenant_quota_if_crossed(
    db: Session,
    tenant_id: UUID,
    usage_before_bytes: int,
    usage_after_bytes: int,
) -> None:
    """Notify the tenant's `files.manage`-holders and its owner if the
    tenant-wide quota crossed a new configured warning threshold with this
    upload.
    """
    quota_service = QuotaService(db)
    quota = quota_service.get_tenant_quota_bytes(tenant_id)
    thresholds = quota_service.get_tenant_thresholds(tenant_id)

    crossed = _highest_crossed_threshold(
        usage_before_bytes, usage_after_bytes, quota, thresholds
    )
    if crossed is None:
        return

    recipients = _get_tenant_quota_alert_recipients(db, tenant_id)
    if not recipients:
        logger.warning(
            f"No owner/files-admin recipients found for tenant {tenant_id} "
            f"quota warning (threshold {crossed}%)"
        )
        return

    notification_service = NotificationService(db)
    data = {
        "porcentaje": crossed,
        "usado": _format_bytes(usage_after_bytes),
        "limite": _format_bytes(quota),
    }
    for recipient_id in recipients:
        try:
            await notification_service.send(
                event_type="files.quota_warning_tenant",
                recipient_id=recipient_id,
                channels=["in-app", "email"],
                data=data,
                tenant_id=tenant_id,
            )
        except Exception as e:
            logger.warning(
                f"Failed to send tenant quota warning to user {recipient_id} "
                f"(tenant {tenant_id}, threshold {crossed}%): {e}"
            )


def _get_tenant_quota_alert_recipients(db: Session, tenant_id: UUID) -> list[UUID]:
    """Users who should hear about the tenant-wide quota: the tenant's
    global `owner`-role holders, plus anyone with the `files` module's
    `manager` role (which grants `files.manage` per MODULE_ROLES).
    """
    from app.core.auth.models import ModuleRole
    from app.core.users.models import User, UserRole

    owner_ids = (
        db.query(UserRole.user_id)
        .join(User, User.id == UserRole.user_id)
        .filter(User.tenant_id == tenant_id, UserRole.role == "owner")
        .all()
    )
    files_admin_ids = (
        db.query(ModuleRole.user_id)
        .join(User, User.id == ModuleRole.user_id)
        .filter(
            User.tenant_id == tenant_id,
            ModuleRole.module == "files",
            ModuleRole.role_name == "manager",
        )
        .all()
    )
    return list({row[0] for row in (*owner_ids, *files_admin_ids)})
