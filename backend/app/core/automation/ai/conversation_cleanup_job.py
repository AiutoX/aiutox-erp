"""ConversationCleanupJob -- auto-archives inactive and purges soft-deleted conversations."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from app.core.automation.ai.models import AIConfig, AIConversation
from app.core.db.session import SessionLocal

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


class ConversationCleanupJob:
    def run(self, db: Session) -> tuple[int, int]:
        configs = db.query(AIConfig).all()
        total_archived = 0
        total_purged = 0

        for config in configs:
            if config.auto_archive_after_days and config.auto_archive_after_days > 0:
                cutoff = datetime.now(UTC) - timedelta(
                    days=config.auto_archive_after_days
                )
                archived = (
                    db.query(AIConversation)
                    .filter(
                        AIConversation.tenant_id == config.tenant_id,
                        AIConversation.status == "active",
                        AIConversation.updated_at < cutoff,
                    )
                    .update(
                        {
                            AIConversation.status: "archived",
                            AIConversation.archived_at: datetime.now(UTC),
                        },
                        synchronize_session=False,
                    )
                )
                total_archived += archived

            if config.hard_delete_after_days and config.hard_delete_after_days > 0:
                cutoff = datetime.now(UTC) - timedelta(
                    days=config.hard_delete_after_days
                )
                purged = (
                    db.query(AIConversation)
                    .filter(
                        AIConversation.tenant_id == config.tenant_id,
                        AIConversation.status == "deleted",
                        AIConversation.deleted_at < cutoff,
                    )
                    .delete(synchronize_session=False)
                )
                total_purged += purged

        if total_archived or total_purged:
            db.commit()
            logger.info(
                "ConversationCleanup: archived=%d, purged=%d",
                total_archived,
                total_purged,
            )

        return total_archived, total_purged


def _conversation_cleanup_sync() -> None:
    db: Session | None = None
    try:
        db = SessionLocal()
        job = ConversationCleanupJob()
        job.run(db)
    except Exception:
        logger.exception("ConversationCleanupJob tick failed")
        if db is not None:
            try:
                db.rollback()
            except Exception:
                logger.error("ConversationCleanupJob rollback failed")
    finally:
        if db is not None:
            db.close()


def start_conversation_cleanup_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        logger.warning("Conversation cleanup scheduler already running")
        return

    _scheduler = BackgroundScheduler(job_defaults={"max_instances": 1})
    _scheduler.add_job(
        _conversation_cleanup_sync,
        trigger=IntervalTrigger(hours=6),
        id="conversation_cleanup_job",
        name="Auto-archive and purge conversations",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Conversation cleanup scheduler started (interval=6h)")


def stop_conversation_cleanup_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Conversation cleanup scheduler stopped")
    _scheduler = None
