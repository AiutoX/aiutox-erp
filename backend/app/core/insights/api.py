"""Insights API — 3 enterprise-tier leadership endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth.dependencies import require_permission, require_roles
from app.core.db.deps import get_db
from app.core.insights.schemas import (
    BillingMonthlyRevenueRow,
    CrmPipelineRow,
    MaintenanceBacklogRow,
)
from app.core.insights.service import InsightsService
from app.core.tiers.decorators import require_tier
from app.core.users.models import User
from app.schemas.common import PaginationMeta, StandardListResponse

router = APIRouter()


# ─── GET /insights/billing/monthly_revenue ───────────────────────────────────


@router.get(
    "/billing/monthly_revenue",
    response_model=StandardListResponse[BillingMonthlyRevenueRow],
    summary="Monthly revenue aggregates — requires billing.enterprise tier",
)
def get_billing_monthly_revenue(
    current_user: Annotated[User, Depends(require_permission("insights.read"))],
    db: Annotated[Session, Depends(get_db)],
    months: int = Query(default=12, ge=1, le=36),
    _tier=require_tier("billing.enterprise"),
    _role=Depends(require_roles("manager", "admin", "owner")),
) -> StandardListResponse[BillingMonthlyRevenueRow]:
    svc = InsightsService(db)
    rows = svc.get_billing_monthly_revenue(
        tenant_id=current_user.tenant_id, months=months
    )
    out = [BillingMonthlyRevenueRow.model_validate(r) for r in rows]
    total = len(out)
    return StandardListResponse(
        data=out,
        meta=PaginationMeta(
            total=total, page=1, page_size=max(total, 1), total_pages=1
        ),
        error=None,
    )


# ─── GET /insights/maintenance/backlog ───────────────────────────────────────


@router.get(
    "/maintenance/backlog",
    response_model=StandardListResponse[MaintenanceBacklogRow],
    summary="Maintenance backlog by technician — requires maintenance.enterprise tier",
)
def get_maintenance_backlog(
    current_user: Annotated[User, Depends(require_permission("insights.read"))],
    db: Annotated[Session, Depends(get_db)],
    _tier=require_tier("maintenance.enterprise"),
    _role=Depends(require_roles("manager", "admin", "owner")),
) -> StandardListResponse[MaintenanceBacklogRow]:
    svc = InsightsService(db)
    rows = svc.get_maintenance_backlog(tenant_id=current_user.tenant_id)
    out = [MaintenanceBacklogRow.model_validate(r) for r in rows]
    total = len(out)
    return StandardListResponse(
        data=out,
        meta=PaginationMeta(
            total=total, page=1, page_size=max(total, 1), total_pages=1
        ),
        error=None,
    )


# ─── GET /insights/crm/pipeline ──────────────────────────────────────────────


@router.get(
    "/crm/pipeline",
    response_model=StandardListResponse[CrmPipelineRow],
    summary="CRM pipeline by stage — requires crm.enterprise tier",
)
def get_crm_pipeline(
    current_user: Annotated[User, Depends(require_permission("insights.read"))],
    db: Annotated[Session, Depends(get_db)],
    _tier=require_tier("crm.enterprise"),
    _role=Depends(require_roles("manager", "admin", "owner")),
) -> StandardListResponse[CrmPipelineRow]:
    svc = InsightsService(db)
    rows = svc.get_crm_pipeline(tenant_id=current_user.tenant_id)
    out = [CrmPipelineRow.model_validate(r) for r in rows]
    total = len(out)
    return StandardListResponse(
        data=out,
        meta=PaginationMeta(
            total=total, page=1, page_size=max(total, 1), total_pages=1
        ),
        error=None,
    )
