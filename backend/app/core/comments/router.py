"""Comments router for comment management."""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth.dependencies import require_permission
from app.core.comments.permissions import (
    COMMENTS_DELETE,
    COMMENTS_READ,
    COMMENTS_WRITE,
)
from app.core.comments.schemas import (
    CommentCreate,
    CommentListResponse,
    CommentResponse,
    CommentUpdate,
)
from app.core.comments.service import CommentService
from app.core.db.deps import get_db
from app.core.users.models import User
from app.schemas.common import StandardResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def get_comment_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission(COMMENTS_READ))],
) -> CommentService:
    """Dependency to get CommentService."""
    return CommentService(db)  # type: ignore[arg-type]


@router.post(
    "/comments",
    response_model=StandardResponse[CommentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create comment",
    tags=["Comments"],
)
async def create_comment(
    current_user: Annotated[User, Depends(require_permission(COMMENTS_WRITE))],
    service: Annotated[CommentService, Depends(get_comment_service)],
    comment_data: CommentCreate,
) -> StandardResponse[CommentResponse]:
    """Create a new comment."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must have a tenant assigned")

    comment = service.create_comment(
        comment_data={
            "entity_type": comment_data.entity_type,
            "entity_id": comment_data.entity_id,
            "content": comment_data.content,
            "parent_id": comment_data.parent_id,
            "metadata": comment_data.metadata,
        },
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )

    return StandardResponse(data=comment)


@router.get(
    "/entities/{entity_type}/{entity_id}/comments",
    response_model=StandardResponse[CommentListResponse],
    summary="Get entity comments",
    tags=["Comments"],
)
async def get_entity_comments(
    current_user: Annotated[User, Depends(require_permission(COMMENTS_READ))],
    service: Annotated[CommentService, Depends(get_comment_service)],
    entity_type: str = Path(...),
    entity_id: UUID = Path(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
) -> StandardResponse[CommentListResponse]:
    """Get comments for an entity (thread view)."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must have a tenant assigned")

    comments = service.get_comments_by_entity(
        entity_type=entity_type,
        entity_id=entity_id,
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit,
    )
    total = len(
        service.get_comments_by_entity(
            entity_type=entity_type,
            entity_id=entity_id,
            tenant_id=current_user.tenant_id,
        )
    )

    return StandardResponse(
        data=CommentListResponse(
            items=[CommentResponse.model_validate(c) for c in comments],
            total=total,
            skip=skip,
            limit=limit,
        )
    )


@router.get(
    "/comments/{comment_id}",
    response_model=StandardResponse[CommentResponse],
    summary="Get comment details",
    tags=["Comments"],
)
async def get_comment(
    current_user: Annotated[User, Depends(require_permission(COMMENTS_READ))],
    service: Annotated[CommentService, Depends(get_comment_service)],
    comment_id: UUID = Path(...),
) -> StandardResponse[CommentResponse]:
    """Get comment details."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must have a tenant assigned")

    comment = service.get_comment(
        comment_id=comment_id,
        tenant_id=current_user.tenant_id,
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    return StandardResponse(data=comment)


@router.put(
    "/comments/{comment_id}",
    response_model=StandardResponse[CommentResponse],
    summary="Update comment",
    tags=["Comments"],
)
async def update_comment(
    current_user: Annotated[User, Depends(require_permission(COMMENTS_WRITE))],
    service: Annotated[CommentService, Depends(get_comment_service)],
    comment_id: UUID = Path(...),
    comment_data: CommentUpdate | None = None,
) -> StandardResponse[CommentResponse]:
    """Update a comment."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must have a tenant assigned")

    comment = service.update_comment(
        comment_id=comment_id,
        tenant_id=current_user.tenant_id,
        comment_data={
            "content": comment_data.content if comment_data else None,
            "metadata": comment_data.metadata if comment_data else None,
        },
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    return StandardResponse(data=comment)


@router.delete(
    "/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete comment",
    tags=["Comments"],
)
async def delete_comment(
    current_user: Annotated[User, Depends(require_permission(COMMENTS_DELETE))],
    service: Annotated[CommentService, Depends(get_comment_service)],
    comment_id: UUID = Path(...),
) -> None:
    """Delete a comment."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must have a tenant assigned")

    success = service.delete_comment(
        comment_id=comment_id,
        tenant_id=current_user.tenant_id,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Comment not found")


@router.get(
    "/comments/{comment_id}/replies",
    response_model=StandardResponse[CommentListResponse],
    summary="Get comment replies",
    tags=["Comments"],
)
async def get_comment_replies(
    current_user: Annotated[User, Depends(require_permission(COMMENTS_READ))],
    service: Annotated[CommentService, Depends(get_comment_service)],
    comment_id: UUID = Path(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
) -> StandardResponse[CommentListResponse]:
    """Get replies to a comment (threaded conversation)."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="User must have a tenant assigned")

    all_replies = service.get_comment_thread(
        parent_id=comment_id,
        tenant_id=current_user.tenant_id,
    )
    total = len(all_replies)
    replies = all_replies[skip : skip + limit]

    return StandardResponse(
        data=CommentListResponse(
            items=[CommentResponse.model_validate(r) for r in replies],
            total=total,
            skip=skip,
            limit=limit,
        )
    )
