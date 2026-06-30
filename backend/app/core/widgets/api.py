"""Widget preference API — available widgets + user preferences."""

from __future__ import annotations

import dataclasses
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_current_user
from app.core.db.deps import get_db
from app.core.module_registry import get_module_registry
from app.core.users.models import User
from app.core.widgets.registry import WidgetRegistry
from app.core.widgets.schemas import (
    WidgetManifestOut,
    WidgetPreferenceBatchItem,
    WidgetPreferenceCreate,
    WidgetPreferenceOut,
)
from app.core.widgets.service import WidgetPreferenceService
from app.schemas.common import PaginationMeta, StandardListResponse, StandardResponse

# Registered at /api/v1/widgets
router = APIRouter()

# Registered at /api/v1/users/me/widgets
user_widgets_router = APIRouter()


def _build_widget_registry() -> WidgetRegistry:
    try:
        reg = get_module_registry()
        modules = list(reg.get_all_modules().values())
    except RuntimeError:
        modules = []
    return WidgetRegistry(modules=modules)


# ─── GET /widgets/available ──────────────────────────────────────────────────


@router.get(
    "/available",
    response_model=StandardListResponse[WidgetManifestOut],
    summary="List all widgets available to the tenant based on enabled modules",
)
def get_available_widgets(
    current_user: Annotated[User, Depends(get_current_user)],
) -> StandardListResponse[WidgetManifestOut]:
    registry = _build_widget_registry()
    manifests = registry.get_available_widgets(current_user.tenant_id)
    out = [WidgetManifestOut(**dataclasses.asdict(m)) for m in manifests]
    total = len(out)
    return StandardListResponse(
        data=out,
        meta=PaginationMeta(
            total=total, page=1, page_size=max(total, 1), total_pages=1
        ),
        error=None,
    )


# ─── GET /users/me/widgets ───────────────────────────────────────────────────


@user_widgets_router.get(
    "",
    response_model=StandardListResponse[WidgetPreferenceOut],
    summary="Get the authenticated user's widget layout (returns defaults if none saved)",
)
def get_my_widgets(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardListResponse[WidgetPreferenceOut]:
    svc = WidgetPreferenceService(db)
    prefs = svc.get_preferences(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )
    out = [WidgetPreferenceOut.model_validate(p) for p in prefs]
    total = len(out)
    return StandardListResponse(
        data=out,
        meta=PaginationMeta(
            total=total, page=1, page_size=max(total, 1), total_pages=1
        ),
        error=None,
    )


# ─── PUT /users/me/widgets ───────────────────────────────────────────────────


@user_widgets_router.put(
    "",
    response_model=StandardListResponse[WidgetPreferenceOut],
    summary="Batch-update widget positions and sizes for the authenticated user",
)
def put_my_widgets(
    body: list[WidgetPreferenceBatchItem],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardListResponse[WidgetPreferenceOut]:
    svc = WidgetPreferenceService(db)
    prefs = svc.batch_update(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        items=[item.model_dump() for item in body],
    )
    db.commit()
    out = [WidgetPreferenceOut.model_validate(p) for p in prefs]
    total = len(out)
    return StandardListResponse(
        data=out,
        meta=PaginationMeta(
            total=total, page=1, page_size=max(total, 1), total_pages=1
        ),
        error=None,
    )


# ─── POST /users/me/widgets/{widget_id} ──────────────────────────────────────


@user_widgets_router.post(
    "/{widget_id}",
    response_model=StandardResponse[WidgetPreferenceOut],
    summary="Add a widget to the user's dashboard (raises 409 if already added)",
)
def add_widget(
    widget_id: str,
    body: WidgetPreferenceCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[WidgetPreferenceOut]:
    svc = WidgetPreferenceService(db)
    pref = svc.add_preference(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        widget_id=widget_id,
        position_x=body.position_x,
        position_y=body.position_y,
        width=body.width,
        height=body.height,
        settings_json=body.settings_json,
    )
    db.commit()
    db.refresh(pref)
    return StandardResponse(
        data=WidgetPreferenceOut.model_validate(pref), meta=None, error=None
    )


# ─── DELETE /users/me/widgets/{widget_id} ────────────────────────────────────


@user_widgets_router.delete(
    "/{widget_id}",
    response_model=StandardResponse[None],
    summary="Remove a widget from the user's dashboard (raises 404 if not found)",
)
def remove_widget(
    widget_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[None]:
    svc = WidgetPreferenceService(db)
    svc.remove_preference(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        widget_id=widget_id,
    )
    db.commit()
    return StandardResponse(data=None, meta=None, error=None)
