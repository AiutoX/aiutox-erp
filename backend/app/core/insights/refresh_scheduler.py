"""Insights refresh scheduler — runs REFRESH MATERIALIZED VIEW every 5 minutes."""

from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.db.session import SessionLocal
from app.core.insights.service import InsightsService

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _refresh_job() -> None:
    """APScheduler job: refresh all insights MVs in a fresh DB session."""
    with SessionLocal() as db:
        svc = InsightsService(db)
        svc.refresh_all_views()


def start_insights_scheduler() -> None:
    """Start the background scheduler. Call from FastAPI lifespan startup."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        logger.warning("Insights scheduler already running — skipping start")
        return

    _scheduler = BackgroundScheduler(job_defaults={"max_instances": 1})
    _scheduler.add_job(
        _refresh_job,
        trigger=IntervalTrigger(minutes=5),
        id="insights_refresh",
        name="Refresh insights materialized views",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Insights scheduler started (interval=5min)")


def stop_insights_scheduler() -> None:
    """Stop the background scheduler. Call from FastAPI lifespan shutdown."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Insights scheduler stopped")
    _scheduler = None
