"""Activity event publishing using Redis Streams."""

from uuid import UUID

from app.core.config_file import get_settings
from app.core.pubsub.client import RedisStreamsClient


class ActivityEventPublisher:
    """Publishes activity events to Redis Streams."""

    def __init__(self, client: RedisStreamsClient):
        """Initialize publisher with Redis client."""
        self.client = client

    async def publish_activity_created(
        self,
        activity_id: UUID,
        entity_type: str,
        entity_id: UUID,
        activity_type: str,
        tenant_id: UUID,
        user_id: UUID,
    ) -> str:
        """Publish activity.created event."""
        return await self.client.publish(
            stream="events:activities",
            event="activity.created",
            data={
                "activity_id": str(activity_id),
                "entity_type": entity_type,
                "entity_id": str(entity_id),
                "activity_type": activity_type,
                "tenant_id": str(tenant_id),
                "user_id": str(user_id),
            },
        )

    async def publish_activity_updated(
        self,
        activity_id: UUID,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
    ) -> str:
        """Publish activity.updated event."""
        return await self.client.publish(
            stream="events:activities",
            event="activity.updated",
            data={
                "activity_id": str(activity_id),
                "entity_type": entity_type,
                "entity_id": str(entity_id),
                "tenant_id": str(tenant_id),
                "user_id": str(user_id),
            },
        )

    async def publish_activity_deleted(
        self,
        activity_id: UUID,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
    ) -> str:
        """Publish activity.deleted event."""
        return await self.client.publish(
            stream="events:activities",
            event="activity.deleted",
            data={
                "activity_id": str(activity_id),
                "entity_type": entity_type,
                "entity_id": str(entity_id),
                "tenant_id": str(tenant_id),
            },
        )


_activity_event_publisher: ActivityEventPublisher | None = None


def get_activity_event_publisher() -> ActivityEventPublisher:
    """Get or create activity event publisher singleton."""
    global _activity_event_publisher
    if _activity_event_publisher is None:
        settings = get_settings()
        client = RedisStreamsClient(redis_url=settings.REDIS_URL)
        _activity_event_publisher = ActivityEventPublisher(client)
    return _activity_event_publisher
