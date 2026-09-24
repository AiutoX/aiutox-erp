"""Search module PubSub events."""

from uuid import UUID

from app.core.integrations.event_registry import (
    EventCategory,
    ModuleEventRegistry,
    WebhookEvent,
)
from app.core.pubsub.event_helpers import safe_publish_event
from app.core.pubsub.publisher import EventPublisher

# Event types
SEARCH_PERFORMED = "search.performed"
SEARCH_ENTITY_INDEXED = "search.entity_indexed"
SEARCH_ENTITY_REMOVED = "search.entity_removed"

ALL_SEARCH_EVENTS = [
    SEARCH_PERFORMED,
    SEARCH_ENTITY_INDEXED,
    SEARCH_ENTITY_REMOVED,
]


def get_search_events() -> ModuleEventRegistry:
    """Get search module webhook events."""
    return ModuleEventRegistry(
        module_name="search",
        display_name="Búsqueda",
        description="Eventos del módulo de búsqueda",
        events=[
            WebhookEvent(
                type=SEARCH_PERFORMED,
                description="Búsqueda realizada",
                category=EventCategory.INTERACTION,
            ),
            WebhookEvent(
                type=SEARCH_ENTITY_INDEXED,
                description="Entidad indexada en búsqueda",
                category=EventCategory.SYSTEM,
            ),
            WebhookEvent(
                type=SEARCH_ENTITY_REMOVED,
                description="Entidad eliminada del índice de búsqueda",
                category=EventCategory.SYSTEM,
            ),
        ],
    )


class SearchEventPublisher:
    """Publishes search-related domain events to PubSub."""

    def __init__(self, event_publisher: EventPublisher):
        self.event_publisher = event_publisher

    def publish_search_performed(
        self,
        query: str,
        result_count: int,
        tenant_id: UUID,
        user_id: UUID,
        entity_types: list[str] | None = None,
    ) -> None:
        """Publish search.performed event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=SEARCH_PERFORMED,
            entity_type="search",
            entity_id=None,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata={
                "query": query,
                "result_count": result_count,
                "entity_types": entity_types or [],
            },
        )

    def publish_entity_indexed(
        self,
        entity_id: UUID,
        entity_type: str,
        tenant_id: UUID,
    ) -> None:
        """Publish search.entity_indexed event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=SEARCH_ENTITY_INDEXED,
            entity_type="search_index",
            entity_id=entity_id,
            tenant_id=tenant_id,
            metadata={"indexed_entity_type": entity_type},
        )

    def publish_entity_removed(
        self,
        entity_id: UUID,
        entity_type: str,
        tenant_id: UUID,
    ) -> None:
        """Publish search.entity_removed event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=SEARCH_ENTITY_REMOVED,
            entity_type="search_index",
            entity_id=entity_id,
            tenant_id=tenant_id,
            metadata={"removed_entity_type": entity_type},
        )
