"""Marketplace API — catalog discovery and trial purchase endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_current_user
from app.core.db.deps import get_db
from app.core.exceptions import raise_not_found
from app.core.marketplace import is_marketplace_enabled
from app.core.marketplace.catalog import CatalogLoader, ModuleCatalogEntry
from app.core.marketplace.purchase_service import PurchaseService
from app.core.marketplace.schemas import PurchaseRequest, PurchaseResult
from app.core.users.models import User
from app.schemas.common import PaginationMeta, StandardListResponse, StandardResponse

router = APIRouter()


def _require_marketplace_enabled() -> None:
    """Dependency that raises 404 when marketplace feature flag is off."""
    if not is_marketplace_enabled():
        raise_not_found("Marketplace", "feature disabled")


# ─── GET /marketplace/catalog ─────────────────────────────────────────────────


@router.get(
    "/catalog",
    response_model=StandardListResponse[ModuleCatalogEntry],
    summary="List available modules in the marketplace catalog",
    dependencies=[Depends(_require_marketplace_enabled)],
)
def list_catalog(
    current_user: Annotated[User, Depends(get_current_user)],
    category: str | None = Query(default=None, description="Filter by category"),
) -> StandardListResponse[ModuleCatalogEntry]:
    if category:
        entries = CatalogLoader.filter_by_category(category)
    else:
        entries = CatalogLoader.load()

    total = len(entries)
    return StandardListResponse(
        data=entries,
        meta=PaginationMeta(total=total, page=1, page_size=total or 1, total_pages=1),
        error=None,
    )


# ─── GET /marketplace/catalog/{module_id} ────────────────────────────────────


@router.get(
    "/catalog/{module_id}",
    response_model=StandardResponse[ModuleCatalogEntry],
    summary="Get marketplace catalog detail for a single module",
    dependencies=[Depends(_require_marketplace_enabled)],
)
def get_catalog_detail(
    module_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[ModuleCatalogEntry]:
    entry = CatalogLoader.get_by_id(module_id)
    if not entry:
        raise_not_found("Module", module_id)

    return StandardResponse(data=entry, meta=None, error=None)


# ─── POST /marketplace/purchase ───────────────────────────────────────────────


@router.post(
    "/purchase",
    response_model=StandardResponse[PurchaseResult],
    summary="Purchase or trial-activate a module",
    dependencies=[Depends(_require_marketplace_enabled)],
)
def purchase_module(
    body: PurchaseRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[PurchaseResult]:
    entry = CatalogLoader.get_by_id(body.module_id)
    if not entry:
        raise_not_found("Module", body.module_id)

    service = PurchaseService(db=db)
    result = service.create_trial(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        entry=entry,
        tier=body.tier,
    )
    db.commit()
    return StandardResponse(data=result, meta=None, error=None)
