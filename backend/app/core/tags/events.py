"""Event definitions and publishers for tags module."""

import logging
from uuid import UUID

from app.core.pubsub.event_helpers import safe_publish_event
from app.core.pubsub.publisher import EventPublisher

logger = logging.getLogger(__name__)

# Event types
TAG_CREATED = "tag.created"
TAG_UPDATED = "tag.updated"
TAG_DELETED = "tag.deleted"
TAG_APPLIED = "tag.applied"  # tag applied to entity
TAG_REMOVED = "tag.removed"  # tag removed from entity

ALL_TAG_EVENTS = [
    TAG_CREATED,
    TAG_UPDATED,
    TAG_DELETED,
    TAG_APPLIED,
    TAG_REMOVED,
]


class TagEventPublisher:
    """Publisher for tag events."""

    def __init__(self, event_publisher: EventPublisher):
        """Initialize tag event publisher.

        Args:
            event_publisher: EventPublisher instance from dependency injection
        """
        self.event_publisher = event_publisher

    def publish_tag_created(
        self,
        tag_id: UUID,
        tenant_id: UUID,
        name: str,
        user_id: UUID | None = None,
        metadata: dict | None = None,
    ) -> None:
        """Publish tag.created event.

        Args:
            tag_id: ID of created tag
            tenant_id: Tenant ID
            name: Tag name
            user_id: User who created the tag
            metadata: Additional event metadata
        """
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=TAG_CREATED,
            entity_type="tag",
            entity_id=tag_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata={
                **(metadata or {}),
                "name": name,
            },
        )
        logger.debug(f"Tag created event published: {tag_id}")

    def publish_tag_updated(
        self,
        tag_id: UUID,
        tenant_id: UUID,
        changes: dict,
        user_id: UUID | None = None,
        metadata: dict | None = None,
    ) -> None:
        """Publish tag.updated event.

        Args:
            tag_id: ID of updated tag
            tenant_id: Tenant ID
            changes: Dictionary of changes
            user_id: User who updated the tag
            metadata: Additional event metadata
        """
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=TAG_UPDATED,
            entity_type="tag",
            entity_id=tag_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata={
                **(metadata or {}),
                "changes": changes,
            },
        )
        logger.debug(f"Tag updated event published: {tag_id}")

    def publish_tag_deleted(
        self,
        tag_id: UUID,
        tenant_id: UUID,
        user_id: UUID | None = None,
        metadata: dict | None = None,
    ) -> None:
        """Publish tag.deleted event.

        Args:
            tag_id: ID of deleted tag
            tenant_id: Tenant ID
            user_id: User who deleted the tag
            metadata: Additional event metadata
        """
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=TAG_DELETED,
            entity_type="tag",
            entity_id=tag_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata=metadata,
        )
        logger.debug(f"Tag deleted event published: {tag_id}")

    def publish_tag_applied(
        self,
        tag_id: UUID,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
        user_id: UUID | None = None,
        metadata: dict | None = None,
    ) -> None:
        """Publish tag.applied event (tag applied to entity).

        Args:
            tag_id: ID of applied tag
            entity_type: Type of entity being tagged
            entity_id: ID of entity being tagged
            tenant_id: Tenant ID
            user_id: User who applied the tag
            metadata: Additional event metadata
        """
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=TAG_APPLIED,
            entity_type=entity_type,
            entity_id=entity_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata={
                **(metadata or {}),
                "tag_id": str(tag_id),
            },
        )
        logger.debug(
            f"Tag applied event published: tag={tag_id} to {entity_type}:{entity_id}"
        )

    def publish_tag_removed(
        self,
        tag_id: UUID,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
        user_id: UUID | None = None,
        metadata: dict | None = None,
    ) -> None:
        """Publish tag.removed event (tag removed from entity).

        Args:
            tag_id: ID of removed tag
            entity_type: Type of entity losing the tag
            entity_id: ID of entity losing the tag
            tenant_id: Tenant ID
            user_id: User who removed the tag
            metadata: Additional event metadata
        """
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=TAG_REMOVED,
            entity_type=entity_type,
            entity_id=entity_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata={
                **(metadata or {}),
                "tag_id": str(tag_id),
            },
        )
        logger.debug(
            f"Tag removed event published: tag={tag_id} from {entity_type}:{entity_id}"
        )
