"""AgentTimeoutJob — cancels agent runs stuck in awaiting_confirmation for over 48 hours."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from app.core.automation.ai.models import AIAgentRun
from app.core.db.session import SessionLocal

logger = logging.getLogger(__name__)

TIMEOUT_HOURS = 48

_scheduler: BackgroundScheduler | None = None


class AgentTimeoutJob:
    def run(self, db: Session) -> tuple[int, int]:
        cutoff = datetime.now(UTC) - timedelta(hours=TIMEOUT_HOURS)

        stale_runs = (
            db.query(AIAgentRun)
            .filter(
                AIAgentRun.status == "awaiting_confirmation",
                AIAgentRun.started_at < cutoff,
            )
            .all()
        )

        cancelled = 0
        errors = 0

        for run in stale_runs:
            try:
                run.status = "cancelled"
                run.result_summary = "Cancelled: timed out waiting for confirmation"
                run.completed_at = datetime.now(UTC)
                db.commit()
                cancelled += 1
                logger.info(
                    "Auto-cancelled stale agent run %s (tenant=%s)",
                    run.id,
                    run.tenant_id,
                )
            except Exception:
                logger.exception(
                    "Failed to cancel agent run %s (tenant=%s)",
                    run.id,
                    run.tenant_id,
                )
                errors += 1
                try:
                    db.rollback()
                except Exception:
                    logger.error("Rollback failed for agent run %s", run.id)

        if stale_runs:
            logger.info(
                "AgentTimeoutJob complete: %d cancelled, %d errors",
                cancelled,
                errors,
            )
        return cancelled, errors


def _agent_timeout_job_sync() -> None:
    db: Session | None = None
    try:
        db = SessionLocal()
        job = AgentTimeoutJob()
        job.run(db)
    except Exception:
        logger.exception("AgentTimeoutJob cron tick failed")
        if db is not None:
            try:
                db.rollback()
            except Exception:
                logger.error("AgentTimeoutJob rollback failed")
    finally:
        if db is not None:
            db.close()


def start_agent_timeout_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        logger.warning("Agent timeout scheduler already running")
        return

    _scheduler = BackgroundScheduler(job_defaults={"max_instances": 1})
    _scheduler.add_job(
        _agent_timeout_job_sync,
        trigger=CronTrigger.from_crontab("0 * * * *"),
        id="agent_timeout_job",
        name="Cancel stale agent runs",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Agent timeout scheduler started (cron=0 * * * *)")


def stop_agent_timeout_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Agent timeout scheduler stopped")
    _scheduler = None
