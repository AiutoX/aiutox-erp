"""Activities router for activity timeline management."""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.core.activities.permissions import (
    ACTIVITIES_DELETE,
    ACTIVITIES_READ,
    ACTIVITIES_WRITE,
)
from app.core.activities.schemas import (
    ActivityCreate,
    ActivityListResponse,
    ActivityResponse,
    ActivitySearchRequest,
    ActivitySearchResponse,
    ActivityUpdate,
)
from app.core.activities.service import ActivityService
from app.core.auth.dependencies import require_permission
from app.core.db.deps import get_db
from app.core.exceptions import APIException
from app.core.users.models import User
from app.schemas.common import StandardResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def get_activity_service(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission(ACTIVITIES_READ))],
) -> ActivityService:
    """Dependency to get ActivityService."""
    return ActivityService(db)


@router.post(
    "/activities",
    response_model=StandardResponse[ActivityResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create activity",
    tags=["Activities"],
)
async def create_activity(
    current_user: Annotated[User, Depends(require_permission(ACTIVITIES_WRITE))],
    service: Annotated[ActivityService, Depends(get_activity_service)],
    activity_data: ActivityCreate,
) -> StandardResponse[ActivityResponse]:
    """Create a new activity."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=400,
            code="INVALID_REQUEST",
            message="User must have a tenant assigned",
        )

    activity = service.create_activity(
        entity_type=activity_data.entity_type,
        entity_id=activity_data.entity_id,
        activity_type=activity_data.activity_type,
        title=activity_data.title,
        description=activity_data.description,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        metadata=activity_data.metadata,
    )

    return StandardResponse(data=activity)


@router.get(
    "/entities/{entity_type}/{entity_id}/activities",
    response_model=StandardResponse[ActivityListResponse],
    summary="Get entity activities",
    tags=["Activities"],
)
async def get_entity_activities(
    current_user: Annotated[User, Depends(require_permission(ACTIVITIES_READ))],
    service: Annotated[ActivityService, Depends(get_activity_service)],
    entity_type: str = Path(...),
    entity_id: UUID = Path(...),
    activity_type: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
) -> StandardResponse[ActivityListResponse]:
    """Get activities for an entity (timeline view)."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=400,
            code="INVALID_REQUEST",
            message="User must have a tenant assigned",
        )

    activities = service.get_activities(
        entity_type=entity_type,
        entity_id=entity_id,
        tenant_id=current_user.tenant_id,
        activity_type=activity_type,
        skip=skip,
        limit=limit,
    )
    total = service.count_activities(
        entity_type=entity_type,
        entity_id=entity_id,
        tenant_id=current_user.tenant_id,
        activity_type=activity_type,
    )

    return StandardResponse(
        data=ActivityListResponse(
            items=[ActivityResponse.model_validate(a) for a in activities],
            total=total,
            skip=skip,
            limit=limit,
        )
    )


@router.get(
    "/activities",
    response_model=StandardResponse[ActivityListResponse],
    summary="List all activities",
    tags=["Activities"],
)
async def list_all_activities(
    current_user: Annotated[User, Depends(require_permission(ACTIVITIES_READ))],
    service: Annotated[ActivityService, Depends(get_activity_service)],
    activity_type: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
) -> StandardResponse[ActivityListResponse]:
    """List all activities for tenant."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=400,
            code="INVALID_REQUEST",
            message="User must have a tenant assigned",
        )

    # Note: This uses a simplified approach - service may need pagination support for all activities
    activities = service.get_activities(
        entity_type="",  # Empty for all
        entity_id=UUID("00000000-0000-0000-0000-000000000000"),  # Dummy
        tenant_id=current_user.tenant_id,
        activity_type=activity_type,
        skip=skip,
        limit=limit,
    )
    total = service.count_all_activities(
        tenant_id=current_user.tenant_id,
        activity_type=activity_type,
    )

    return StandardResponse(
        data=ActivityListResponse(
            items=[ActivityResponse.model_validate(a) for a in activities],
            total=total,
            skip=skip,
            limit=limit,
        )
    )


@router.put(
    "/activities/{activity_id}",
    response_model=StandardResponse[ActivityResponse],
    summary="Update activity",
    tags=["Activities"],
)
async def update_activity(
    current_user: Annotated[User, Depends(require_permission(ACTIVITIES_WRITE))],
    service: Annotated[ActivityService, Depends(get_activity_service)],
    activity_id: UUID = Path(...),
    activity_data: ActivityUpdate | None = None,
) -> StandardResponse[ActivityResponse]:
    """Update an activity."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=400,
            code="INVALID_REQUEST",
            message="User must have a tenant assigned",
        )

    activity = service.update_activity(
        activity_id=activity_id,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        title=activity_data.title if activity_data else None,
        description=activity_data.description if activity_data else None,
        metadata=activity_data.metadata if activity_data else None,
    )
    if not activity:
        raise APIException(
            status_code=404, code="NOT_FOUND", message="Activity not found"
        )

    return StandardResponse(data=activity)


@router.delete(
    "/activities/{activity_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete activity",
    tags=["Activities"],
)
async def delete_activity(
    current_user: Annotated[User, Depends(require_permission(ACTIVITIES_DELETE))],
    service: Annotated[ActivityService, Depends(get_activity_service)],
    activity_id: UUID = Path(...),
) -> None:
    """Delete an activity."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=400,
            code="INVALID_REQUEST",
            message="User must have a tenant assigned",
        )

    success = service.delete_activity(
        activity_id=activity_id,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )
    if not success:
        raise APIException(
            status_code=404, code="NOT_FOUND", message="Activity not found"
        )


@router.post(
    "/activities/search",
    response_model=StandardResponse[ActivitySearchResponse],
    summary="Search activities",
    tags=["Activities"],
)
async def search_activities(
    current_user: Annotated[User, Depends(require_permission(ACTIVITIES_READ))],
    service: Annotated[ActivityService, Depends(get_activity_service)],
    search_data: ActivitySearchRequest,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
) -> StandardResponse[ActivitySearchResponse]:
    """Search activities by text."""
    if not current_user.tenant_id:
        raise APIException(
            status_code=400,
            code="INVALID_REQUEST",
            message="User must have a tenant assigned",
        )

    activities = service.search_activities(
        tenant_id=current_user.tenant_id,
        query=search_data.query,
        entity_type=search_data.entity_type,
        activity_type=search_data.activity_type,
        skip=skip,
        limit=limit,
    )
    total = service.count_search_activities(
        tenant_id=current_user.tenant_id,
        query_text=search_data.query,
        entity_type=search_data.entity_type,
        activity_type=search_data.activity_type,
    )

    return StandardResponse(
        data=ActivitySearchResponse(
            items=[ActivityResponse.model_validate(a) for a in activities],
            total=total,
            query=search_data.query,
        )
    )
