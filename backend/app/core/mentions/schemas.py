"""Pydantic schemas for mention operations."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MentionCreate(BaseModel):
    """Schema for creating a mention."""

    user_id: UUID = Field(..., description="ID of the mentioned user")
    mencionable_type: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Type of entity being mentioned in",
    )
    mencionable_id: UUID = Field(..., description="ID of the entity being mentioned in")


class MentionResolve(BaseModel):
    """Schema for resolving a mention."""

    resolved: bool = Field(..., description="Whether the mention has been resolved")


class MentionRead(BaseModel):
    """Schema for reading a mention."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    mencionable_type: str
    mencionable_id: UUID
    tenant_id: UUID
    resolved: bool
    notification_sent: bool
    created_at: str
    resolved_at: str | None
    updated_at: str


class MentionNotification(BaseModel):
    """Schema for mention notification (integration with NotificationQueue)."""

    mention_id: UUID = Field(..., description="ID of the mention")
    user_id: UUID = Field(..., description="ID of the mentioned user")
    mencionable_type: str = Field(..., description="Type of entity being mentioned in")
    mencionable_id: UUID = Field(..., description="ID of the entity")
    created_by_id: UUID | None = Field(
        None, description="ID of the user who made the mention"
    )
    created_at: datetime = Field(..., description="When the mention was created")


class MentionsListResponse(BaseModel):
    """Response schema for mentions list operations."""

    mentions: list[MentionRead]
    total: int
    limit: int
    offset: int
