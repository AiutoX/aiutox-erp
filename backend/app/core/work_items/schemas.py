"""WorkItem Pydantic v2 schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator


class WorkItemCategory(StrEnum):
    work = "work"
    personal = "personal"
    collab = "collab"


class WorkItemPriority(StrEnum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class WorkItemStatus(StrEnum):
    pending = "pending"
    in_progress = "in_progress"
    snoozed = "snoozed"
    completed = "completed"
    archived = "archived"


class WorkItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    assignee_id: uuid.UUID
    source_module: str
    source_type: str
    source_id: str
    title: str
    description: str | None = None
    category: str
    priority: str
    status: str
    deep_link: str | None = None
    source_snapshot: dict[str, Any] | None = None
    due_date: datetime | None = None
    snoozed_until: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class SnoozeRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    until: datetime

    @field_validator("until")
    @classmethod
    def until_must_be_future(cls, v: datetime) -> datetime:
        from datetime import UTC

        if v.tzinfo is None:
            raise ValueError("until must be timezone-aware")
        if v <= datetime.now(UTC):
            raise ValueError("until must be in the future")
        return v
