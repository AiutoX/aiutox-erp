"""Grace period scheduler — DoD#10.

Sends reminder notifications at t+7, t+30, and t+60 days after an
uninstall_request, so tenant admins have time to export data before the
90-day deadline.

Design: pure-Python, no Celery. Uses FastAPI BackgroundTasks to enqueue
the initial check, then APScheduler (if available) or a simple asyncio
loop for recurring checks. Falls back to a no-op if no scheduler is
configured (Plan C adds APScheduler).

The scheduler is started from main.py startup event.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.core.db.session import SessionLocal
from app.core.pubsub import EventMetadata, get_event_publisher
from app.core.tenant_modules.models import TenantModule, TenantModuleState

logger = logging.getLogger(__name__)

# Days after uninstall_request at which reminder events are published.
REMINDER_DAYS = [7, 30, 60]

# Key stored in metadata_json to track which reminders have been sent.
_REMINDERS_SENT_KEY = "grace_reminders_sent"


def _utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


# ── per-request reminder scheduling ──────────────────────────────────────────


async def schedule_grace_period_reminders(
    tenant_id: UUID,
    module_id: str,
    grace_deadline: datetime,
) -> None:
    """Publish reminder events for a module entering grace period.

    Called as a BackgroundTask from the uninstall_request endpoint so it
    doesn't block the HTTP response.

    Events published:
      core.module.grace_period_reminder  (day 7, 30, 60)

    Each event carries days_remaining so consumers can format the message.
    """
    publisher = get_event_publisher()
    now = _utcnow()
    total_days = (grace_deadline - now).days

    with SessionLocal() as db:
        tm = (
            db.query(TenantModule)
            .filter_by(tenant_id=tenant_id, module=module_id)
            .first()
        )
        if not tm:
            return

        sent: list[int] = (tm.metadata_json or {}).get(_REMINDERS_SENT_KEY, [])

        for day in REMINDER_DAYS:
            if day in sent:
                continue  # already scheduled / sent

            days_remaining = total_days - day
            if days_remaining < 0:
                continue  # past the reminder window

            try:
                await publisher.publish(
                    event_type="core.module.grace_period_reminder",
                    entity_type="module",
                    entity_id=tm.id,
                    tenant_id=tenant_id,
                    metadata=EventMetadata(
                        source="grace_period_scheduler",
                        additional_data={
                            "module": module_id,
                            "day": day,
                            "days_remaining": days_remaining,
                            "grace_deadline": grace_deadline.isoformat(),
                        },
                    ),
                )
                sent.append(day)
                logger.info(
                    "Grace period reminder published: module=%s day=%s days_remaining=%s",
                    module_id,
                    day,
                    days_remaining,
                )
            except Exception as exc:
                logger.warning(
                    "Failed to publish grace reminder day=%s module=%s: %s",
                    day,
                    module_id,
                    exc,
                )

        # Persist which reminders were scheduled
        tm.metadata_json = {**(tm.metadata_json or {}), _REMINDERS_SENT_KEY: sent}
        db.commit()


# ── periodic sweep (called from startup) ─────────────────────────────────────


async def sweep_grace_period_reminders() -> None:
    """Scan all modules in grace_period and publish due reminders.

    Intended to be called once on startup and then every 24 h via the
    application lifespan event or a lightweight asyncio task.

    A reminder is "due" when:
      (grace_deadline - now).days  <=  (GRACE_PERIOD_DAYS - day)
      i.e. the module has been in grace for >= day days.
    """
    now = _utcnow()

    with SessionLocal() as db:
        modules_in_grace = (
            db.query(TenantModule)
            .filter(TenantModule.state == TenantModuleState.GRACE_PERIOD)
            .filter(TenantModule.grace_deadline.isnot(None))
            .all()
        )

    publisher = get_event_publisher()

    for tm in modules_in_grace:
        if tm.grace_deadline is None:
            continue

        deadline = tm.grace_deadline
        elapsed_days = (now - (deadline - timedelta(days=90))).days
        sent: list[int] = (tm.metadata_json or {}).get(_REMINDERS_SENT_KEY, [])
        newly_sent: list[int] = list(sent)

        for day in REMINDER_DAYS:
            if day in sent:
                continue
            if elapsed_days < day:
                continue  # not yet time

            days_remaining = (deadline - now).days

            try:
                await publisher.publish(
                    event_type="core.module.grace_period_reminder",
                    entity_type="module",
                    entity_id=tm.id,
                    tenant_id=tm.tenant_id,
                    metadata=EventMetadata(
                        source="grace_period_scheduler",
                        additional_data={
                            "module": tm.module,
                            "day": day,
                            "days_remaining": days_remaining,
                            "grace_deadline": deadline.isoformat(),
                        },
                    ),
                )
                newly_sent.append(day)
                logger.info(
                    "Sweep: grace reminder published module=%s day=%s",
                    tm.module,
                    day,
                )
            except Exception as exc:
                logger.warning(
                    "Sweep: failed to publish grace reminder module=%s day=%s: %s",
                    tm.module,
                    day,
                    exc,
                )

        if newly_sent != sent:
            with SessionLocal() as db:
                fresh = (
                    db.query(TenantModule)
                    .filter_by(tenant_id=tm.tenant_id, module=tm.module)
                    .first()
                )
                if fresh:
                    fresh.metadata_json = {
                        **(fresh.metadata_json or {}),
                        _REMINDERS_SENT_KEY: newly_sent,
                    }
                    db.commit()


# ── background loop ───────────────────────────────────────────────────────────

_SWEEP_INTERVAL_HOURS = 24
_sweep_task: asyncio.Task | None = None


async def _sweep_loop() -> None:
    while True:
        try:
            await sweep_grace_period_reminders()
        except Exception as exc:
            logger.error("Grace period sweep failed: %s", exc)
        await asyncio.sleep(_SWEEP_INTERVAL_HOURS * 3600)


def start_grace_period_scheduler() -> None:
    """Start the background sweep loop (call from app startup)."""
    global _sweep_task
    if _sweep_task is None or _sweep_task.done():
        _sweep_task = asyncio.ensure_future(_sweep_loop())
        logger.info(
            "Grace period scheduler started (sweep every %sh)", _SWEEP_INTERVAL_HOURS
        )


def stop_grace_period_scheduler() -> None:
    """Stop the background sweep loop (call from app shutdown)."""
    global _sweep_task
    if _sweep_task and not _sweep_task.done():
        _sweep_task.cancel()
        _sweep_task = None
        logger.info("Grace period scheduler stopped")
