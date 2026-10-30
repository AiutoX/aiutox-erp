"""Comments router for comments and collaboration management."""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Form, Path, Query, UploadFile, status
from fastapi import File as FastAPIFile
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_user_permissions, require_permission
from app.core.comments.ownership import (
    is_within_edit_delete_window,
    user_can_delete_comment,
    user_can_edit_comment,
)
from app.core.comments.permissions import COMMENTS_MANAGE
from app.core.comments.service import CommentService, resolve_owning_module
from app.core.config.service import ConfigService
from app.core.db.deps import get_db
from app.core.exceptions import APIException, raise_forbidden
from app.core.users.models import User
from app.schemas.comment import (
    CommentAttachmentCreate,
    CommentAttachmentResponse,
    CommentCreate,
    CommentMentionWithUserResponse,
    CommentResponse,
    CommentRevisionResponse,
    CommentUpdate,
    CommentWithAttachmentResult,
)
from app.schemas.common import StandardListResponse, StandardResponse

router = APIRouter()


def get_comment_service(
    db: Annotated[Session, Depends(get_db)],
) -> CommentService:
    """Dependency to get CommentService."""
    return CommentService(db)


def _get_edit_delete_window_minutes(db: Session, tenant_id: UUID) -> int | None:
    """CMT-009: per-tenant configurable time window for author self-service
    edit/delete. None/<=0 means no limit (this project's default)."""
    config_service = ConfigService(db)
    return config_service.get(
        tenant_id, "comments", "edit_delete_window_minutes", default=None
    )


def _to_comment_response(
    comment: Any,
    current_user: User,
    user_permissions: set[str],
    window_minutes: int | None,
) -> CommentResponse:
    """Build a CommentResponse with can_edit/can_delete computed server-side
    (ownership + comments.manage + CMT-009's time window) — single source of
    truth the frontend reads instead of duplicating this logic client-side."""
    can_edit = user_can_edit_comment(
        comment, current_user.id
    ) and is_within_edit_delete_window(comment, window_minutes)

    is_own_comment = comment.created_by == current_user.id
    is_moderator_delete = COMMENTS_MANAGE in user_permissions and not is_own_comment
    can_delete = user_can_delete_comment(
        comment, current_user.id, user_permissions
    ) and (is_moderator_delete or is_within_edit_delete_window(comment, window_minutes))

    response = CommentResponse.model_validate(comment)
    response.can_edit = can_edit
    response.can_delete = can_delete
    return response


# Comment endpoints
@router.post(
    "",
    response_model=StandardResponse[CommentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create comment",
    description="Create a new comment. Requires comments.create permission.",
)
async def create_comment(
    comment_data: CommentCreate,
    current_user: Annotated[User, Depends(require_permission("comments.create"))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CommentService, Depends(get_comment_service)],
) -> StandardResponse[CommentResponse]:
    """Create a new comment."""
    comment = service.create_comment(
        comment_data=comment_data.model_dump(exclude_none=True),
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
    )

    window_minutes = _get_edit_delete_window_minutes(service.db, current_user.tenant_id)
    return StandardResponse(
        data=_to_comment_response(
            comment, current_user, user_permissions, window_minutes
        ),
        message="Comment created successfully",
    )


@router.post(
    "/with-attachment",
    response_model=StandardResponse[CommentWithAttachmentResult],
    status_code=status.HTTP_201_CREATED,
    summary="Create comment with optional attachment",
    description=(
        "Create a new comment and, if a file is supplied, attach it in the "
        "same request. The comment always succeeds even if the attachment "
        "step fails — check attachment_status in the response. Requires "
        "comments.create permission."
    ),
)
async def create_comment_with_attachment(
    current_user: Annotated[User, Depends(require_permission("comments.create"))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CommentService, Depends(get_comment_service)],
    entity_type: Annotated[str, Form()],
    entity_id: Annotated[UUID, Form()],
    content: Annotated[str, Form()],
    parent_id: Annotated[UUID | None, Form()] = None,
    file: UploadFile | None = FastAPIFile(default=None),
) -> StandardResponse[CommentWithAttachmentResult]:
    """Create a comment, optionally attaching one file in the same request."""
    file_content = await file.read() if file is not None else None
    filename = file.filename if file is not None else None

    comment_data: dict[str, Any] = {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "content": content,
    }
    if parent_id is not None:
        comment_data["parent_id"] = parent_id

    comment, attachment_status, attachment_error = (
        await service.create_comment_with_attachment(
            comment_data=comment_data,
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            file_content=file_content,
            filename=filename,
        )
    )

    window_minutes = _get_edit_delete_window_minutes(service.db, current_user.tenant_id)
    return StandardResponse(
        data=CommentWithAttachmentResult(
            comment=_to_comment_response(
                comment, current_user, user_permissions, window_minutes
            ),
            attachment_status=attachment_status,  # type: ignore[arg-type]
            attachment_error=attachment_error,
        ),
        message="Comment created successfully",
    )


@router.get(
    "",
    response_model=StandardListResponse[CommentResponse],
    status_code=status.HTTP_200_OK,
    summary="List comments",
    description=(
        "List comments. Pass entity_type + entity_id together to scope to one "
        "entity's comments; omit both to get the current user's own recent "
        "comments across all entities (backs the /comments 'Recent' tab). "
        "Requires comments.view permission."
    ),
)
async def list_comments(
    current_user: Annotated[User, Depends(require_permission("comments.view"))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CommentService, Depends(get_comment_service)],
    entity_type: Annotated[
        str | None, Query(description="Entity type (e.g., 'product', 'order')")
    ] = None,
    entity_id: Annotated[UUID | None, Query(description="Entity ID")] = None,
    include_deleted: bool = Query(False, description="Include deleted comments"),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=100, ge=1, le=100, description="Page size"),
) -> StandardListResponse[CommentResponse]:
    """List comments, either for one entity or the current user's recent comments."""
    skip = (page - 1) * page_size

    if entity_type and entity_id:
        comments = service.get_comments_by_entity(
            entity_type=entity_type,
            entity_id=entity_id,
            tenant_id=current_user.tenant_id,
            include_deleted=include_deleted,
            skip=skip,
            limit=page_size,
        )
        total = len(comments)
    else:
        comments = service.repository.get_recent_by_user(
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            skip=skip,
            limit=page_size,
        )
        total = service.repository.count_recent_by_user(
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
        )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    window_minutes = _get_edit_delete_window_minutes(service.db, current_user.tenant_id)

    return StandardListResponse(
        data=[
            _to_comment_response(c, current_user, user_permissions, window_minutes)
            for c in comments
        ],
        meta={
            "total": total,
            "page": page,
            "page_size": (
                max(page_size, 1) if total == 0 else page_size
            ),  # Minimum page_size is 1
            "total_pages": total_pages,
        },
    )


@router.get(
    "/mentions",
    response_model=StandardListResponse[CommentMentionWithUserResponse],
    status_code=status.HTTP_200_OK,
    summary="List my mentions",
    description=(
        "List comments where the current user was @mentioned, most recent first. "
        "Requires comments.view permission."
    ),
)
async def list_my_mentions(
    current_user: Annotated[User, Depends(require_permission("comments.view"))],
    service: Annotated[CommentService, Depends(get_comment_service)],
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Page size"),
) -> StandardListResponse[CommentMentionWithUserResponse]:
    """List the current user's mentions across all comments."""
    skip = (page - 1) * page_size
    rows = service.repository.get_mentions_by_user(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=page_size,
    )
    total = service.repository.count_mentions_by_user(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    data = [
        CommentMentionWithUserResponse(
            id=UUID(str(mention.id)),
            comment_id=UUID(str(mention.comment_id)),
            user_id=UUID(str(comment.created_by)),
            user_name=mentioning_user.full_name or mentioning_user.email,
            created_at=mention.created_at,
        )
        for mention, comment, mentioning_user in rows
    ]

    return StandardListResponse(
        data=data,
        meta={
            "total": total,
            "page": page,
            "page_size": max(page_size, 1) if total == 0 else page_size,
            "total_pages": total_pages,
        },
    )


@router.get(
    "/{comment_id}",
    response_model=StandardResponse[CommentResponse],
    status_code=status.HTTP_200_OK,
    summary="Get comment",
    description="Get a specific comment by ID. Requires comments.view permission.",
)
async def get_comment(
    comment_id: Annotated[UUID, Path(..., description="Comment ID")],
    current_user: Annotated[User, Depends(require_permission("comments.view"))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CommentService, Depends(get_comment_service)],
) -> StandardResponse[CommentResponse]:
    """Get a specific comment."""
    comment = service.get_comment(comment_id, current_user.tenant_id)
    if not comment:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="COMMENT_NOT_FOUND",
            message=f"Comment with ID {comment_id} not found",
        )

    window_minutes = _get_edit_delete_window_minutes(service.db, current_user.tenant_id)
    return StandardResponse(
        data=_to_comment_response(
            comment, current_user, user_permissions, window_minutes
        ),
        message="Comment retrieved successfully",
    )


@router.get(
    "/{comment_id}/thread",
    response_model=StandardListResponse[CommentResponse],
    status_code=status.HTTP_200_OK,
    summary="Get comment thread",
    description="Get replies to a comment. Requires comments.view permission.",
)
async def get_comment_thread(
    comment_id: Annotated[UUID, Path(..., description="Parent comment ID")],
    current_user: Annotated[User, Depends(require_permission("comments.view"))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CommentService, Depends(get_comment_service)],
    include_deleted: bool = Query(False, description="Include deleted comments"),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=100, ge=1, le=100, description="Page size"),
) -> StandardListResponse[CommentResponse]:
    """Get comment thread (replies), paginated."""
    skip = (page - 1) * page_size
    replies = service.get_comment_thread(
        parent_id=comment_id,
        tenant_id=current_user.tenant_id,
        include_deleted=include_deleted,
        skip=skip,
        limit=page_size,
    )
    total = service.repository.count_comment_thread(
        parent_id=comment_id,
        tenant_id=current_user.tenant_id,
        include_deleted=include_deleted,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    window_minutes = _get_edit_delete_window_minutes(service.db, current_user.tenant_id)

    return StandardListResponse(
        data=[
            _to_comment_response(r, current_user, user_permissions, window_minutes)
            for r in replies
        ],
        meta={
            "total": total,
            "page": page,
            "page_size": max(page_size, 1) if total == 0 else page_size,
            "total_pages": total_pages,
        },
    )


@router.get(
    "/{comment_id}/revisions",
    response_model=StandardListResponse[CommentRevisionResponse],
    status_code=status.HTTP_200_OK,
    summary="Get comment revision history",
    description=(
        "List a comment's prior content versions, oldest first. Requires "
        "comments.manage — moderation/accountability visibility only, never "
        "shown to the comment's own author (CMT-008)."
    ),
)
async def get_comment_revisions(
    comment_id: Annotated[UUID, Path(..., description="Comment ID")],
    current_user: Annotated[User, Depends(require_permission("comments.manage"))],
    service: Annotated[CommentService, Depends(get_comment_service)],
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=100, ge=1, le=100, description="Page size"),
) -> StandardListResponse[CommentRevisionResponse]:
    """Get a comment's revision history."""
    existing_comment = service.get_comment(comment_id, current_user.tenant_id)
    if not existing_comment:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="COMMENT_NOT_FOUND",
            message=f"Comment with ID {comment_id} not found",
        )

    skip = (page - 1) * page_size
    revisions = service.get_comment_revisions(
        comment_id=comment_id,
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=page_size,
    )
    total = service.repository.count_comment_revisions(
        comment_id=comment_id, tenant_id=current_user.tenant_id
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return StandardListResponse(
        data=[CommentRevisionResponse.model_validate(r) for r in revisions],
        meta={
            "total": total,
            "page": page,
            "page_size": max(page_size, 1) if total == 0 else page_size,
            "total_pages": total_pages,
        },
    )


@router.put(
    "/{comment_id}",
    response_model=StandardResponse[CommentResponse],
    status_code=status.HTTP_200_OK,
    summary="Update comment",
    description=(
        "Update a comment. Requires comments.edit permission AND being the comment's "
        "author — no permission (including comments.manage) grants an edit path over "
        "another user's comment."
    ),
)
async def update_comment(
    comment_id: Annotated[UUID, Path(..., description="Comment ID")],
    current_user: Annotated[User, Depends(require_permission("comments.edit"))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CommentService, Depends(get_comment_service)],
    comment_data: CommentUpdate,
) -> StandardResponse[CommentResponse]:
    """Update a comment."""
    existing_comment = service.get_comment(comment_id, current_user.tenant_id)
    if not existing_comment:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="COMMENT_NOT_FOUND",
            message=f"Comment with ID {comment_id} not found",
        )

    if not user_can_edit_comment(existing_comment, current_user.id):
        raise_forbidden(
            code="COMMENT_EDIT_NOT_OWNER",
            message="Only the comment's author can edit it",
        )

    window_minutes = _get_edit_delete_window_minutes(service.db, current_user.tenant_id)
    if not is_within_edit_delete_window(existing_comment, window_minutes):
        raise_forbidden(
            code="COMMENT_EDIT_WINDOW_EXPIRED",
            message="This comment can no longer be edited — the edit window has expired",
        )

    comment = service.update_comment(
        comment_id=comment_id,
        tenant_id=current_user.tenant_id,
        comment_data=comment_data.model_dump(exclude_none=True),
        edited_by=current_user.id,
    )

    if not comment:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="COMMENT_NOT_FOUND",
            message=f"Comment with ID {comment_id} not found",
        )

    return StandardResponse(
        data=_to_comment_response(
            comment, current_user, user_permissions, window_minutes
        ),
        message="Comment updated successfully",
    )


@router.delete(
    "/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete comment",
    description=(
        "Delete a comment (soft delete). Requires comments.create permission AND "
        "(being the comment's author OR holding comments.manage for moderation)."
    ),
)
async def delete_comment(
    comment_id: Annotated[UUID, Path(..., description="Comment ID")],
    current_user: Annotated[User, Depends(require_permission("comments.create"))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CommentService, Depends(get_comment_service)],
) -> None:
    """Delete a comment."""
    existing_comment = service.get_comment(comment_id, current_user.tenant_id)
    if not existing_comment:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="COMMENT_NOT_FOUND",
            message=f"Comment with ID {comment_id} not found",
        )

    if not user_can_delete_comment(existing_comment, current_user.id, user_permissions):
        raise_forbidden(
            code="COMMENT_DELETE_FORBIDDEN",
            message="Only the comment's author or a moderator can delete it",
        )

    # The time window applies only to the author's own-comment self-service
    # delete — a comments.manage moderation delete of someone else's comment
    # must always be possible regardless of the comment's age.
    is_own_comment = existing_comment.created_by == current_user.id
    is_moderator_delete = COMMENTS_MANAGE in user_permissions and not is_own_comment
    if is_own_comment and not is_moderator_delete:
        window_minutes = _get_edit_delete_window_minutes(
            service.db, current_user.tenant_id
        )
        if not is_within_edit_delete_window(existing_comment, window_minutes):
            raise_forbidden(
                code="COMMENT_DELETE_WINDOW_EXPIRED",
                message="This comment can no longer be deleted — the delete window has expired",
            )

    success = service.delete_comment(comment_id, current_user.tenant_id)
    if not success:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="COMMENT_NOT_FOUND",
            message=f"Comment with ID {comment_id} not found",
        )


# Comment Attachment endpoints
@router.post(
    "/{comment_id}/attachments",
    response_model=StandardResponse[CommentAttachmentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add attachment",
    description="Add an attachment to a comment. Requires comments.create permission.",
)
async def add_attachment(
    comment_id: Annotated[UUID, Path(..., description="Comment ID")],
    current_user: Annotated[User, Depends(require_permission("comments.create"))],
    service: Annotated[CommentService, Depends(get_comment_service)],
    attachment_data: CommentAttachmentCreate,
) -> StandardResponse[CommentAttachmentResponse]:
    """Add an attachment to a comment.

    Gated on the owning module's comments_attachments_enabled setting
    (per-tenant, ConfigService) — a module admin decides whether comment
    attachments are available for that module's entities, defaulting to
    disabled. Unknown entity_types (no owning module registered) are
    rejected, not silently allowed.
    """
    existing_comment = service.get_comment(comment_id, current_user.tenant_id)
    if not existing_comment:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="COMMENT_NOT_FOUND",
            message=f"Comment with ID {comment_id} not found",
        )

    owning_module = resolve_owning_module(existing_comment.entity_type)
    attachments_enabled = bool(owning_module) and ConfigService(service.db).get(
        current_user.tenant_id,
        owning_module or "",
        "comments.attachments_enabled",
        default=False,
    )
    if not attachments_enabled:
        raise_forbidden(
            code="COMMENT_ATTACHMENTS_DISABLED",
            message="Comment attachments are not enabled for this module",
        )

    attachment = service.add_attachment(
        comment_id=comment_id,
        file_id=attachment_data.file_id,
        tenant_id=current_user.tenant_id,
    )

    return StandardResponse(
        data=CommentAttachmentResponse.model_validate(attachment),
        message="Attachment added successfully",
    )


@router.get(
    "/{comment_id}/attachments",
    response_model=StandardListResponse[CommentAttachmentResponse],
    status_code=status.HTTP_200_OK,
    summary="Get attachments",
    description="Get attachments for a comment. Requires comments.view permission.",
)
async def get_attachments(
    comment_id: Annotated[UUID, Path(..., description="Comment ID")],
    current_user: Annotated[User, Depends(require_permission("comments.view"))],
    service: Annotated[CommentService, Depends(get_comment_service)],
) -> StandardListResponse[CommentAttachmentResponse]:
    """Get attachments for a comment."""
    attachments = service.get_attachments(comment_id, current_user.tenant_id)

    return StandardListResponse(
        data=[CommentAttachmentResponse.model_validate(a) for a in attachments],
        meta={
            "total": len(attachments),
            "page": 1,
            "page_size": max(len(attachments), 1),  # Minimum page_size is 1
            "total_pages": 1,
        },
    )


@router.delete(
    "/{comment_id}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete attachment",
    description=(
        "Delete an attachment. Requires comments.create permission AND being "
        "the comment's author, within the same edit/delete time window that "
        "governs the comment's own content (CMT-009). No comments.manage "
        "moderation override exists for this action — see DEC-005."
    ),
)
async def delete_attachment(
    comment_id: Annotated[UUID, Path(..., description="Comment ID")],
    attachment_id: Annotated[UUID, Path(..., description="Attachment ID")],
    current_user: Annotated[User, Depends(require_permission("comments.create"))],
    service: Annotated[CommentService, Depends(get_comment_service)],
) -> None:
    """Delete a comment attachment."""
    existing_comment = service.get_comment(comment_id, current_user.tenant_id)
    if not existing_comment:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="COMMENT_NOT_FOUND",
            message=f"Comment with ID {comment_id} not found",
        )

    if existing_comment.created_by != current_user.id:
        raise_forbidden(
            code="COMMENT_ATTACHMENT_DELETE_FORBIDDEN",
            message="Only the comment's author can remove its attachments",
        )

    window_minutes = _get_edit_delete_window_minutes(service.db, current_user.tenant_id)
    if not is_within_edit_delete_window(existing_comment, window_minutes):
        raise_forbidden(
            code="COMMENT_ATTACHMENT_DELETE_WINDOW_EXPIRED",
            message="This attachment can no longer be removed — the edit window has expired",
        )

    attachment = service.get_attachment(
        attachment_id, comment_id, current_user.tenant_id
    )
    if not attachment:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="COMMENT_ATTACHMENT_NOT_FOUND",
            message=f"Attachment with ID {attachment_id} not found",
        )

    service.delete_attachment(attachment)
