"""Templates router for template management."""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.core.auth.dependencies import require_permission
from app.core.db.deps import get_db
from app.core.templates.permissions import (
    TEMPLATES_DELETE,
    TEMPLATES_READ,
    TEMPLATES_WRITE,
)
from app.core.templates.schemas import (
    TemplateCreate,
    TemplateListResponse,
    TemplateRenderRequest,
    TemplateRenderResponse,
    TemplateResponse,
    TemplateUpdate,
)
from app.core.templates.service import TemplateService
from app.core.users.models import User
from app.schemas.common import StandardResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def get_template_service(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission(TEMPLATES_READ))],
) -> TemplateService:
    """Dependency to get TemplateService."""
    return TemplateService(db)


@router.post(
    "/templates",
    response_model=StandardResponse[TemplateResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create template",
    tags=["Templates"],
)
async def create_template(
    current_user: Annotated[User, Depends(require_permission(TEMPLATES_WRITE))],
    service: Annotated[TemplateService, Depends(get_template_service)],
    template_data: TemplateCreate,
) -> StandardResponse[TemplateResponse]:
    """Create a new template."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must have a tenant assigned")

    template = await service.create_template(
        tenant_id=current_user.tenant_id,
        name=template_data.name,
        body=template_data.body,
        description=template_data.description,
        category=template_data.category,
        variables=(
            [v.model_dump() for v in template_data.variables]
            if template_data.variables
            else None
        ),
        is_active=template_data.is_active,
    )

    return StandardResponse(data=template)


@router.get(
    "/templates",
    response_model=StandardResponse[TemplateListResponse],
    summary="List templates",
    tags=["Templates"],
)
async def list_templates(
    current_user: Annotated[User, Depends(require_permission(TEMPLATES_READ))],
    service: Annotated[TemplateService, Depends(get_template_service)],
    category: str | None = Query(None),
    is_active: bool | None = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
) -> StandardResponse[TemplateListResponse]:
    """List templates for tenant."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must have a tenant assigned")

    templates = service.list_templates(
        tenant_id=current_user.tenant_id,
        category=category,
        is_active=is_active,
        skip=skip,
        limit=limit,
    )
    # Count total for pagination
    all_templates = service.list_templates(
        tenant_id=current_user.tenant_id,
        category=category,
        is_active=is_active,
        skip=0,
        limit=10000,  # Large limit to get total count
    )
    total = len(all_templates)

    return StandardResponse(
        data=TemplateListResponse(
            items=[TemplateResponse.model_validate(t) for t in templates],
            total=total,
            skip=skip,
            limit=limit,
        )
    )


@router.get(
    "/templates/{template_id}",
    response_model=StandardResponse[TemplateResponse],
    summary="Get template details",
    tags=["Templates"],
)
async def get_template(
    current_user: Annotated[User, Depends(require_permission(TEMPLATES_READ))],
    service: Annotated[TemplateService, Depends(get_template_service)],
    template_id: UUID = Path(...),
) -> StandardResponse[TemplateResponse]:
    """Get template details."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must have a tenant assigned")

    template = service.get_template(
        template_id=template_id, tenant_id=current_user.tenant_id
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return StandardResponse(data=template)


@router.put(
    "/templates/{template_id}",
    response_model=StandardResponse[TemplateResponse],
    summary="Update template",
    tags=["Templates"],
)
async def update_template(
    current_user: Annotated[User, Depends(require_permission(TEMPLATES_WRITE))],
    service: Annotated[TemplateService, Depends(get_template_service)],
    template_id: UUID = Path(...),
    template_data: TemplateUpdate | None = None,
) -> StandardResponse[TemplateResponse]:
    """Update a template."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must have a tenant assigned")

    template = service.get_template(
        template_id=template_id, tenant_id=current_user.tenant_id
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    updated = service.update_template(
        template=template,
        name=template_data.name if template_data else None,
        body=template_data.body if template_data else None,
        description=template_data.description if template_data else None,
        category=template_data.category if template_data else None,
        variables=(
            [v.model_dump() for v in template_data.variables]
            if template_data and template_data.variables
            else None
        ),
        is_active=template_data.is_active if template_data else None,
    )

    return StandardResponse(data=updated)  # type: ignore[arg-type]


@router.delete(
    "/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete template",
    tags=["Templates"],
)
async def delete_template(
    current_user: Annotated[User, Depends(require_permission(TEMPLATES_DELETE))],
    service: Annotated[TemplateService, Depends(get_template_service)],
    template_id: UUID = Path(...),
) -> None:
    """Delete a template."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must have a tenant assigned")

    template = service.get_template(
        template_id=template_id, tenant_id=current_user.tenant_id
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    service.delete_template(template)


@router.post(
    "/templates/{template_id}/render",
    response_model=StandardResponse[TemplateRenderResponse],
    summary="Render template",
    tags=["Templates"],
)
async def render_template(
    current_user: Annotated[User, Depends(require_permission(TEMPLATES_READ))],
    service: Annotated[TemplateService, Depends(get_template_service)],
    template_id: UUID = Path(...),
    render_data: TemplateRenderRequest | None = None,
) -> StandardResponse[TemplateRenderResponse]:
    """Render a template with provided context."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must have a tenant assigned")

    template = service.get_template(
        template_id=template_id, tenant_id=current_user.tenant_id
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    try:
        rendered_content = await service.render(
            template_id=template_id,
            tenant_id=current_user.tenant_id,
            context=render_data.context if render_data else None,
            entity_type=render_data.entity_type if render_data else None,
            entity_id=render_data.entity_id if render_data else None,
        )

        return StandardResponse(
            data=TemplateRenderResponse(
                rendered_content=rendered_content,
                template_id=template_id,
            )
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/templates/{template_id}/render-history",
    response_model=StandardResponse[list],
    summary="Get render history",
    tags=["Templates"],
)
async def get_render_history(
    current_user: Annotated[User, Depends(require_permission(TEMPLATES_READ))],
    service: Annotated[TemplateService, Depends(get_template_service)],
    template_id: UUID = Path(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
) -> StandardResponse[list]:
    """Get render history for a template."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must have a tenant assigned")

    rendered_templates = service.get_render_history(
        template_id=template_id,
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit,
    )

    return StandardResponse(data=rendered_templates)
