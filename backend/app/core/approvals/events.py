"""Approval module events - PubSub integration."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from app.core.logging import get_logger
from app.core.pubsub.client import RedisStreamsClient
from app.core.pubsub.errors import PubSubError

logger = get_logger(__name__)


class ApprovalEventPublisher:
    """Approval event publisher using Redis streams."""

    def __init__(self, redis_client: RedisStreamsClient | None = None):
        """Initialize event publisher."""
        if redis_client is None:
            import os

            redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
            redis_password = os.getenv("REDIS_PASSWORD", "")
            redis_client = RedisStreamsClient(
                redis_url=redis_url, password=redis_password
            )
        self.redis_client = redis_client

    async def publish_approval_event(
        self,
        event_type: str,
        approval_id: UUID,
        tenant_id: UUID,
        user_id: UUID | None = None,
        data: dict[str, Any] | None = None,
    ) -> bool:
        """Publish an approval event to Redis streams.

        Args:
            event_type: Type of event (e.g., 'approval.requested', 'approval.approved')
            approval_id: Approval ID
            tenant_id: Tenant ID
            user_id: User ID who triggered the event
            data: Additional event data

        Returns:
            True if published successfully, False otherwise
        """
        try:
            event_data: dict[str, Any] = {
                "event_type": event_type,
                "approval_id": str(approval_id),
                "tenant_id": str(tenant_id),
                "timestamp": datetime.now(UTC).isoformat(),
                "source": "approvals",
            }

            if user_id:
                event_data["user_id"] = str(user_id)

            if data:
                event_data["data"] = data

            stream_key = f"approvals:{approval_id}"
            message_id = await self.redis_client.add_message(stream_key, event_data)
            logger.debug(f"Approval event published: {event_type} (id={message_id})")
            return True
        except PubSubError as e:
            logger.error(f"Failed to publish approval event: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error publishing approval event: {e}")
            return False


_approval_event_publisher: ApprovalEventPublisher | None = None


def get_approval_event_publisher() -> ApprovalEventPublisher:
    """Get the global approval event publisher instance."""
    global _approval_event_publisher
    if _approval_event_publisher is None:
        _approval_event_publisher = ApprovalEventPublisher()
    return _approval_event_publisher
