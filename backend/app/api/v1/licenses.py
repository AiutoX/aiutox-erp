"""License JWT endpoints — P10-T04 + P10-T09 + P10-T10.

Routes (all under /api/v1 prefix via lazy_router):
  POST /admin/licenses/activate   — validate JWT, store in tenant_licenses
  GET  /tenants/me/license        — return active license info (no raw token)
  POST /admin/licenses/revoke     — revoke by jti, invalidate cache
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_current_user
from app.core.db.deps import get_db
from app.core.exceptions import raise_not_found, raise_unauthorized
from app.core.licensing.activation import LicenseActivationService
from app.core.licensing.exceptions import LicenseError
from app.core.users.models import User
from app.schemas.common import StandardResponse

router = APIRouter()


class LicenseActivateRequest(BaseModel):
    model_config = ConfigDict()
    token: str


class LicenseRevokeRequest(BaseModel):
    model_config = ConfigDict()
    license_jti: str


class LicenseInfoResponse(BaseModel):
    model_config = ConfigDict()
    license_jti: str | None = None
    expires_at: Any = None
    modules: dict[str, str] = {}
    is_active: bool = False


@router.post("/admin/licenses/activate")
async def activate_license(
    payload: LicenseActivateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[LicenseInfoResponse]:
    """Activate a License JWT for the current tenant."""
    svc = LicenseActivationService(db=db, user_id=str(current_user.id))
    try:
        record = svc.activate(
            token=payload.token,
            tenant_id=str(current_user.tenant_id),
        )
    except LicenseError as e:
        raise_unauthorized(code="LICENSE_INVALID", message=str(e))

    import json

    return StandardResponse(
        data=LicenseInfoResponse(
            license_jti=record.license_jti,
            expires_at=record.expires_at,
            modules=json.loads(record.modules_json),
            is_active=record.is_active,
        )
    )


@router.get("/tenants/me/license")
async def get_my_license(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[LicenseInfoResponse]:
    """Return the active license info for the current tenant (no raw token)."""
    svc = LicenseActivationService(db=db)
    record = svc.get_active_license(str(current_user.tenant_id))

    if not record:
        return StandardResponse(data=LicenseInfoResponse())

    import json

    return StandardResponse(
        data=LicenseInfoResponse(
            license_jti=record.license_jti,
            expires_at=record.expires_at,
            modules=json.loads(record.modules_json),
            is_active=record.is_active,
        )
    )


@router.post("/admin/licenses/revoke")
async def revoke_license(
    payload: LicenseRevokeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[dict]:
    """Revoke an active license by jti."""
    svc = LicenseActivationService(db=db)
    found = svc.revoke(payload.license_jti)
    if not found:
        raise_not_found("license", payload.license_jti)
    return StandardResponse(data={"revoked": True, "license_jti": payload.license_jti})
