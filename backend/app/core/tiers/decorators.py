"""@require_tier FastAPI dependency for commercial tier gating.

Usage:
    @app.get("/endpoint")
    def my_endpoint(check=require_tier("products.pro")):
        ...

Returns HTTP 402 Payment Required if tenant's active tier is insufficient.
"""

from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_current_user
from app.core.db.deps import get_db
from app.core.tiers.models import _TIER_ORDER
from app.core.tiers.service import TierService
from app.core.users.models import User

_REQUIRE_TIER_MARKER = "require_tier"


def _parse_tier_spec(tier_spec: str) -> tuple[str, str]:
    """Parse 'module.tier' into (module_id, tier). E.g. 'products.pro' -> ('products', 'pro')."""
    parts = tier_spec.rsplit(".", 1)
    if len(parts) != 2:
        raise ValueError(f"Invalid tier spec {tier_spec!r}. Expected 'module.tier'.")
    module_id, tier = parts
    if tier not in _TIER_ORDER:
        raise ValueError(f"Unknown tier {tier!r} in spec {tier_spec!r}.")
    return module_id, tier


def _get_active_tier_for_request(
    module_id: str,
    tenant_id: UUID | str,
    db: Session,
) -> str:
    """Internal helper — separated for test patching."""
    svc = TierService(db=db)
    return svc.get_active_tier(tenant_id, module_id)


def _tier_rank(tier: str) -> int:
    return _TIER_ORDER.get(tier, 0)


def require_tier(tier_spec: str) -> Callable:
    """FastAPI Depends factory that gates a route behind a commercial tier.

    Args:
        tier_spec: Dot-separated 'module.tier', e.g. 'products.pro'.

    Returns:
        A FastAPI dependency that raises HTTP 402 if tenant lacks the required tier.
    """
    module_id, required_tier = _parse_tier_spec(tier_spec)

    def _dependency(
        current_user: Annotated[User, Depends(get_current_user)],
        db: Annotated[Session, Depends(get_db)],
    ) -> None:
        tenant_id = current_user.tenant_id
        current_tier = _get_active_tier_for_request(module_id, tenant_id, db)

        if _tier_rank(current_tier) < _tier_rank(required_tier):
            raise _TierRequiredError(
                module=module_id,
                required=required_tier,
                current=current_tier,
            )

    return Depends(_dependency)


class _TierRequiredError(Exception):
    """Raised by require_tier when tenant tier is insufficient."""

    def __init__(self, module: str, required: str, current: str) -> None:
        self.module = module
        self.required = required
        self.current = current
        super().__init__(f"Tier required: {module}.{required} (current: {current})")


def add_tier_exception_handler(app: object) -> None:
    """Register the 402 exception handler on a FastAPI app instance."""
    from fastapi import FastAPI

    if not isinstance(app, FastAPI):
        return

    @app.exception_handler(_TierRequiredError)
    async def tier_exception_handler(
        request: Request, exc: _TierRequiredError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=402,
            content={
                "error": "tier_required",
                "module": exc.module,
                "required": exc.required,
                "current": exc.current,
            },
        )
