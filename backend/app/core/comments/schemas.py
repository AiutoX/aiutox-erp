"""Comments module schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    """Create comment request."""

    entity_type: str = Field(..., min_length=1)
    entity_id: UUID
    content: str = Field(..., min_length=1)
    parent_id: UUID | None = None
    metadata: dict[str, Any] | None = None


class CommentUpdate(BaseModel):
    """Update comment request."""

    content: str = Field(..., min_length=1)
    metadata: dict[str, Any] | None = None


class CommentMentionResponse(BaseModel):
    """Comment mention response."""

    id: UUID
    comment_id: UUID
    mentioned_user_id: UUID
    notification_sent: bool


class CommentAttachmentResponse(BaseModel):
    """Comment attachment response."""

    id: UUID
    comment_id: UUID
    file_id: UUID


class CommentResponse(BaseModel):
    """Comment response."""

    id: UUID
    tenant_id: UUID
    entity_type: str
    entity_id: UUID
    content: str
    parent_id: UUID | None = None
    created_by: UUID | None = None
    is_edited: bool = False
    is_deleted: bool = False
    metadata: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
    edited_at: datetime | None = None
    deleted_at: datetime | None = None
    mentions: list[CommentMentionResponse] = []
    attachments: list[CommentAttachmentResponse] = []


class CommentThreadResponse(BaseModel):
    """Comment thread response (comment with replies)."""

    comment: CommentResponse
    replies: list["CommentThreadResponse"] = []


CommentThreadResponse.model_rebuild()


class CommentListResponse(BaseModel):
    """Comment list response."""

    items: list[CommentResponse]
    total: int
    skip: int
    limit: int
