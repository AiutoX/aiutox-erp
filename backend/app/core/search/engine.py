"""Search engine for global search functionality.

search_filtered() implements the full read-path pipeline from
MODULE-SPEC.md RULE-001 through RULE-005: tenant filter (always, at the
repository layer) -> base permission per entity type -> module-enabled
check -> optional filter_visible() callback, batch-only per RULE-004.
"""

import logging
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.auth.permissions import has_permission
from app.core.module_registry import ModuleRegistry, get_module_registry
from app.core.search.models import SearchIndex
from app.repositories.search_repository import SearchRepository

logger = logging.getLogger(__name__)


class SearchEngine:
    """Engine for global search across all entities."""

    def __init__(self, db: Session, module_registry: ModuleRegistry | None = None):
        """Initialize search engine.

        Args:
            db: Database session
            module_registry: ModuleRegistry used to resolve each entity
                type's SearchProvider (base permission, module-enabled
                state, optional filter_visible callback). Constructed
                lazily if not provided (mirrors the lazy-construction
                pattern already used elsewhere in this module).
        """
        self.db = db
        self.repository = SearchRepository(db)
        self._module_registry = module_registry

    @property
    def module_registry(self) -> ModuleRegistry:
        if self._module_registry is None:
            # Reuse the global, already-discovered registry populated at
            # app startup — constructing a fresh ModuleRegistry() here would
            # be empty (discover_modules() never called on it), so every
            # candidate row would silently fail get_search_handler() and
            # get dropped as "no provider" (see the identical bug already
            # fixed in SearchIndexConsumer.module_registry, consumer.py).
            self._module_registry = get_module_registry()
        return self._module_registry

    async def search_filtered(
        self,
        tenant_id: UUID,
        query: str,
        user: Any,
        user_permissions: set[str],
        entity_types: list[str] | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[SearchIndex]:
        """Search and apply the full permission-filtering pipeline.

        Returns raw SearchIndex rows already filtered down to what this
        user is allowed to see — the caller (SearchService) is responsible
        for shaping the response.
        """
        candidates = self.repository.search(
            tenant_id=tenant_id,
            query=query,
            entity_types=entity_types,
            limit=limit,
            offset=offset,
        )

        if not candidates:
            return []

        # Group candidates by entity_type so each type's provider is
        # resolved once and filter_visible() is called at most once per
        # type with its full candidate batch (RULE-004).
        by_type: dict[str, list[SearchIndex]] = {}
        for row in candidates:
            by_type.setdefault(row.entity_type, []).append(row)

        visible_rows: list[SearchIndex] = []
        for entity_type, rows in by_type.items():
            provider = self.module_registry.get_search_handler(
                rows[0].module_id, tenant_id
            )
            if provider is None:
                # No registered provider, or module disabled for this
                # tenant — silently drop, not an error (RULE-005).
                continue

            definition = provider.get_index_definition()
            if not has_permission(user_permissions, definition.permission):
                continue

            candidate_ids = [row.entity_id for row in rows]
            visible_ids = await provider.filter_visible(
                user=user, candidate_ids=candidate_ids
            )
            visible_id_set = set(visible_ids)
            visible_rows.extend(row for row in rows if row.entity_id in visible_id_set)

        return visible_rows

    async def get_suggestions(
        self,
        tenant_id: UUID,
        query: str,
        user: Any,
        user_permissions: set[str],
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Get lightweight search suggestions.

        Reuses search_filtered()'s full permission pipeline — a suggestion
        must never reveal even the title of an entity the user cannot see,
        per explicit user decision (a suggestion dropdown showing another
        user's task title, even without a working link, is still a real
        data exposure).
        """
        results = await self.search_filtered(
            tenant_id=tenant_id,
            query=query,
            user=user,
            user_permissions=user_permissions,
            limit=limit,
        )

        return [
            {
                "text": result.title,
                "entity_type": result.entity_type,
                "entity_id": str(result.entity_id),
            }
            for result in results[:limit]
        ]
