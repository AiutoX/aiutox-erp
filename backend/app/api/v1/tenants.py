"""Tenant management router — owner-only access."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.auth.dependencies import require_roles
from app.core.db.deps import get_db
from app.core.users.models import User
from app.schemas.common import PaginationMeta, StandardListResponse, StandardResponse
from app.schemas.tenant import TenantCreate, TenantResponse, TenantUpdate
from app.services.tenant_service import TenantService

router = APIRouter()


@router.get(
    "",
    response_model=StandardListResponse[TenantResponse],
    status_code=status.HTTP_200_OK,
    summary="List tenants",
    description="List all tenants with pagination. Requires owner role.",
)
async def list_tenants(
    current_user: Annotated[User, Depends(require_roles("owner"))],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    active_only: bool | None = Query(None, description="Filter by active status"),
) -> StandardListResponse[TenantResponse]:
    svc = TenantService(db)
    tenants, total = svc.list_tenants(
        page=page, page_size=page_size, active_only=active_only
    )
    import math

    total_pages = math.ceil(total / page_size) if total > 0 else 1
    return StandardListResponse(
        data=[TenantResponse(**t) for t in tenants],
        meta=PaginationMeta(
            total=total, page=page, page_size=page_size, total_pages=total_pages
        ),
    )


@router.post(
    "",
    response_model=StandardResponse[TenantResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create tenant",
    description="Create a new tenant. Requires owner role.",
)
async def create_tenant(
    current_user: Annotated[User, Depends(require_roles("owner"))],
    db: Annotated[Session, Depends(get_db)],
    body: TenantCreate,
) -> StandardResponse[TenantResponse]:
    svc = TenantService(db)
    tenant = svc.create_tenant(body)
    return StandardResponse(data=TenantResponse(**tenant))


@router.get(
    "/{tenant_id}",
    response_model=StandardResponse[TenantResponse],
    status_code=status.HTTP_200_OK,
    summary="Get tenant",
    description="Get a single tenant by ID. Requires owner role.",
)
async def get_tenant(
    current_user: Annotated[User, Depends(require_roles("owner"))],
    db: Annotated[Session, Depends(get_db)],
    tenant_id: UUID,
) -> StandardResponse[TenantResponse]:
    svc = TenantService(db)
    tenant = svc.get_tenant(tenant_id)
    return StandardResponse(data=TenantResponse(**tenant))


@router.put(
    "/{tenant_id}",
    response_model=StandardResponse[TenantResponse],
    status_code=status.HTTP_200_OK,
    summary="Update tenant",
    description="Update tenant name or active status. Slug is immutable. Requires owner role.",
)
async def update_tenant(
    current_user: Annotated[User, Depends(require_roles("owner"))],
    db: Annotated[Session, Depends(get_db)],
    tenant_id: UUID,
    body: TenantUpdate,
) -> StandardResponse[TenantResponse]:
    svc = TenantService(db)
    tenant = svc.update_tenant(tenant_id, body)
    return StandardResponse(data=TenantResponse(**tenant))


@router.delete(
    "/{tenant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete tenant",
    description="Delete a tenant. Only allowed if the tenant has no users. Requires owner role.",
)
async def delete_tenant(
    current_user: Annotated[User, Depends(require_roles("owner"))],
    db: Annotated[Session, Depends(get_db)],
    tenant_id: UUID,
) -> None:
    svc = TenantService(db)
    svc.delete_tenant(tenant_id)
