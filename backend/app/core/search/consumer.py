"""Event consumer for the search module.

Subscribes to the central domain event stream (same one CalendarEventConsumer/
NotificationEventConsumer/GamificationEventConsumer read) and keeps
search_indices in sync with real entity data. A module opts in solely by
registering a SearchProvider (ModuleInterface.get_search_handler()) — this
consumer never imports a business module directly, it resolves providers via
ModuleRegistry, the same self-discovery pattern used throughout search.
"""

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config_file import get_settings
from app.core.module_registry import ModuleRegistry, get_module_registry
from app.core.pubsub import EventConsumer, RedisStreamsClient
from app.core.pubsub.models import Event
from app.core.search.handler import SearchProvider
from app.core.search.indexer import SearchIndexer

logger = logging.getLogger(__name__)


class SearchIndexConsumer:
    """Consumer for domain events that keep search_indices in sync."""

    def __init__(
        self,
        db: Session,
        consumer: EventConsumer | None = None,
        module_registry: ModuleRegistry | None = None,
    ):
        """Initialize search index consumer.

        Args:
            db: Database session
            consumer: EventConsumer instance (created if not provided)
            module_registry: ModuleRegistry used to resolve each event's
                owning SearchProvider (created if not provided)
        """
        self.db = db
        self.settings = get_settings()
        self.indexer = SearchIndexer(db)
        self._module_registry = module_registry

        if consumer is None:
            client = RedisStreamsClient(
                redis_url=self.settings.REDIS_URL, password=self.settings.REDIS_PASSWORD
            )
            consumer = EventConsumer(client=client)

        self.consumer = consumer
        self._running = False

    @property
    def module_registry(self) -> ModuleRegistry:
        if self._module_registry is None:
            # Reuse the global, already-discovered registry populated at
            # app startup (main.py's lifespan) — constructing a fresh
            # ModuleRegistry() here would be empty (discover_modules() never
            # called on it), silently no-oping every event (see
            # docs/05-status/ux-walkthrough/search-2026-07-19.md).
            self._module_registry = get_module_registry()
        return self._module_registry

    async def start(self) -> None:
        """Start consuming domain events and keeping search_indices in sync."""
        if self._running:
            logger.warning("Search index consumer is already running")
            return

        self._running = True

        await self.consumer.subscribe(
            group_name="search-index-service",
            consumer_name="search-index-consumer-1",
            event_types=[],  # Empty list = all events; filtered in the callback
            callback=self._handle_event,
            stream_name=self.settings.REDIS_STREAM_DOMAIN,
        )

        logger.info("Search index consumer started")

    async def stop(self) -> None:
        """Stop consuming events."""
        self._running = False
        logger.info("Search index consumer stopped")

    def _resolve_provider(
        self, entity_type: str, tenant_id: UUID
    ) -> tuple[str, SearchProvider] | None:
        """Find the (module_id, SearchProvider) pair that declares this
        entity_type, among modules enabled for this tenant. O(n) in
        supported-module count, off the request path — acceptable per
        MODULE-SPEC.md Section 17 (write-side cost, not read-side)."""
        for module_id in self.module_registry.get_search_supported_modules(tenant_id):
            provider = self.module_registry.get_search_handler(module_id, tenant_id)
            if provider is None:
                continue
            if provider.get_index_definition().entity_type == entity_type:
                return module_id, provider
        return None

    async def _handle_event(self, event: Event) -> None:
        """Index, re-index, or remove a search_indices row for this event.

        Deliberately does NOT parse event.event_type's string shape
        (".created" vs "_created" vs "created_at" etc. differ per module —
        e.g. tasks publishes "task.created" but calendar publishes
        "calendar.event_created", a real naming mismatch found during
        SRC-005 that a suffix-based filter would have silently missed).
        Instead, presence/absence of the entity in the DB is the source of
        truth: if it exists, upsert (covers both create and update in one
        path); if it doesn't, remove any stale index row (covers delete,
        and self-heals if a create event arrives for an
        already-deleted entity).

        Per MODULE-SPEC.md RULE-006: any failure here is caught, logged with
        module/entity/tenant context, and never re-raised — a broken
        indexing path must not block the triggering user action or crash
        the consumer loop.
        """
        try:
            resolved = self._resolve_provider(event.entity_type, event.tenant_id)
            if resolved is None:
                # No module currently declares this entity_type as
                # searchable — silent skip, not an error.
                return
            module_id, provider = resolved

            definition = provider.get_index_definition()

            entity = (
                self.db.query(definition.model_class)
                .filter(definition.model_class.id == event.entity_id)  # type: ignore[attr-defined]
                .first()
            )
            if entity is None:
                self.indexer.remove_index(
                    event.entity_type, event.entity_id, event.tenant_id
                )
                return

            title = getattr(entity, definition.label_column, "") or ""
            content_parts = [
                str(getattr(entity, col, "") or "")
                for col in definition.search_columns
                if col != definition.label_column
            ]
            content = " ".join(p for p in content_parts if p) or None

            exact_match_value = None
            if definition.exact_match_column:
                raw = getattr(entity, definition.exact_match_column, None)
                exact_match_value = raw.strip().lower() if raw else None

            self.indexer.index_entity(
                entity_type=event.entity_type,
                entity_id=event.entity_id,
                tenant_id=event.tenant_id,
                title=title,
                content=content,
                module_id=module_id,
                exact_match_value=exact_match_value,
            )
        except Exception as e:
            logger.error(
                "Error indexing entity %s:%s for event %s (tenant %s): %s",
                event.entity_type,
                event.entity_id,
                event.event_type,
                event.tenant_id,
                e,
                exc_info=True,
            )
            # Don't re-raise — continue processing other events
