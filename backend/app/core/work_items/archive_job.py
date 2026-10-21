"""Archive job — move completed WorkItems older than 90 days to work_items_archive."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.db.session import SessionLocal
from app.core.work_items.models import WorkItem, WorkItemArchive

logger = logging.getLogger(__name__)

ARCHIVE_AFTER_DAYS = 90


def archive_completed_work_items() -> dict[str, int]:
    """Move WorkItems with completed_at older than ARCHIVE_AFTER_DAYS to work_items_archive.

    Returns:
        {"archived": N} — count of items moved.
    """
    cutoff = datetime.now(UTC) - timedelta(days=ARCHIVE_AFTER_DAYS)
    archived_count = 0

    with SessionLocal() as db:
        stmt = (
            select(WorkItem)
            .where(WorkItem.status == "completed")
            .where(WorkItem.completed_at <= cutoff)
        )
        items = list(db.scalars(stmt).all())

        for item in items:
            archive_row = WorkItemArchive(
                id=item.id,
                tenant_id=item.tenant_id,
                assignee_id=item.assignee_id,
                source_module=item.source_module,
                source_type=item.source_type,
                source_id=item.source_id,
                title=item.title,
                category=item.category,
                priority=item.priority,
                status=item.status,
                deep_link=item.deep_link,
                source_snapshot=item.source_snapshot,
                due_date=item.due_date,
                completed_at=item.completed_at,
                created_at=item.created_at,
                archived_at=datetime.now(UTC),
            )
            db.add(archive_row)
            db.delete(item)
            archived_count += 1

        db.commit()
        logger.info("archive_completed_work_items: archived %d items", archived_count)

    return {"archived": archived_count}
