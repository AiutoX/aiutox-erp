"""Event consumer for the gamification system.

Subscribes to the central domain event stream (same one NotificationEventConsumer
reads) and awards points/badges for task and calendar activity. See EH-013 —
GamificationEventHandler existed with full test coverage but was never wired to
any running consumer, so no points were ever awarded in a live deployment.
"""

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config_file import get_settings
from app.core.gamification.event_handlers import GamificationEventHandler
from app.core.pubsub import EventConsumer, RedisStreamsClient
from app.core.pubsub.models import Event

logger = logging.getLogger(__name__)

_RELEVANT_EVENT_TYPES = {
    "task.completed",
    "task.created",
    "calendar.event_attended",
}


class GamificationEventConsumer:
    """Consumer for events that award gamification points and badges."""

    def __init__(self, db: Session, consumer: EventConsumer | None = None):
        """Initialize gamification event consumer.

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
        """Start consuming events and awarding points/badges."""
        if self._running:
            logger.warning("Gamification consumer is already running")
            return

        self._running = True

        await self.consumer.subscribe(
            group_name="gamification-service",
            consumer_name="gamification-consumer-1",
            event_types=[],  # Empty list = all events; filtered in the callback
            callback=self._handle_event,
            stream_name=self.settings.REDIS_STREAM_DOMAIN,
        )

        logger.info("Gamification event consumer started")

    async def stop(self) -> None:
        """Stop consuming events."""
        self._running = False
        logger.info("Gamification event consumer stopped")

    async def _handle_event(self, event: Event) -> None:
        """Route a domain event to the appropriate GamificationEventHandler method.

        Args:
            event: Event from the domain stream
        """
        if event.event_type not in _RELEVANT_EVENT_TYPES:
            return

        if event.user_id is None:
            logger.debug(
                "No user_id in event %s, skipping gamification", event.event_type
            )
            return

        try:
            handler = GamificationEventHandler(self.db, event.tenant_id)
            metadata = event.metadata.additional_data if event.metadata else {}

            if event.event_type == "task.completed":
                handler.handle_task_completed(
                    user_id=event.user_id,
                    task_id=UUID(str(event.entity_id)),
                    metadata=metadata,
                )
            elif event.event_type == "task.created":
                handler.handle_task_created(
                    user_id=event.user_id,
                    task_id=UUID(str(event.entity_id)),
                    metadata=metadata,
                )
            elif event.event_type == "calendar.event_attended":
                handler.handle_event_attended(
                    user_id=event.user_id,
                    event_id=UUID(str(event.entity_id)),
                    metadata=metadata,
                )
        except Exception as e:
            logger.error(
                f"Error handling gamification event {event.event_type}: {e}",
                exc_info=True,
            )
            # Don't re-raise — continue processing other events
