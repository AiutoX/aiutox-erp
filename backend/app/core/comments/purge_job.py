"""CommentPurgeJob -- hard-deletes soft-deleted comments older than each
tenant's configured retention window (CMT-010).

Mirrors the established scheduled-job pattern in
app/core/automation/ai/conversation_cleanup_job.py (APScheduler
BackgroundScheduler + IntervalTrigger). Soft-delete (RULE-005) stays the
correct choice for thread integrity/audit — this job only prevents the
comments/comment_mentions/comment_attachments tables from growing forever
with rows nobody can see anymore.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from app.core.comments.models import Comment
from app.core.config.service import ConfigService
from app.core.db.session import SessionLocal
from app.core.tenants.models import Tenant

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None

DEFAULT_PURGE_AFTER_DAYS = 90


class CommentPurgeJob:
    def run(self, db: Session) -> int:
        config_service = ConfigService(db)
        total_purged = 0

        for tenant in db.query(Tenant).all():
            tenant_id = UUID(str(tenant.id))
            purge_after_days = config_service.get(
                tenant_id,
                "comments",
                "purge_after_days",
                default=DEFAULT_PURGE_AFTER_DAYS,
            )
            if not purge_after_days or purge_after_days <= 0:
                continue

            cutoff = datetime.now(UTC) - timedelta(days=purge_after_days)
            # comment_mentions/comment_attachments cascade via their FK's
            # ondelete="CASCADE" — this DELETE is the first real hard-delete
            # these soft-deleted rows ever get (see models.py).
            purged = (
                db.query(Comment)
                .filter(
                    Comment.tenant_id == tenant_id,
                    Comment.is_deleted.is_(True),
                    Comment.deleted_at < cutoff,
                )
                .delete(synchronize_session=False)
            )
            total_purged += purged

        if total_purged:
            db.commit()
            logger.info("CommentPurgeJob: purged=%d", total_purged)

        return total_purged


def _comment_purge_sync() -> None:
    db: Session | None = None
    try:
        db = SessionLocal()
        job = CommentPurgeJob()
        job.run(db)
    except Exception:
        logger.exception("CommentPurgeJob tick failed")
        if db is not None:
            try:
                db.rollback()
            except Exception:
                logger.error("CommentPurgeJob rollback failed")
    finally:
        if db is not None:
            db.close()


def start_comment_purge_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        logger.warning("Comment purge scheduler already running")
        return

    _scheduler = BackgroundScheduler(job_defaults={"max_instances": 1})
    _scheduler.add_job(
        _comment_purge_sync,
        trigger=IntervalTrigger(hours=24),
        id="comment_purge_job",
        name="Purge soft-deleted comments past retention",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Comment purge scheduler started (interval=24h)")


def stop_comment_purge_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Comment purge scheduler stopped")
    _scheduler = None
