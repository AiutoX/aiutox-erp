"""Comment event publishing using Redis Streams."""

from uuid import UUID

from app.core.config_file import get_settings
from app.core.pubsub.client import RedisStreamsClient


class CommentEventPublisher:
    """Publishes comment events to Redis Streams."""

    def __init__(self, client: RedisStreamsClient):
        """Initialize publisher with Redis client."""
        self.client = client

    async def publish_comment_created(
        self,
        comment_id: UUID,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
    ) -> str:
        """Publish comment.created event."""
        return await self.client.publish(
            stream="events:comments",
            event="comment.created",
            data={
                "comment_id": str(comment_id),
                "entity_type": entity_type,
                "entity_id": str(entity_id),
                "tenant_id": str(tenant_id),
                "user_id": str(user_id),
            },
        )

    async def publish_comment_updated(
        self,
        comment_id: UUID,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
    ) -> str:
        """Publish comment.updated event."""
        return await self.client.publish(
            stream="events:comments",
            event="comment.updated",
            data={
                "comment_id": str(comment_id),
                "entity_type": entity_type,
                "entity_id": str(entity_id),
                "tenant_id": str(tenant_id),
                "user_id": str(user_id),
            },
        )

    async def publish_comment_deleted(
        self,
        comment_id: UUID,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
    ) -> str:
        """Publish comment.deleted event."""
        return await self.client.publish(
            stream="events:comments",
            event="comment.deleted",
            data={
                "comment_id": str(comment_id),
                "entity_type": entity_type,
                "entity_id": str(entity_id),
                "tenant_id": str(tenant_id),
            },
        )

    async def publish_comment_mentioned(
        self,
        comment_id: UUID,
        mentioned_user_id: UUID,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
    ) -> str:
        """Publish comment.mentioned event."""
        return await self.client.publish(
            stream="events:comments",
            event="comment.mentioned",
            data={
                "comment_id": str(comment_id),
                "mentioned_user_id": str(mentioned_user_id),
                "entity_type": entity_type,
                "entity_id": str(entity_id),
                "tenant_id": str(tenant_id),
            },
        )


_comment_event_publisher: CommentEventPublisher | None = None


def get_comment_event_publisher() -> CommentEventPublisher:
    """Get or create comment event publisher singleton."""
    global _comment_event_publisher
    if _comment_event_publisher is None:
        settings = get_settings()
        client = RedisStreamsClient(redis_url=settings.REDIS_URL)
        _comment_event_publisher = CommentEventPublisher(client)
    return _comment_event_publisher
