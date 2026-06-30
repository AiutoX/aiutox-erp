"""Canonical Calendar models — calendars, events, attendees, reminders, resources."""

from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import Boolean, Column, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.core.db.session import Base


class CalendarType(StrEnum):
    USER = "user"
    ORGANIZATION = "organization"
    SHARED = "shared"


class EventStatus(StrEnum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class AttendeeStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    TENTATIVE = "tentative"


class RecurrenceType(StrEnum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class ReminderType(StrEnum):
    EMAIL = "email"
    IN_APP = "in_app"
    PUSH = "push"


class ResourceType(StrEnum):
    ROOM = "room"
    EQUIPMENT = "equipment"
    USER = "user"


class Calendar(Base):
    __tablename__ = "calendars"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=True)
    calendar_type = Column(String(20), nullable=False, default=CalendarType.USER)
    owner_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    organization_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_public = Column(Boolean, default=False, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    meta_data = Column("metadata", JSONB, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
    events = relationship(
        "CalendarEvent", back_populates="calendar", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_calendars_tenant_owner", "tenant_id", "owner_id"),
        Index("idx_calendars_organization", "tenant_id", "organization_id"),
    )

    def __repr__(self) -> str:
        return f"<Calendar(id={self.id}, name={self.name}, type={self.calendar_type})>"


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    calendar_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("calendars.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(500), nullable=True)
    start_time = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    end_time = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    timezone = Column(String(50), nullable=True)
    all_day = Column(Boolean, default=False, nullable=False)
    status = Column(
        String(20), nullable=False, default=EventStatus.SCHEDULED, index=True
    )
    recurrence_type = Column(String(20), nullable=False, default=RecurrenceType.NONE)
    recurrence_end_date = Column(TIMESTAMP(timezone=True), nullable=True)
    recurrence_count = Column(Integer, nullable=True)
    recurrence_interval = Column(Integer, default=1, nullable=False)
    recurrence_days_of_week = Column(String(20), nullable=True)
    recurrence_day_of_month = Column(Integer, nullable=True)
    recurrence_month_of_year = Column(Integer, nullable=True)
    recurrence_rule = Column(Text, nullable=True)
    recurrence_exdates = Column(JSONB, nullable=True)
    source_type = Column(String(50), nullable=True, index=True)
    source_id = Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    provider = Column(String(50), nullable=True, index=True)
    external_id = Column(String(255), nullable=True, index=True)
    read_only = Column(Boolean, default=False, nullable=False)
    organizer_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    meta_data = Column("metadata", JSONB, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
    calendar = relationship("Calendar", back_populates="events")
    attendees = relationship(
        "EventAttendee", back_populates="event", cascade="all, delete-orphan"
    )
    reminders = relationship(
        "EventReminder", back_populates="event", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_events_calendar_time", "calendar_id", "start_time"),
        Index("idx_events_tenant_time", "tenant_id", "start_time", "end_time"),
        Index("idx_events_status", "tenant_id", "status"),
        Index("idx_events_source", "source_type", "source_id"),
        Index("idx_events_external", "provider", "external_id"),
    )

    def __repr__(self) -> str:
        return f"<CalendarEvent(id={self.id}, title={self.title}, start={self.start_time})>"


class EventAttendee(Base):
    __tablename__ = "event_attendees"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("calendar_events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    email = Column(String(255), nullable=True)
    name = Column(String(255), nullable=True)
    status = Column(
        String(20), nullable=False, default=AttendeeStatus.PENDING, index=True
    )
    response_at = Column(TIMESTAMP(timezone=True), nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
    event = relationship("CalendarEvent", back_populates="attendees")

    __table_args__ = (
        Index("idx_attendees_event_user", "event_id", "user_id"),
        Index("idx_attendees_status", "event_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<EventAttendee(id={self.id}, event_id={self.event_id}, status={self.status})>"


class EventReminder(Base):
    __tablename__ = "event_reminders"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("calendar_events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reminder_type = Column(String(20), nullable=False)
    minutes_before = Column(Integer, nullable=False)
    sent_at = Column(TIMESTAMP(timezone=True), nullable=True)
    is_sent = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    event = relationship("CalendarEvent", back_populates="reminders")

    __table_args__ = (Index("idx_reminders_event_sent", "event_id", "is_sent"),)

    def __repr__(self) -> str:
        return f"<EventReminder(id={self.id}, event_id={self.event_id}, minutes={self.minutes_before})>"


class CalendarResource(Base):
    __tablename__ = "calendar_resources"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    calendar_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("calendars.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name = Column(String(255), nullable=False)
    resource_type = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=True)
    capacity = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    meta_data = Column("metadata", JSONB, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
    event_resources = relationship(
        "EventResource", back_populates="resource", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("idx_resources_tenant_type", "tenant_id", "resource_type"),)

    def __repr__(self) -> str:
        return f"<CalendarResource(id={self.id}, name={self.name}, type={self.resource_type})>"


class EventResource(Base):
    __tablename__ = "event_resources"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("calendar_events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resource_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("calendar_resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    event = relationship("CalendarEvent")
    resource = relationship("CalendarResource", back_populates="event_resources")

    __table_args__ = (
        Index("idx_event_resources_unique", "event_id", "resource_id", unique=True),
    )

    def __repr__(self) -> str:
        return (
            f"<EventResource(event_id={self.event_id}, resource_id={self.resource_id})>"
        )


class UserCalendarPreferences(Base):
    """User calendar preferences model."""

    __tablename__ = "user_calendar_preferences"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    auto_sync_tasks = Column(Boolean, nullable=False, default=False)
    auto_sync_enabled = Column(Boolean, nullable=False, default=False)
    default_calendar_id = Column(PG_UUID(as_uuid=True), nullable=True)
    default_calendar_provider = Column(String(50), nullable=False, default="internal")
    timezone = Column(String(50), nullable=False, default="America/Mexico_City")
    time_format = Column(String(10), nullable=False, default="24h")
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<UserCalendarPreferences(user_id={self.user_id}, auto_sync={self.auto_sync_enabled})>"
