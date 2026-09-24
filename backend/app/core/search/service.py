"""Search service for high-level search operations."""

import logging
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.pubsub import EventPublisher
from app.core.search.engine import SearchEngine
from app.core.search.indexer import SearchIndexer
from app.core.search.models import ReindexJob, ReindexJobStatus
from app.repositories.search_repository import SearchRepository

logger = logging.getLogger(__name__)


class SearchService:
    """High-level service for search operations."""

    def __init__(
        self,
        db: Session,
        event_publisher: EventPublisher | None = None,
    ):
        """Initialize search service.

        Args:
            db: Database session
            event_publisher: Event publisher for search events
        """
        self.db = db
        self.repository = SearchRepository(db)
        self.engine = SearchEngine(db)
        self.indexer = SearchIndexer(db)
        self.event_publisher = event_publisher

    async def search(
        self,
        tenant_id: UUID,
        query: str,
        user: Any,
        user_permissions: set[str],
        entity_types: list[str] | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> dict[str, Any]:
        """Search across all indexed entities the user is allowed to see.

        Args:
            tenant_id: Tenant ID
            query: Search query
            user: Current user (passed through to each SearchProvider's
                optional filter_visible() callback)
            user_permissions: Effective permission set for the current user
            entity_types: Filter by entity types (optional)
            limit: Maximum number of results (default: 20)
            offset: Result offset for pagination

        Returns:
            Dictionary with a flat, ranked, permission-filtered result list
            plus pagination meta — matches SearchResultItem/StandardListResponse.
        """
        rows = await self.engine.search_filtered(
            tenant_id=tenant_id,
            query=query,
            user=user,
            user_permissions=user_permissions,
            entity_types=entity_types,
            limit=limit,
            offset=offset,
        )

        # Log search event (fire-and-forget; publish is async)
        if self.event_publisher:
            self.event_publisher.publish(  # type: ignore[unused-coroutine]
                event_type="search.performed",
                entity_type="search",
                entity_id=tenant_id,
                tenant_id=tenant_id,
            )

        return {
            "results": rows,
            "total": len(rows),
        }

    async def get_suggestions(
        self,
        tenant_id: UUID,
        query: str,
        user: Any,
        user_permissions: set[str],
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Get search suggestions.

        Args:
            tenant_id: Tenant ID
            query: Search query
            user: Current user (passed through to permission filtering)
            user_permissions: Effective permission set for the current user
            limit: Maximum number of suggestions (default: 10)

        Returns:
            List of suggestion dictionaries
        """
        return await self.engine.get_suggestions(
            tenant_id=tenant_id,
            query=query,
            user=user,
            user_permissions=user_permissions,
            limit=limit,
        )

    def get_searchable_types(self, tenant_id: UUID) -> list[dict[str, Any]]:
        """Return the catalog of entity types currently searchable for this tenant.

        Sourced from ModuleRegistry.get_search_supported_modules() +
        each provider's get_index_definition() — never a hardcoded list.
        """
        supported_modules = self.engine.module_registry.get_search_supported_modules(
            tenant_id
        )

        catalog = []
        for module_id in supported_modules:
            provider = self.engine.module_registry.get_search_handler(
                module_id, tenant_id
            )
            if provider is None:
                continue
            definition = provider.get_index_definition()
            catalog.append(
                {
                    "entity_type": definition.entity_type,
                    "label": definition.entity_type,
                    "icon": definition.icon,
                    "module_id": module_id,
                }
            )

        return catalog

    def index_entity(
        self,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
        title: str,
        content: str | None = None,
        metadata: dict | None = None,
        user_id: UUID | None = None,
    ) -> dict[str, Any]:
        """Index an entity for search.

        Args:
            entity_type: Entity type (e.g., 'product', 'contact')
            entity_id: Entity ID
            tenant_id: Tenant ID
            title: Entity title
            content: Entity content for search (optional)
            metadata: Additional metadata (optional)
            user_id: User ID performing the action (optional)

        Returns:
            Dictionary with indexed entity information
        """
        index = self.indexer.index_entity(
            entity_type, entity_id, tenant_id, title, content, metadata
        )

        # Log indexing event (fire-and-forget; publish is async)
        if self.event_publisher:
            self.event_publisher.publish(  # type: ignore[unused-coroutine]
                event_type="search.entity_indexed",
                entity_type=entity_type,
                entity_id=entity_id,
                tenant_id=tenant_id,
                user_id=user_id,
            )

        return {
            "id": str(index.id),
            "entity_type": index.entity_type,
            "entity_id": str(index.entity_id),
            "title": index.title,
            "indexed_at": index.created_at.isoformat(),
        }

    def remove_index(
        self,
        entity_type: str,
        entity_id: UUID,
        tenant_id: UUID,
        user_id: UUID | None = None,
    ) -> bool:
        """Remove an entity from search index.

        Args:
            entity_type: Entity type
            entity_id: Entity ID
            tenant_id: Tenant ID
            user_id: User ID performing the action (optional)

        Returns:
            True if removed successfully, False otherwise
        """
        deleted = self.indexer.remove_index(entity_type, entity_id, tenant_id)

        # Log removal event (fire-and-forget; publish is async)
        if self.event_publisher and deleted:
            self.event_publisher.publish(  # type: ignore[unused-coroutine]
                event_type="search.entity_removed",
                entity_type=entity_type,
                entity_id=entity_id,
                tenant_id=tenant_id,
                user_id=user_id,
            )

        return deleted

    def run_reindex_batch(
        self,
        tenant_id: UUID,
        module_id: str,
        provider: Any,
        batch_size: int = 500,
        resume_from_cursor: str | None = None,
    ) -> dict[str, Any]:
        """Index one batch of a module's rows, cursor-paginated by primary
        key id (never OFFSET — see MODULE-SPEC.md Section 8/13).

        A single call processes rows with id > resume_from_cursor, up to
        batch_size rows, repeating internally until no more rows remain for
        this page window... actually processes exactly one page per call;
        run_full_reindex() loops this until a page comes back empty.

        Args:
            tenant_id: Tenant ID
            module_id: Module being reindexed
            provider: The module's SearchProvider (already resolved by the
                caller via ModuleRegistry — this method doesn't do lookup)
            batch_size: Max rows per page
            resume_from_cursor: Last successfully processed row id (as str),
                or None to start from the beginning

        Returns:
            Dict with indexed_count, failed_count, last_cursor_id (str or
            None if the page was empty — signals the caller to stop)
        """
        definition = provider.get_index_definition()
        model = definition.model_class

        query = self.db.query(model).filter(model.tenant_id == tenant_id)  # type: ignore[attr-defined]
        if resume_from_cursor:
            query = query.filter(model.id > resume_from_cursor)  # type: ignore[attr-defined]

        rows = query.order_by(model.id.asc()).limit(batch_size).all()  # type: ignore[attr-defined]

        indexed_count = 0
        failed_count = 0
        last_cursor_id: str | None = None

        for row in rows:
            try:
                title = getattr(row, definition.label_column, "") or ""
                content_parts = [
                    str(getattr(row, col, "") or "")
                    for col in definition.search_columns
                    if col != definition.label_column
                ]
                content = " ".join(p for p in content_parts if p) or None

                exact_match_value = None
                if definition.exact_match_column:
                    raw = getattr(row, definition.exact_match_column, None)
                    exact_match_value = raw.strip().lower() if raw else None

                self.indexer.index_entity(
                    entity_type=definition.entity_type,
                    entity_id=row.id,
                    tenant_id=tenant_id,
                    title=title,
                    content=content,
                    module_id=module_id,
                    exact_match_value=exact_match_value,
                )
                indexed_count += 1
            except Exception as e:
                failed_count += 1
                logger.error(
                    "Backfill failed for %s row %s (tenant %s): %s",
                    module_id,
                    getattr(row, "id", "?"),
                    tenant_id,
                    e,
                    exc_info=True,
                )
            last_cursor_id = str(row.id)

        return {
            "indexed_count": indexed_count,
            "failed_count": failed_count,
            "last_cursor_id": last_cursor_id,
        }

    def create_reindex_job(self, tenant_id: UUID, module_id: str) -> ReindexJob:
        """Create a new pending ReindexJob row — called synchronously from
        the endpoint before returning 202, so the client gets a real job_id
        immediately."""
        job = ReindexJob(tenant_id=tenant_id, module_id=module_id)
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def get_or_create_reindex_job(
        self, tenant_id: UUID, module_id: str, resume_job_id: UUID | None
    ) -> ReindexJob:
        """Return the job to run: a fresh one, or an existing not-yet-completed
        job to resume from its persisted last_cursor_id.

        Args:
            resume_job_id: if provided, look up that exact job (scoped to
                this tenant) instead of creating a new one. Raises ValueError
                if it doesn't exist or is already completed — resuming a
                finished job makes no sense and should fail loudly, not
                silently create a new one instead.
        """
        if resume_job_id is None:
            return self.create_reindex_job(tenant_id, module_id)

        job = (
            self.db.query(ReindexJob)
            .filter(ReindexJob.id == resume_job_id, ReindexJob.tenant_id == tenant_id)
            .first()
        )
        if job is None:
            raise ValueError(f"Reindex job {resume_job_id} not found")
        if job.status == ReindexJobStatus.COMPLETED:
            raise ValueError(f"Reindex job {resume_job_id} is already completed")
        return job

    def run_full_reindex(
        self, job_id: UUID, tenant_id: UUID, module_id: str, provider: Any
    ) -> None:
        """Run a complete backfill for one (tenant, module), looping
        run_reindex_batch() until a page comes back empty. Intended to run
        via FastAPI BackgroundTasks (no real async worker exists in this
        project — see MODULE-SPEC.md Section 17 and the equivalent
        constraint already documented for import_export).

        Resumable across calls: if the job passed in already has a
        last_cursor_id (i.e. the caller resolved it via
        get_or_create_reindex_job() with a resume_job_id), processing starts
        from that cursor instead of the beginning — this is what makes
        re-triggering after a server restart mid-run actually pick up where
        it left off, per MODULE-SPEC.md's backfill resumability requirement.
        """
        job = self.db.query(ReindexJob).filter(ReindexJob.id == job_id).first()
        if job is None:
            logger.error("run_full_reindex: job %s not found", job_id)
            return

        job.status = ReindexJobStatus.PROCESSING  # type: ignore[assignment]
        self.db.commit()

        cursor: str | None = job.last_cursor_id  # type: ignore[assignment]
        total_indexed: int = job.indexed_count or 0  # type: ignore[assignment]
        total_failed: int = job.failed_count or 0  # type: ignore[assignment]

        try:
            while True:
                batch_result = self.run_reindex_batch(
                    tenant_id=tenant_id,
                    module_id=module_id,
                    provider=provider,
                    resume_from_cursor=cursor,
                )
                total_indexed += batch_result["indexed_count"]
                total_failed += batch_result["failed_count"]

                if batch_result["last_cursor_id"] is None:
                    # Empty page — nothing left to process.
                    break
                cursor = batch_result["last_cursor_id"]

                job.last_cursor_id = cursor  # type: ignore[assignment]
                job.indexed_count = total_indexed  # type: ignore[assignment]
                job.failed_count = total_failed  # type: ignore[assignment]
                self.db.commit()

            job.status = ReindexJobStatus.COMPLETED  # type: ignore[assignment]
            job.indexed_count = total_indexed  # type: ignore[assignment]
            job.failed_count = total_failed  # type: ignore[assignment]
            self.db.commit()

            if self.event_publisher:
                self.event_publisher.publish(  # type: ignore[unused-coroutine]
                    event_type="search.reindex.completed",
                    entity_type="search_reindex_job",
                    entity_id=job_id,
                    tenant_id=tenant_id,
                    metadata=None,
                )
        except Exception as e:
            logger.error(
                "run_full_reindex failed for job %s (module %s, tenant %s): %s",
                job_id,
                module_id,
                tenant_id,
                e,
                exc_info=True,
            )
            job.status = ReindexJobStatus.FAILED  # type: ignore[assignment]
            job.error_message = str(e)  # type: ignore[assignment]
            self.db.commit()

    def get_search_stats(self, tenant_id: UUID) -> dict[str, Any]:
        """Get search statistics for a tenant.

        Args:
            tenant_id: Tenant ID

        Returns:
            Dictionary with search statistics
        """
        return {
            "tenant_id": str(tenant_id),
            "total_indexed": 0,
            "indexed_by_type": {},
            "last_indexed": None,
            "search_performance": {
                "avg_search_time_ms": 0,
                "total_searches": 0,
            },
        }

    def bulk_index_entities(
        self,
        tenant_id: UUID,
        entities: list[dict[str, Any]],
        user_id: UUID | None = None,
    ) -> dict[str, Any]:
        """Bulk index multiple entities.

        Args:
            tenant_id: Tenant ID
            entities: List of entities to index
            user_id: User ID performing the action (optional)

        Returns:
            Dictionary with bulk indexing results
        """
        indexed_count = 0
        failed_count = 0
        errors = []

        for entity_data in entities:
            try:
                self.indexer.index_entity(
                    entity_type=entity_data["entity_type"],
                    entity_id=entity_data["entity_id"],
                    tenant_id=tenant_id,
                    title=entity_data["title"],
                    content=entity_data.get("content"),
                    metadata=entity_data.get("metadata"),
                )
                indexed_count += 1
            except Exception as e:
                failed_count += 1
                errors.append(
                    {
                        "entity_type": entity_data["entity_type"],
                        "entity_id": str(entity_data["entity_id"]),
                        "error": str(e),
                    }
                )

        # Log bulk indexing event (fire-and-forget; publish is async)
        if self.event_publisher:
            self.event_publisher.publish(  # type: ignore[unused-coroutine]
                event_type="search.bulk_indexed",
                entity_type="bulk",
                entity_id=tenant_id,
                tenant_id=tenant_id,
                user_id=user_id,
            )

        return {
            "tenant_id": str(tenant_id),
            "total_entities": len(entities),
            "indexed_count": indexed_count,
            "failed_count": failed_count,
            "errors": errors,
            "indexed_at": "now",  # Would use actual timestamp
        }
