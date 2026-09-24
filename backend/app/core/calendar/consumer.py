"""Event consumer for the calendar module.

Subscribes to the central domain event stream (same one NotificationEventConsumer
and GamificationEventConsumer read) and syncs task schedule changes to calendar
events. CalendarSyncService.sync_task_to_event() existed with full test coverage
but was never wired to any running consumer, so tasks with a due_date never
actually appeared on the calendar in a live deployment.
"""

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.calendar.sync_service import CalendarSyncService
from app.core.config_file import get_settings
from app.core.pubsub import EventConsumer, RedisStreamsClient
from app.core.pubsub.models import Event
from app.core.tasks.models import Task

logger = logging.getLogger(__name__)

_RELEVANT_EVENT_TYPES = {"task.created", "task.updated"}


class CalendarEventConsumer:
    """Consumer for task events that keep calendar events in sync."""

    def __init__(self, db: Session, consumer: EventConsumer | None = None):
        """Initialize calendar event consumer.

        Args:
            db: Database session
            consumer: EventConsumer instance (created if not provided)
        """
        self.db = db
        self.settings = get_settings()

        if consumer is None:
            client = RedisStreamsClient(
                redis_url=self.settings.REDIS_URL, password=self.settings.REDIS_PASSWORD
            )
            consumer = EventConsumer(client=client)

        self.consumer = consumer
        self._running = False

    async def start(self) -> None:
        """Start consuming task events and syncing them to the calendar."""
        if self._running:
            logger.warning("Calendar consumer is already running")
            return

        self._running = True

        await self.consumer.subscribe(
            group_name="calendar-service",
            consumer_name="calendar-consumer-1",
            event_types=[],  # Empty list = all events; filtered in the callback
            callback=self._handle_event,
            stream_name=self.settings.REDIS_STREAM_DOMAIN,
        )

        logger.info("Calendar event consumer started")

    async def stop(self) -> None:
        """Stop consuming events."""
        self._running = False
        logger.info("Calendar event consumer stopped")

    async def _handle_event(self, event: Event) -> None:
        """Sync a task's schedule to a calendar event.

        Args:
            event: Event from the domain stream
        """
        if event.event_type not in _RELEVANT_EVENT_TYPES:
            return

        try:
            task = (
                self.db.query(Task)
                .filter(
                    Task.id == UUID(str(event.entity_id)),
                    Task.tenant_id == event.tenant_id,
                )
                .first()
            )
            if task is None:
                logger.debug(
                    "Task %s not found for %s, skipping calendar sync",
                    event.entity_id,
                    event.event_type,
                )
                return

            sync_service = CalendarSyncService(self.db)
            sync_service.sync_task_to_event(task)
        except Exception as e:
            logger.error(
                f"Error syncing task {event.entity_id} to calendar "
                f"for event {event.event_type}: {e}",
                exc_info=True,
            )
            # Don't re-raise — continue processing other events
