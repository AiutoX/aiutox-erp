"""DigestJob — scheduled job that fires due digest capabilities and sends results to subscribers."""

from __future__ import annotations

import asyncio
import inspect
import logging
from calendar import monthrange
from datetime import UTC, datetime, timedelta
from typing import Any, cast
from uuid import UUID

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from app.core.automation.ai.capability_registry import capability_registry
from app.core.automation.ai.models import AIDigestSubscription
from app.core.db.session import SessionLocal
from app.core.notifications.service import NotificationService

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def compute_next_fire_at(current: datetime, schedule: str) -> datetime:
    if schedule == "daily":
        return current + timedelta(days=1)
    if schedule == "weekly":
        return current + timedelta(weeks=1)
    if schedule == "monthly":
        year = current.year
        month = current.month + 1
        if month > 12:
            month = 1
            year += 1
        max_day = monthrange(year, month)[1]
        day = min(current.day, max_day)
        return current.replace(year=year, month=month, day=day)
    return current + timedelta(days=1)


class DigestJob:
    async def run_due_digests(self, db: Session) -> tuple[int, int]:
        now = datetime.now(UTC)
        subs = (
            db.query(AIDigestSubscription)
            .filter(
                AIDigestSubscription.next_fire_at <= now,
                AIDigestSubscription.is_active == True,  # noqa: E712
            )
            .all()
        )

        fired = 0
        errors = 0

        for sub in subs:
            try:
                capability = capability_registry.by_qualified_name(sub.digest_name)
                if capability is None:
                    logger.warning(
                        "Digest capability %s not found, skipping", sub.digest_name
                    )
                    errors += 1
                    continue

                params: dict[str, Any] = (
                    sub.params if isinstance(sub.params, dict) else {}
                )
                result = capability.fn(db, **params)
                if inspect.isawaitable(result):
                    result = await result

                notification_svc = NotificationService(db)
                await notification_svc.send(
                    event_type="digest.sent",
                    recipient_id=cast(UUID, sub.user_id),
                    channels=cast(list[str], sub.channels),
                    data=result if isinstance(result, dict) else {"result": result},
                    tenant_id=cast(UUID, sub.tenant_id),
                )

                sub.last_fired_at = datetime.now(UTC)
                sub.next_fire_at = compute_next_fire_at(sub.next_fire_at, sub.schedule)
                db.commit()
                fired += 1

            except Exception:
                logger.exception(
                    "Digest subscription %s (%s) failed", sub.id, sub.digest_name
                )
                errors += 1
                try:
                    db.rollback()
                except Exception:
                    logger.error("Rollback failed for subscription %s", sub.id)

        logger.info("DigestJob complete: %d fired, %d errors", fired, errors)
        return fired, errors


def _digest_job_sync() -> None:
    db: Session | None = None
    try:
        db = SessionLocal()
        job = DigestJob()
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(job.run_due_digests(db))
        finally:
            loop.close()
    except Exception:
        logger.exception("DigestJob cron tick failed")
        if db is not None:
            try:
                db.rollback()
            except Exception:
                logger.error("DigestJob rollback failed")
    finally:
        if db is not None:
            db.close()


def start_digest_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        logger.warning("Digest scheduler already running")
        return

    _scheduler = BackgroundScheduler(job_defaults={"max_instances": 1})
    _scheduler.add_job(
        _digest_job_sync,
        trigger=CronTrigger.from_crontab("*/15 * * * *"),
        id="digest_job",
        name="Fire due digest subscriptions",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Digest scheduler started (cron=*/15 * * * *)")


def stop_digest_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Digest scheduler stopped")
    _scheduler = None
