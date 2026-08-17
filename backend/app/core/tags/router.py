"""FastAPI router for tags module."""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_current_user
from app.core.db.deps import get_db
from app.core.tags.models import Tag
from app.core.tags.schemas import (
    EntityTagCreate,
    EntityTagRead,
    EntityTagsResponse,
    TagCategoryCreate,
    TagCategoryRead,
    TagCategoryUpdate,
    TagCreate,
    TagListResponse,
    TagRead,
    TagUpdate,
)
from app.core.tags.service import TagService
from app.core.users.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tags", tags=["tags"])

CurrentUser = Annotated[User, Depends(get_current_user)]


def get_tag_service(db: Session = Depends(get_db)) -> TagService:
    """Get tag service instance."""
    return TagService(db)


# ======================
# TAG ENDPOINTS
# ======================


@router.post("/", response_model=TagRead, status_code=201)
async def create_tag(
    tag_data: TagCreate,
    current_user: CurrentUser = Depends(),
    service: TagService = Depends(get_tag_service),
) -> Tag:
    """Create a new tag.

    Requires: tags.write permission
    """
    # Note: RBAC check should be done by middleware/decorator
    # This is a placeholder - actual implementation will include permission checking
    tag = service.create_tag(
        name=tag_data.name,
        tenant_id=current_user.tenant_id,
        color=tag_data.color,
        description=tag_data.description,
        category_id=tag_data.category_id,
    )
    return tag


@router.get("/{tag_id}", response_model=TagRead)
async def get_tag(
    tag_id: UUID,
    current_user: CurrentUser = Depends(),
    service: TagService = Depends(get_tag_service),
) -> Tag | None:
    """Get a tag by ID.

    Requires: tags.read permission
    """
    tag = service.get_tag(tag_id, current_user.tenant_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.get("/", response_model=TagListResponse)
async def list_tags(
    category_id: UUID | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(),
    service: TagService = Depends(get_tag_service),
) -> TagListResponse:
    """List all tags for the tenant.

    Requires: tags.read permission
    """
    tags = service.get_all_tags(current_user.tenant_id, category_id=category_id)
    # Apply pagination
    paginated_tags = tags[offset : offset + limit]
    return TagListResponse(
        tags=[TagRead.model_validate(t) for t in paginated_tags],  # type: ignore[arg-type]
        total=len(tags),
        limit=limit,
        offset=offset,
    )


@router.put("/{tag_id}", response_model=TagRead)
async def update_tag(
    tag_id: UUID,
    tag_data: TagUpdate,
    current_user: CurrentUser = Depends(),
    service: TagService = Depends(get_tag_service),
) -> Tag | None:
    """Update a tag.

    Requires: tags.write permission
    """
    tag = service.update_tag(
        tag_id=tag_id,
        tenant_id=current_user.tenant_id,
        name=tag_data.name,
        color=tag_data.color,
        description=tag_data.description,
        category_id=tag_data.category_id,
    )
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: UUID,
    current_user: CurrentUser = Depends(),
    service: TagService = Depends(get_tag_service),
) -> None:
    """Delete a tag (soft delete).

    Requires: tags.delete permission
    """
    success = service.delete_tag(tag_id, current_user.tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tag not found")


@router.post("/search", response_model=TagListResponse)
async def search_tags(
    query: str = Query(..., min_length=1),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(),
    service: TagService = Depends(get_tag_service),
) -> TagListResponse:
    """Search tags by name.

    Requires: tags.read permission
    """
    results = service.search_tags(current_user.tenant_id, query)
    paginated_results = results[offset : offset + limit]
    return TagListResponse(
        tags=[TagRead.model_validate(t) for t in paginated_results],  # type: ignore[arg-type]
        total=len(results),
        limit=limit,
        offset=offset,
    )


# ======================
# ENTITY TAG ENDPOINTS
# ======================


@router.post("/entities/apply", response_model=EntityTagRead, status_code=201)
async def apply_tag_to_entity(
    entity_tag_data: EntityTagCreate,
    current_user: CurrentUser = Depends(),
    service: TagService = Depends(get_tag_service),
) -> EntityTagRead:
    """Apply a tag to an entity (polymorphic).

    Requires: tags.write permission
    """
    entity_tag = service.add_tag_to_entity(
        tag_id=entity_tag_data.tag_id,
        entity_type=entity_tag_data.entity_type,
        entity_id=entity_tag_data.entity_id,
        tenant_id=current_user.tenant_id,
    )
    return entity_tag


@router.delete("/entities/{entity_type}/{entity_id}/{tag_id}", status_code=204)
async def remove_tag_from_entity(
    entity_type: str,
    entity_id: UUID,
    tag_id: UUID,
    current_user: CurrentUser = Depends(),
    service: TagService = Depends(get_tag_service),
) -> None:
    """Remove a tag from an entity.

    Requires: tags.delete permission
    """
    success = service.remove_tag_from_entity(
        tag_id=tag_id,
        entity_type=entity_type,
        entity_id=entity_id,
        tenant_id=current_user.tenant_id,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Tag-entity relationship not found")


@router.get(
    "/entities/{entity_type}/{entity_id}",
    response_model=EntityTagsResponse,
)
async def get_entity_tags(
    entity_type: str,
    entity_id: UUID,
    current_user: CurrentUser = Depends(),
    service: TagService = Depends(get_tag_service),
) -> EntityTagsResponse:
    """Get all tags for an entity.

    Requires: tags.read permission
    """
    tags = service.get_entity_tags(entity_type, entity_id, current_user.tenant_id)
    return EntityTagsResponse(
        entity_type=entity_type,
        entity_id=entity_id,
        tags=[TagRead.model_validate(t) for t in tags],  # type: ignore[arg-type]
        total=len(tags),
    )


# ======================
# TAG CATEGORY ENDPOINTS
# ======================


@router.post("/categories", response_model=TagCategoryRead, status_code=201)
async def create_tag_category(
    category_data: TagCategoryCreate,
    current_user: CurrentUser = Depends(),
    service: TagService = Depends(get_tag_service),
) -> TagCategoryRead:
    """Create a new tag category.

    Requires: tags.admin permission
    """
    category = service.create_category(
        name=category_data.name,
        tenant_id=current_user.tenant_id,
        color=category_data.color,
        description=category_data.description,
        parent_id=category_data.parent_id,
        sort_order=category_data.sort_order,
    )
    return category


@router.get("/categories", response_model=list[TagCategoryRead])
async def list_tag_categories(
    current_user: CurrentUser = Depends(),
    service: TagService = Depends(get_tag_service),
) -> list[TagCategoryRead]:
    """List all tag categories for the tenant.

    Requires: tags.read permission
    """
    categories = service.get_all_categories(current_user.tenant_id)
    return categories  # type: ignore[return-value]


@router.put("/categories/{category_id}", response_model=TagCategoryRead)
async def update_tag_category(
    category_id: UUID,
    category_data: TagCategoryUpdate,
    current_user: CurrentUser = Depends(),
    service: TagService = Depends(get_tag_service),
) -> TagCategoryRead:
    """Update a tag category.

    Requires: tags.admin permission
    """
    # Note: update_category method needs to be added to service
    raise HTTPException(status_code=501, detail="Not implemented")
