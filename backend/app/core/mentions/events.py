"""Event definitions and publishers for mentions module."""

import logging
from uuid import UUID

from app.core.pubsub.event_helpers import safe_publish_event
from app.core.pubsub.publisher import EventPublisher

logger = logging.getLogger(__name__)

# Event types
MENTION_CREATED = "mention.created"
MENTION_RESOLVED = "mention.resolved"

ALL_MENTION_EVENTS = [
    MENTION_CREATED,
    MENTION_RESOLVED,
]


class MentionEventPublisher:
    """Publisher for mention events."""

    def __init__(self, event_publisher: EventPublisher):
        """Initialize mention event publisher.

        Args:
            event_publisher: EventPublisher instance from dependency injection
        """
        self.event_publisher = event_publisher

    def publish_mention_created(
        self,
        mention_id: UUID,
        user_id: UUID,
        mencionable_type: str,
        mencionable_id: UUID,
        tenant_id: UUID,
        created_by_id: UUID | None = None,
        metadata: dict | None = None,
    ) -> None:
        """Publish mention.created event.

        Args:
            mention_id: ID of created mention
            user_id: ID of the mentioned user
            mencionable_type: Type of entity being mentioned in
            mencionable_id: ID of entity being mentioned in
            tenant_id: Tenant ID
            created_by_id: User who created the mention
            metadata: Additional event metadata
        """
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=MENTION_CREATED,
            entity_type=mencionable_type,
            entity_id=mencionable_id,
            tenant_id=tenant_id,
            user_id=created_by_id,
            metadata={
                **(metadata or {}),
                "mention_id": str(mention_id),
                "mentioned_user_id": str(user_id),
                "mencionable_type": mencionable_type,
                "mencionable_id": str(mencionable_id),
            },
        )
        logger.debug(f"Mention created event published: {mention_id}")

    def publish_mention_resolved(
        self,
        mention_id: UUID,
        user_id: UUID,
        mencionable_type: str,
        mencionable_id: UUID,
        tenant_id: UUID,
        resolved_by_id: UUID | None = None,
        metadata: dict | None = None,
    ) -> None:
        """Publish mention.resolved event.

        Args:
            mention_id: ID of resolved mention
            user_id: ID of the mentioned user
            mencionable_type: Type of entity being mentioned in
            mencionable_id: ID of entity being mentioned in
            tenant_id: Tenant ID
            resolved_by_id: User who resolved the mention
            metadata: Additional event metadata
        """
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=MENTION_RESOLVED,
            entity_type=mencionable_type,
            entity_id=mencionable_id,
            tenant_id=tenant_id,
            user_id=resolved_by_id,
            metadata={
                **(metadata or {}),
                "mention_id": str(mention_id),
                "mentioned_user_id": str(user_id),
            },
        )
        logger.debug(f"Mention resolved event published: {mention_id}")
