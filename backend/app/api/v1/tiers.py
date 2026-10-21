"""Tiers endpoints — tenant tier query + admin tier assignment."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_current_user
from app.core.db.deps import get_db
from app.core.tiers.models import _TIER_ORDER
from app.core.tiers.service import TierService
from app.core.users.models import User
from app.schemas.common import StandardResponse

router = APIRouter()

_VALID_TIERS = list(_TIER_ORDER.keys())


class TierAssignRequest(BaseModel):
    model_config = ConfigDict()

    module_id: str
    tier: str
    expires_at: datetime | None = None
    license_token_jti: str | None = None

    @field_validator("tier")
    @classmethod
    def validate_tier(cls, v: str) -> str:
        if v not in _VALID_TIERS:
            raise ValueError(f"tier must be one of {_VALID_TIERS}, got {v!r}")
        return v


class TierRecordResponse(BaseModel):
    model_config = ConfigDict()

    tenant_id: str
    module_id: str
    tier: str
    expires_at: datetime | None
    license_token_jti: str | None


@router.get(
    "/me/tiers",
    response_model=StandardResponse[dict[str, str]],
    summary="Get active tiers for current tenant",
)
async def get_my_tiers(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[dict[str, str]]:
    """Return all active tiers for the authenticated tenant."""
    svc = TierService(db=db)
    tiers = svc.get_all_tiers(current_user.tenant_id)
    return StandardResponse(data=tiers)


@router.post(
    "/admin/tenants/{tenant_id}/tiers",
    response_model=StandardResponse[TierRecordResponse],
    summary="Admin: assign tier to a tenant module",
)
async def admin_set_tier(
    tenant_id: UUID,
    payload: TierAssignRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[TierRecordResponse]:
    """Assign or update commercial tier for a tenant's module (admin only)."""
    svc = TierService(db=db)
    record = svc.set_tier(
        tenant_id=tenant_id,
        module_id=payload.module_id,
        tier=payload.tier,
        expires_at=payload.expires_at,
        license_token_jti=payload.license_token_jti,
    )
    return StandardResponse(
        data=TierRecordResponse(
            tenant_id=str(record.tenant_id),
            module_id=record.module_id,
            tier=str(record.tier),
            expires_at=record.expires_at,
            license_token_jti=record.license_token_jti,
        )
    )
