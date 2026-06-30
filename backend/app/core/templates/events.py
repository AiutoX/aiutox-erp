"""Template module events - PubSub integration."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from app.core.integrations.event_registry import (
    EventCategory,
    ModuleEventRegistry,
    WebhookEvent,
)
from app.core.logging import get_logger
from app.core.pubsub.client import RedisStreamsClient
from app.core.pubsub.errors import PubSubError

logger = get_logger(__name__)


class TemplateEventPublisher:
    """Template event publisher using Redis streams."""

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

    async def publish_template_event(
        self,
        event_type: str,
        template_id: UUID,
        tenant_id: UUID,
        user_id: UUID | None = None,
        data: dict[str, Any] | None = None,
    ) -> bool:
        """Publish a template event to Redis streams.

        Args:
            event_type: Type of event (e.g., 'template.created', 'template.rendered')
            template_id: Template ID
            tenant_id: Tenant ID
            user_id: User ID who triggered the event
            data: Additional event data

        Returns:
            True if published successfully, False otherwise
        """
        try:
            event_data: dict[str, Any] = {
                "event_type": event_type,
                "template_id": str(template_id),
                "tenant_id": str(tenant_id),
                "timestamp": datetime.now(UTC).isoformat(),
                "source": "templates",
            }

            if user_id:
                event_data["user_id"] = str(user_id)

            if data:
                event_data["data"] = data

            # Use stream name: templates:{template_id}
            stream_key = f"templates:{template_id}"
            message_id = await self.redis_client.add_message(stream_key, event_data)
            logger.debug(f"Template event published: {event_type} (id={message_id})")
            return True
        except PubSubError as e:
            logger.error(f"Failed to publish template event: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error publishing template event: {e}")
            return False


_template_event_publisher: TemplateEventPublisher | None = None


def get_template_events() -> ModuleEventRegistry:
    """Get template module webhook events."""
    return ModuleEventRegistry(
        module_name="templates",
        display_name="Plantillas",
        description="Eventos del módulo de gestión de plantillas",
        events=[
            WebhookEvent(
                type="template.created",
                description="Plantilla creada",
                category=EventCategory.LIFECYCLE,
            ),
            WebhookEvent(
                type="template.updated",
                description="Plantilla actualizada",
                category=EventCategory.LIFECYCLE,
            ),
            WebhookEvent(
                type="template.deleted",
                description="Plantilla eliminada",
                category=EventCategory.LIFECYCLE,
            ),
            WebhookEvent(
                type="template.rendered",
                description="Plantilla renderizada",
                category=EventCategory.SYSTEM,
            ),
        ],
    )


def get_template_event_publisher() -> TemplateEventPublisher:
    """Get the global template event publisher instance."""
    global _template_event_publisher
    if _template_event_publisher is None:
        _template_event_publisher = TemplateEventPublisher()
    return _template_event_publisher
