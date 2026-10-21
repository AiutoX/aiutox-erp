"""Task time tracking endpoints."""

import logging
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from aiutox_sdk.auth import get_user_permissions, limiter, require_permission
from aiutox_sdk.db import get_db
from aiutox_sdk.response import StandardListResponse, StandardResponse
from aiutox_sdk.schemas import (
    TimeEntryManualCreate,
    TimeEntryResponse,
    TimeEntryStartCreate,
)
from aiutox_sdk.tasks import TaskService
from aiutox_sdk.users import User
from fastapi import APIRouter, Depends, Path, Request, status
from sqlalchemy.orm import Session

from aiutox_sdk.exceptions import APIException, raise_forbidden
from app.core.auth.permissions import has_permission
from app.core.tasks.models.time_entry import TimeEntry
from app.core.tasks.ownership import user_owns_task

logger = logging.getLogger(__name__)

router = APIRouter()


def get_task_service(db: Annotated[Session, Depends(get_db)]) -> TaskService:
    """Dependency to get TaskService."""
    return TaskService(db)


def _get_existing_task(task_id: UUID, tenant_id: UUID, service: TaskService):
    """Fetch a task or raise 404, scoped to the tenant. Does NOT check ownership."""
    task = service.get_task(task_id, tenant_id)
    if not task:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="TASK_NOT_FOUND",
            message=f"Task {task_id} not found",
        )
    return task


@router.get(
    "/{task_id}/time-entries",
    response_model=StandardListResponse[TimeEntryResponse],
    status_code=status.HTTP_200_OK,
    summary="List time entries for a task",
    description="List all time entries for a task, most recent first. Requires tasks.view permission.",
)
async def list_time_entries(
    task_id: Annotated[UUID, Path(..., description="Task ID")],
    current_user: Annotated[User, Depends(require_permission("tasks.view"))],
    service: Annotated[TaskService, Depends(get_task_service)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardListResponse[TimeEntryResponse]:
    """List time entries for a task."""
    _get_existing_task(task_id, current_user.tenant_id, service)

    entries = (
        db.query(TimeEntry)
        .filter(
            TimeEntry.tenant_id == current_user.tenant_id,
            TimeEntry.task_id == task_id,
        )
        .order_by(TimeEntry.start_time.desc())
        .all()
    )

    return StandardListResponse(
        data=[TimeEntryResponse.model_validate(e) for e in entries],
        meta={
            "total": len(entries),
            "page": 1,
            "page_size": len(entries) if entries else 20,
            "total_pages": 1,
        },
        message="Time entries retrieved successfully",
    )


@router.get(
    "/{task_id}/time-entries/active",
    response_model=StandardResponse[TimeEntryResponse | None],
    status_code=status.HTTP_200_OK,
    summary="Get active time tracking session",
    description="Get the current user's active (unstopped) time entry for a task, if any. Requires tasks.view permission.",
)
async def get_active_time_entry(
    task_id: Annotated[UUID, Path(..., description="Task ID")],
    current_user: Annotated[User, Depends(require_permission("tasks.view"))],
    service: Annotated[TaskService, Depends(get_task_service)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[TimeEntryResponse | None]:
    """Get the current user's active time tracking session for a task."""
    _get_existing_task(task_id, current_user.tenant_id, service)

    entry = (
        db.query(TimeEntry)
        .filter(
            TimeEntry.tenant_id == current_user.tenant_id,
            TimeEntry.task_id == task_id,
            TimeEntry.user_id == current_user.id,
            TimeEntry.end_time.is_(None),
        )
        .order_by(TimeEntry.start_time.desc())
        .first()
    )

    return StandardResponse(
        data=TimeEntryResponse.model_validate(entry) if entry else None,
        message="Active time entry retrieved successfully",
    )


@router.post(
    "/{task_id}/time-entries",
    response_model=StandardResponse[TimeEntryResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Start time tracking session",
    description="Start a new time tracking session for the current user on a task. Requires tasks.manage permission.",
)
@limiter.limit("30/minute")
async def start_time_entry(
    request: Request,
    task_id: Annotated[UUID, Path(..., description="Task ID")],
    current_user: Annotated[User, Depends(require_permission("tasks.manage"))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[TaskService, Depends(get_task_service)],
    db: Annotated[Session, Depends(get_db)],
    payload: TimeEntryStartCreate,
) -> StandardResponse[TimeEntryResponse]:
    """Start a time tracking session."""
    task = _get_existing_task(task_id, current_user.tenant_id, service)

    if not user_owns_task(task, current_user.id, user_permissions):
        raise_forbidden(
            code="AUTH_INSUFFICIENT_PERMISSIONS",
            message="Insufficient permissions",
            details={"required_permission": "tasks.manage.all"},
        )

    existing_active = (
        db.query(TimeEntry)
        .filter(
            TimeEntry.tenant_id == current_user.tenant_id,
            TimeEntry.task_id == task_id,
            TimeEntry.user_id == current_user.id,
            TimeEntry.end_time.is_(None),
        )
        .first()
    )
    if existing_active:
        raise APIException(
            status_code=status.HTTP_409_CONFLICT,
            code="TIME_ENTRY_ALREADY_ACTIVE",
            message="A time tracking session is already active for this task",
        )

    entry = TimeEntry(
        tenant_id=current_user.tenant_id,
        task_id=task_id,
        user_id=current_user.id,
        start_time=datetime.now(UTC),
        notes=payload.notes,
        entry_type="timer",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return StandardResponse(
        data=TimeEntryResponse.model_validate(entry),
        message="Time tracking session started",
    )


@router.put(
    "/{task_id}/time-entries/{entry_id}",
    response_model=StandardResponse[TimeEntryResponse],
    status_code=status.HTTP_200_OK,
    summary="Stop time tracking session",
    description="Stop an active time tracking session and calculate its duration. Requires tasks.manage permission.",
)
async def stop_time_entry(
    task_id: Annotated[UUID, Path(..., description="Task ID")],
    entry_id: Annotated[UUID, Path(..., description="Time entry ID")],
    current_user: Annotated[User, Depends(require_permission("tasks.manage"))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[TaskService, Depends(get_task_service)],
    db: Annotated[Session, Depends(get_db)],
) -> StandardResponse[TimeEntryResponse]:
    """Stop a time tracking session."""
    task = _get_existing_task(task_id, current_user.tenant_id, service)

    if not user_owns_task(task, current_user.id, user_permissions):
        raise_forbidden(
            code="AUTH_INSUFFICIENT_PERMISSIONS",
            message="Insufficient permissions",
            details={"required_permission": "tasks.manage.all"},
        )

    entry = (
        db.query(TimeEntry)
        .filter(
            TimeEntry.tenant_id == current_user.tenant_id,
            TimeEntry.task_id == task_id,
            TimeEntry.id == entry_id,
        )
        .first()
    )
    if not entry:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="TIME_ENTRY_NOT_FOUND",
            message=f"Time entry {entry_id} not found",
        )

    if entry.user_id != current_user.id and not has_permission(
        user_permissions, "tasks.manage.all"
    ):
        raise_forbidden(
            code="AUTH_INSUFFICIENT_PERMISSIONS",
            message="Only the time entry's own author can stop it",
            details={"required_permission": "tasks.manage.all"},
        )

    if entry.end_time is not None:
        raise APIException(
            status_code=status.HTTP_409_CONFLICT,
            code="TIME_ENTRY_ALREADY_STOPPED",
            message="This time entry has already been stopped",
        )

    now = datetime.now(UTC)
    entry.end_time = now
    entry.duration_seconds = Decimal(str((now - entry.start_time).total_seconds()))
    db.commit()
    db.refresh(entry)

    return StandardResponse(
        data=TimeEntryResponse.model_validate(entry),
        message="Time tracking session stopped",
    )


@router.post(
    "/{task_id}/time-entries/manual",
    response_model=StandardResponse[TimeEntryResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add manual time entry",
    description="Add a manual (non-timer) time entry for the current user on a task. Requires tasks.manage permission.",
)
@limiter.limit("30/minute")
async def add_manual_time_entry(
    request: Request,
    task_id: Annotated[UUID, Path(..., description="Task ID")],
    current_user: Annotated[User, Depends(require_permission("tasks.manage"))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[TaskService, Depends(get_task_service)],
    db: Annotated[Session, Depends(get_db)],
    payload: TimeEntryManualCreate,
) -> StandardResponse[TimeEntryResponse]:
    """Add a manual time entry."""
    task = _get_existing_task(task_id, current_user.tenant_id, service)

    if not user_owns_task(task, current_user.id, user_permissions):
        raise_forbidden(
            code="AUTH_INSUFFICIENT_PERMISSIONS",
            message="Insufficient permissions",
            details={"required_permission": "tasks.manage.all"},
        )

    if payload.end_time <= payload.start_time:
        raise APIException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="VALIDATION_ERROR",
            message="end_time must be after start_time",
        )

    duration_seconds = (payload.end_time - payload.start_time).total_seconds()
    entry = TimeEntry(
        tenant_id=current_user.tenant_id,
        task_id=task_id,
        user_id=current_user.id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        duration_seconds=duration_seconds,
        notes=payload.notes,
        entry_type="manual",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return StandardResponse(
        data=TimeEntryResponse.model_validate(entry),
        message="Time entry added successfully",
    )


@router.delete(
    "/{task_id}/time-entries/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete time entry",
    description="Delete a time entry. Requires tasks.manage permission.",
)
async def delete_time_entry(
    task_id: Annotated[UUID, Path(..., description="Task ID")],
    entry_id: Annotated[UUID, Path(..., description="Time entry ID")],
    current_user: Annotated[User, Depends(require_permission("tasks.manage"))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[TaskService, Depends(get_task_service)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Delete a time entry."""
    task = _get_existing_task(task_id, current_user.tenant_id, service)

    if not user_owns_task(task, current_user.id, user_permissions):
        raise_forbidden(
            code="AUTH_INSUFFICIENT_PERMISSIONS",
            message="Insufficient permissions",
            details={"required_permission": "tasks.manage.all"},
        )

    entry = (
        db.query(TimeEntry)
        .filter(
            TimeEntry.tenant_id == current_user.tenant_id,
            TimeEntry.task_id == task_id,
            TimeEntry.id == entry_id,
        )
        .first()
    )
    if not entry:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="TIME_ENTRY_NOT_FOUND",
            message=f"Time entry {entry_id} not found",
        )

    if entry.user_id != current_user.id and not has_permission(
        user_permissions, "tasks.manage.all"
    ):
        raise_forbidden(
            code="AUTH_INSUFFICIENT_PERMISSIONS",
            message="Only the time entry's own author can delete it",
            details={"required_permission": "tasks.manage.all"},
        )

    db.delete(entry)
    db.commit()
