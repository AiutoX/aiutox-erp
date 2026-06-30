"""WorkItemService — upsert, complete, snooze, get_today."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.exceptions import raise_not_found
from app.core.work_items.models import WorkItem


class WorkItemService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def upsert(
        self,
        *,
        tenant_id: uuid.UUID,
        source_module: str,
        source_type: str,
        source_id: str,
        assignee_id: uuid.UUID,
        title: str,
        category: str = "work",
        priority: str = "medium",
        status: str = "pending",
        deep_link: str | None = None,
        source_snapshot: dict[str, Any] | None = None,
        description: str | None = None,
        due_date: datetime | None = None,
    ) -> WorkItem:
        """Insert or update a WorkItem by natural key (tenant, source_module, source_type, source_id)."""
        now = datetime.now(UTC)
        stmt = (
            insert(WorkItem)
            .values(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                source_module=source_module,
                source_type=source_type,
                source_id=source_id,
                assignee_id=assignee_id,
                title=title,
                description=description,
                category=category,
                priority=priority,
                status=status,
                deep_link=deep_link,
                source_snapshot=source_snapshot,
                due_date=due_date,
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_update(
                constraint="uq_work_item_source",
                set_={
                    "assignee_id": assignee_id,
                    "title": title,
                    "description": description,
                    "category": category,
                    "priority": priority,
                    "status": status,
                    "deep_link": deep_link,
                    "source_snapshot": source_snapshot,
                    "due_date": due_date,
                    "updated_at": now,
                },
            )
            .returning(WorkItem)
        )
        result = self.db.execute(stmt)
        row = result.fetchone()
        if row is None:
            raise RuntimeError("upsert returned no row")
        return row[0]

    def complete(self, *, item_id: uuid.UUID, tenant_id: uuid.UUID) -> WorkItem:
        """Mark a WorkItem as completed."""
        item = self._get_or_raise(item_id, tenant_id)
        item.status = "completed"
        item.completed_at = datetime.now(UTC)
        return item

    def snooze(
        self, *, item_id: uuid.UUID, tenant_id: uuid.UUID, until: datetime
    ) -> WorkItem:
        """Snooze a WorkItem until the given datetime."""
        item = self._get_or_raise(item_id, tenant_id)
        item.status = "snoozed"
        item.snoozed_until = until
        return item

    def get_today(
        self,
        *,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        category: str | None = None,
    ) -> list[WorkItem]:
        """Return pending/in_progress WorkItems for a user due today or earlier."""
        tomorrow = datetime.now(UTC) + timedelta(days=1)
        q = (
            select(WorkItem)
            .where(WorkItem.tenant_id == tenant_id)
            .where(WorkItem.assignee_id == user_id)
            .where(WorkItem.status.in_(["pending", "in_progress"]))
            .where((WorkItem.due_date <= tomorrow) | (WorkItem.due_date.is_(None)))
            .order_by(WorkItem.due_date.asc().nulls_last(), WorkItem.priority.asc())
        )
        if category is not None:
            q = q.where(WorkItem.category == category)
        return list(self.db.scalars(q).all())

    def _get_or_raise(self, item_id: uuid.UUID, tenant_id: uuid.UUID) -> WorkItem:
        item = self.db.get(WorkItem, item_id)
        if item is None or item.tenant_id != tenant_id:
            raise_not_found("WorkItem", str(item_id))
        return item  # type: ignore[return-value]
