"""Event definitions and publishers for the calendar module."""

import logging
from uuid import UUID

from app.core.pubsub.event_helpers import safe_publish_event
from app.core.pubsub.publisher import EventPublisher

logger = logging.getLogger(__name__)

# Event types
CALENDAR_CREATED = "calendar.created"
CALENDAR_UPDATED = "calendar.updated"
CALENDAR_DELETED = "calendar.deleted"
EVENT_CREATED = "calendar.event.created"
EVENT_UPDATED = "calendar.event.updated"
EVENT_DELETED = "calendar.event.deleted"
EVENT_STATUS_CHANGED = "calendar.event.status_changed"
ATTENDEE_ADDED = "calendar.attendee.added"
ATTENDEE_REMOVED = "calendar.attendee.removed"

ALL_CALENDAR_EVENTS = [
    CALENDAR_CREATED,
    CALENDAR_UPDATED,
    CALENDAR_DELETED,
    EVENT_CREATED,
    EVENT_UPDATED,
    EVENT_DELETED,
    EVENT_STATUS_CHANGED,
    ATTENDEE_ADDED,
    ATTENDEE_REMOVED,
]


class CalendarEventPublisher:
    """Publisher for calendar domain events."""

    def __init__(self, event_publisher: EventPublisher) -> None:
        self.event_publisher = event_publisher

    def publish_calendar_created(
        self,
        calendar_id: UUID,
        tenant_id: UUID,
        name: str,
        user_id: UUID | None = None,
    ) -> None:
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=CALENDAR_CREATED,
            entity_type="calendar",
            entity_id=calendar_id,
            tenant_id=tenant_id,
            metadata={"name": name},
            user_id=user_id,
        )

    def publish_calendar_updated(
        self,
        calendar_id: UUID,
        tenant_id: UUID,
        changes: dict,
        user_id: UUID | None = None,
    ) -> None:
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=CALENDAR_UPDATED,
            entity_type="calendar",
            entity_id=calendar_id,
            tenant_id=tenant_id,
            metadata={"changes": changes},
            user_id=user_id,
        )

    def publish_calendar_deleted(
        self,
        calendar_id: UUID,
        tenant_id: UUID,
        user_id: UUID | None = None,
    ) -> None:
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=CALENDAR_DELETED,
            entity_type="calendar",
            entity_id=calendar_id,
            tenant_id=tenant_id,
            metadata={},
            user_id=user_id,
        )

    def publish_event_created(
        self,
        event_id: UUID,
        calendar_id: UUID,
        tenant_id: UUID,
        title: str,
        user_id: UUID | None = None,
    ) -> None:
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=EVENT_CREATED,
            entity_type="calendar_event",
            entity_id=event_id,
            tenant_id=tenant_id,
            metadata={"calendar_id": str(calendar_id), "title": title},
            user_id=user_id,
        )

    def publish_event_updated(
        self,
        event_id: UUID,
        tenant_id: UUID,
        changes: dict,
        user_id: UUID | None = None,
    ) -> None:
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=EVENT_UPDATED,
            entity_type="calendar_event",
            entity_id=event_id,
            tenant_id=tenant_id,
            metadata={"changes": changes},
            user_id=user_id,
        )

    def publish_event_deleted(
        self,
        event_id: UUID,
        tenant_id: UUID,
        user_id: UUID | None = None,
    ) -> None:
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=EVENT_DELETED,
            entity_type="calendar_event",
            entity_id=event_id,
            tenant_id=tenant_id,
            metadata={},
            user_id=user_id,
        )

    def publish_event_status_changed(
        self,
        event_id: UUID,
        tenant_id: UUID,
        old_status: str,
        new_status: str,
        user_id: UUID | None = None,
    ) -> None:
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=EVENT_STATUS_CHANGED,
            entity_type="calendar_event",
            entity_id=event_id,
            tenant_id=tenant_id,
            metadata={"old_status": old_status, "new_status": new_status},
            user_id=user_id,
        )
