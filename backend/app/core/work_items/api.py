"""WorkItems API — today list, complete, snooze."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_current_user
from app.core.db.deps import get_db
from app.core.users.models import User
from app.core.work_items.schemas import SnoozeRequest, WorkItemOut
from app.core.work_items.service import WorkItemService
from app.schemas.common import PaginationMeta, StandardListResponse, StandardResponse

router = APIRouter()


# ─── GET /work_items/today ────────────────────────────────────────────────────


@router.get(
    "/today",
    response_model=StandardListResponse[WorkItemOut],
    summary="Return today's pending work items for the authenticated user",
)
def get_today(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    category: str | None = Query(default=None),
) -> StandardListResponse[WorkItemOut]:
    svc = WorkItemService(db)
    items = svc.get_today(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        category=category,
    )
    out = [WorkItemOut.model_validate(i) for i in items]
    total = len(out)
    return StandardListResponse(
        data=out,
        meta=PaginationMeta(
            total=total, page=1, page_size=max(total, 1), total_pages=1
        ),
        error=None,
    )


# ─── POST /work_items/{id}/complete ──────────────────────────────────────────


@router.post(
    "/{item_id}/complete",
    response_model=StandardResponse[WorkItemOut],
    summary="Mark a work item as completed",
)
def complete_work_item(
    item_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[WorkItemOut]:
    svc = WorkItemService(db)
    item = svc.complete(item_id=item_id, tenant_id=current_user.tenant_id)
    db.commit()
    db.refresh(item)
    return StandardResponse(
        data=WorkItemOut.model_validate(item), meta=None, error=None
    )


# ─── POST /work_items/{id}/snooze ────────────────────────────────────────────


@router.post(
    "/{item_id}/snooze",
    response_model=StandardResponse[WorkItemOut],
    summary="Snooze a work item until a future datetime",
)
def snooze_work_item(
    item_id: uuid.UUID,
    body: SnoozeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[WorkItemOut]:
    svc = WorkItemService(db)
    item = svc.snooze(
        item_id=item_id, tenant_id=current_user.tenant_id, until=body.until
    )
    db.commit()
    db.refresh(item)
    return StandardResponse(
        data=WorkItemOut.model_validate(item), meta=None, error=None
    )
