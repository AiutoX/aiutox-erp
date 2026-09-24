"""Pydantic schemas for the calendar module."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ─── Calendar Schemas ──────────────────────────────────────────────────────────


class CalendarBase(BaseModel):
    """Base schema for Calendar."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)
    calendar_type: str = Field("personal", description="personal, organization, shared")
    is_public: bool = False
    is_default: bool = False
    color: str | None = Field(None, max_length=20)
    timezone: str = Field("America/Bogota", max_length=100)
    metadata: dict[str, Any] | None = None


class CalendarCreate(CalendarBase):
    """Schema for creating a Calendar."""

    tenant_id: UUID
    owner_id: UUID | None = None
    org_id: UUID | None = None


class CalendarUpdate(BaseModel):
    """Schema for updating a Calendar (all fields optional)."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_public: bool | None = None
    color: str | None = None
    timezone: str | None = None
    metadata: dict[str, Any] | None = None


class CalendarResponse(CalendarBase):
    """Schema for reading a Calendar."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    owner_id: UUID | None = None
    org_id: UUID | None = None
    created_at: datetime
    updated_at: datetime


# ─── CalendarEvent Schemas ─────────────────────────────────────────────────────


class CalendarEventBase(BaseModel):
    """Base schema for CalendarEvent."""

    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    location: str | None = Field(None, max_length=500)
    start_time: datetime
    end_time: datetime
    timezone: str = Field("America/Bogota", max_length=100)
    all_day: bool = False
    status: str = Field("confirmed", description="confirmed, tentative, cancelled")
    recurrence_rule: str | None = None
    source_type: str | None = Field(
        None, max_length=50, description="task, approval, etc."
    )
    source_id: UUID | None = None
    metadata: dict[str, Any] | None = None


class CalendarEventCreate(CalendarEventBase):
    """Schema for creating a CalendarEvent."""

    calendar_id: UUID
    tenant_id: UUID
    organizer_id: UUID | None = None


class CalendarEventUpdate(BaseModel):
    """Schema for updating a CalendarEvent (all fields optional)."""

    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    location: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    all_day: bool | None = None
    status: str | None = None
    recurrence_rule: str | None = None
    metadata: dict[str, Any] | None = None


class CalendarEventResponse(CalendarEventBase):
    """Schema for reading a CalendarEvent."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    calendar_id: UUID
    tenant_id: UUID
    organizer_id: UUID | None = None
    created_at: datetime
    updated_at: datetime


# ─── EventAttendee Schemas ─────────────────────────────────────────────────────


class EventAttendeeCreate(BaseModel):
    """Schema for adding an attendee to an event."""

    user_id: UUID
    response_status: str = Field(
        "pending", description="pending, accepted, declined, tentative"
    )
    comment: str | None = None


class EventAttendeeResponse(BaseModel):
    """Schema for reading an EventAttendee."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    user_id: UUID
    response_status: str
    response_at: datetime | None = None
    comment: str | None = None


# ─── EventReminder Schemas ─────────────────────────────────────────────────────


class EventReminderCreate(BaseModel):
    """Schema for creating an EventReminder."""

    reminder_type: str = Field("in_app", description="email, in_app, push")
    minutes_before: int = Field(15, ge=1, le=10080)


class EventReminderResponse(BaseModel):
    """Schema for reading an EventReminder."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    reminder_type: str
    minutes_before: int
    is_sent: bool = False
    sent_at: datetime | None = None


# ─── List Schemas ──────────────────────────────────────────────────────────────


class CalendarListResponse(BaseModel):
    """Paginated calendar list."""

    items: list[CalendarResponse]
    total: int
    page: int = 1
    page_size: int = 20


class CalendarEventListResponse(BaseModel):
    """Paginated calendar event list."""

    items: list[CalendarEventResponse]
    total: int
    page: int = 1
    page_size: int = 50
