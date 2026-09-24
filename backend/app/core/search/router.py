"""Search router.

SRC-002: corrected contract per docs/04-modules/core/search/MODULE-SPEC.md
Section 11 — POST /search (was GET /), GET /suggestions (was GET /suggest),
new GET /searchable-types.
"""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_user_permissions, require_permission
from app.core.db.deps import get_db
from app.core.db.session import SessionLocal
from app.core.exceptions import APIException
from app.core.module_registry import get_module_registry
from app.core.search.schemas import (
    IndexEntityRequest,
    ReindexJobResponse,
    SearchableType,
    SearchRequest,
    SearchResultItem,
    SuggestionItem,
)
from app.core.search.service import SearchService
from app.core.users.models import User
from app.schemas.common import StandardListResponse, StandardResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def _to_search_result_item(row, tenant_id: UUID) -> SearchResultItem:
    """Build the frontend-facing result, resolving the real url_template/icon
    from the owning module's SearchProvider — never guessing a URL shape
    from the raw entity_type string (e.g. "task" -> "/tasks/{id}", not
    "/task/{id}"; every provider's declared template differs from its
    entity_type, see SearchIndexDefinition.url_template). Falls back to a
    generic /{entity_type}/{id} only if the provider can no longer be
    resolved (module disabled/removed after indexing — stale row, not an
    error case worth failing the whole search for).
    """
    registry = get_module_registry()
    provider = registry.get_search_handler(row.module_id, tenant_id)
    definition = provider.get_index_definition() if provider is not None else None

    if definition is not None:
        url = definition.url_template.format(id=row.entity_id)
        icon = definition.icon
    else:
        url = f"/{row.entity_type}/{row.entity_id}"
        icon = None

    return SearchResultItem(
        id=str(row.entity_id),
        type=row.entity_type,
        title=row.title,
        description=row.content,
        url=url,
        icon=icon,
        score=None,
        created_at=row.created_at.isoformat() if row.created_at else None,
        updated_at=row.updated_at.isoformat() if row.updated_at else None,
        metadata={},
    )


@router.post(
    "",
    response_model=StandardListResponse[SearchResultItem],
    summary="Search across entities",
    tags=["Search"],
)
async def search(
    body: SearchRequest,
    current_user: Annotated[User, Depends(require_permission("search.view"))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardListResponse[SearchResultItem]:
    """Search across all registered entities the user is allowed to see."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="USER_NO_TENANT",
            message="User must have a tenant assigned to perform searches",
        )

    service = SearchService(db)
    result = await service.search(
        tenant_id=current_user.tenant_id,
        query=body.query,
        user=current_user,
        user_permissions=user_permissions,
        entity_types=body.entity_types,
        limit=body.limit,
        offset=body.offset,
    )

    items = [
        _to_search_result_item(row, current_user.tenant_id) for row in result["results"]
    ]
    total = result["total"]
    total_pages = (total + body.limit - 1) // body.limit if body.limit else 1

    return StandardListResponse(
        data=items,
        meta={
            "page": (body.offset // body.limit) + 1 if body.limit else 1,
            "page_size": body.limit,
            "total": total,
            "total_pages": total_pages,
        },
        error=None,
    )


@router.get(
    "/suggestions",
    response_model=StandardResponse[list[SuggestionItem]],
    summary="Get search suggestions",
    tags=["Search"],
)
async def suggestions(
    current_user: Annotated[User, Depends(require_permission("search.view"))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    db: Annotated[Session, Depends(get_db)],
    query: str = Query(..., min_length=2, max_length=500),
    limit: int = Query(5, ge=1, le=20),
) -> StandardResponse[list[SuggestionItem]]:
    """Get search suggestions for a query."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="USER_NO_TENANT",
            message="User must have a tenant assigned to perform searches",
        )

    service = SearchService(db)
    raw = await service.get_suggestions(
        tenant_id=current_user.tenant_id,
        query=query,
        user=current_user,
        user_permissions=user_permissions,
        limit=limit,
    )

    return StandardResponse(
        data=[SuggestionItem(**item) for item in raw], meta=None, error=None
    )


@router.get(
    "/searchable-types",
    response_model=StandardResponse[list[SearchableType]],
    summary="List entity types currently searchable for this tenant",
    tags=["Search"],
)
async def searchable_types(
    current_user: Annotated[User, Depends(require_permission("search.view"))],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[list[SearchableType]]:
    """Return the live catalog of entity types this tenant can search.

    Replaces the frontend's previously hardcoded entity-registry.ts — sourced
    from ModuleRegistry.get_search_supported_modules(), never a static list.
    """
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="USER_NO_TENANT",
            message="User must have a tenant assigned",
        )

    service = SearchService(db)
    catalog = service.get_searchable_types(tenant_id=current_user.tenant_id)

    return StandardResponse(
        data=[SearchableType(**item) for item in catalog], meta=None, error=None
    )


@router.post(
    "/index",
    status_code=status.HTTP_201_CREATED,
    summary="Manually index an entity",
    description="Direct/manual indexing — most entities are indexed "
    "automatically via SearchIndexConsumer reacting to domain events. This "
    "is the escape hatch for entities without a registered SearchProvider, "
    "or for test fixtures. Requires search.manage permission.",
    tags=["Search"],
)
async def index_entity(
    body: IndexEntityRequest,
    current_user: Annotated[User, Depends(require_permission("search.manage"))],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[dict]:
    """Index an entity for search directly, bypassing SearchProvider resolution."""
    service = SearchService(db)
    index = service.index_entity(
        entity_type=body.entity_type,
        entity_id=UUID(body.entity_id),
        tenant_id=current_user.tenant_id,
        title=body.title,
        content=body.content,
        metadata=body.metadata,
        user_id=current_user.id,
    )

    return StandardResponse(data=index, meta=None, error=None)


@router.delete(
    "/index/{entity_type}/{entity_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove an entity from the search index",
    tags=["Search"],
)
async def remove_index(
    entity_type: str,
    entity_id: UUID,
    current_user: Annotated[User, Depends(require_permission("search.manage"))],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Remove an entity from the search index."""
    service = SearchService(db)
    deleted = service.remove_index(
        entity_type, entity_id, current_user.tenant_id, user_id=current_user.id
    )
    if not deleted:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="INDEX_NOT_FOUND",
            message=f"Index for {entity_type}:{entity_id} not found",
        )


def _run_reindex_in_background(job_id: UUID, tenant_id: UUID, module_id: str) -> None:
    """Background-task entry point — opens its own DB session, since the
    request-scoped session is closed once the endpoint returns. No real
    async worker exists in this project (see MODULE-SPEC.md Section 17);
    FastAPI BackgroundTasks runs this in the same server process after the
    response is sent.
    """
    db = SessionLocal()
    try:
        registry = get_module_registry()
        provider = registry.get_search_handler(module_id, tenant_id)
        if provider is None:
            logger.error(
                "Reindex job %s: module %s has no SearchProvider or is disabled",
                job_id,
                module_id,
            )
            return

        service = SearchService(db)
        service.run_full_reindex(
            job_id=job_id, tenant_id=tenant_id, module_id=module_id, provider=provider
        )
    finally:
        db.close()


@router.post(
    "/reindex/{module_id}",
    response_model=StandardResponse[ReindexJobResponse],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger a backfill/reindex for one module",
    tags=["Search"],
)
async def reindex(
    module_id: str,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(require_permission("search.manage"))],
    db: Annotated[Session, Depends(get_db)],
    resume_job_id: UUID | None = Query(
        None,
        description="Resume an existing, not-yet-completed job from its "
        "last cursor instead of starting a new one",
    ),
) -> StandardResponse[ReindexJobResponse]:
    """Trigger a paginated, resumable backfill for a module's entities.

    Returns immediately with a job_id; the actual indexing runs in the
    background (FastAPI BackgroundTasks — no real async worker exists in
    this project). Pass resume_job_id to continue an interrupted job from
    its persisted cursor instead of starting over.
    """
    if not current_user.tenant_id:
        raise APIException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="USER_NO_TENANT",
            message="User must have a tenant assigned",
        )

    registry = get_module_registry()
    provider = registry.get_search_handler(module_id, current_user.tenant_id)
    if provider is None:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="SEARCH_PROVIDER_NOT_FOUND",
            message=f"Module '{module_id}' has no SearchProvider or is disabled",
        )

    service = SearchService(db)
    try:
        job = service.get_or_create_reindex_job(
            tenant_id=current_user.tenant_id,
            module_id=module_id,
            resume_job_id=resume_job_id,
        )
    except ValueError as e:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="REINDEX_JOB_INVALID",
            message=str(e),
        ) from e

    background_tasks.add_task(
        _run_reindex_in_background, UUID(str(job.id)), current_user.tenant_id, module_id
    )

    return StandardResponse(
        data=ReindexJobResponse(job_id=str(job.id), status="queued"),
        meta=None,
        error=None,
    )
