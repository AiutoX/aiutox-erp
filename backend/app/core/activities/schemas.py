"""Activities module schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ActivityCreate(BaseModel):
    """Create activity request."""

    entity_type: str = Field(..., min_length=1)
    entity_id: UUID
    activity_type: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    metadata: dict[str, Any] | None = None


class ActivityUpdate(BaseModel):
    """Update activity request."""

    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    metadata: dict[str, Any] | None = None


class ActivityResponse(BaseModel):
    """Activity response."""

    id: UUID
    tenant_id: UUID
    entity_type: str
    entity_id: UUID
    activity_type: str
    title: str
    description: str | None = None
    user_id: UUID | None = None
    metadata: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class ActivityListResponse(BaseModel):
    """Activity list response."""

    items: list[ActivityResponse]
    total: int
    skip: int
    limit: int


class ActivitySearchRequest(BaseModel):
    """Activity search request."""

    query: str
    entity_type: str | None = None
    activity_type: str | None = None


class ActivitySearchResponse(BaseModel):
    """Activity search response."""

    items: list[ActivityResponse]
    total: int
    query: str
