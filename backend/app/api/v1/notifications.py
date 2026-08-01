"""Notifications router for notification management."""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.core.auth.dependencies import require_permission
from app.core.db.deps import get_db
from app.core.exceptions import APIException
from app.core.module_registry import get_module_registry
from app.core.notifications.service import NotificationService
from app.core.users.models import User
from app.repositories.notification_repository import NotificationRepository
from app.schemas.common import StandardListResponse, StandardResponse
from app.schemas.notification import (
    NotificationChannelCatalogEntry,
    NotificationQueueResponse,
    NotificationSendRequest,
    NotificationTemplateCreate,
    NotificationTemplateRenderRequest,
    NotificationTemplateRenderResponse,
    NotificationTemplateResponse,
    NotificationTemplateUpdate,
    NotificationTemplateVersionResponse,
)
from app.schemas.preference import NotificationEventTypeResponse

logger = logging.getLogger(__name__)

router = APIRouter()


def get_notification_service(
    db: Annotated[Session, Depends(get_db)],
) -> NotificationService:
    """Dependency to get NotificationService."""
    return NotificationService(db)


def get_notification_repository(
    db: Annotated[Session, Depends(get_db)],
) -> NotificationRepository:
    """Dependency to get NotificationRepository."""
    return NotificationRepository(db)


@router.post(
    "/templates",
    response_model=StandardResponse[NotificationTemplateResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create notification template",
    description="Create a new notification template. Requires notifications.edit permission.",
)
async def create_template(
    template_data: NotificationTemplateCreate,
    current_user: Annotated[User, Depends(require_permission("notifications.edit"))],
    repository: Annotated[NotificationRepository, Depends(get_notification_repository)],
) -> StandardResponse[NotificationTemplateResponse]:
    """Create a new notification template."""
    template = repository.create_template(
        {
            "tenant_id": current_user.tenant_id,
            "name": template_data.name,
            "event_type": template_data.event_type,
            "channel": template_data.channel,
            "subject": template_data.subject,
            "body": template_data.body,
            "is_active": template_data.is_active,
        }
    )

    return StandardResponse(
        data=NotificationTemplateResponse.model_validate(template),
        message="Template created successfully",
    )


@router.get(
    "/templates",
    response_model=StandardListResponse[NotificationTemplateResponse],
    status_code=status.HTTP_200_OK,
    summary="List notification templates",
    description="List all notification templates for the current tenant. Requires notifications.view permission.",
)
async def list_templates(
    current_user: Annotated[User, Depends(require_permission("notifications.view"))],
    repository: Annotated[NotificationRepository, Depends(get_notification_repository)],
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Page size"),
    event_type: str | None = Query(default=None, description="Filter by event type"),
    channel: str | None = Query(default=None, description="Filter by channel"),
    is_active: bool | None = Query(default=None, description="Filter by active status"),
    q: str | None = Query(
        default=None, description="Free-text search over subject/body"
    ),
) -> StandardListResponse[NotificationTemplateResponse]:
    """List all notification templates."""
    skip = (page - 1) * page_size

    # Get total count for accurate pagination
    total = repository.count_templates(
        tenant_id=current_user.tenant_id,
        event_type=event_type,
        channel=channel,
        is_active=is_active,
        q=q,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    # Get paginated templates
    templates = repository.get_all_templates(
        tenant_id=current_user.tenant_id,
        event_type=event_type,
        channel=channel,
        is_active=is_active,
        q=q,
    )
    # Apply pagination
    paginated_templates = templates[skip : skip + page_size]

    return StandardListResponse(
        data=[
            NotificationTemplateResponse.model_validate(t) for t in paginated_templates
        ],
        meta={
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    )


@router.get(
    "/templates/{template_id}",
    response_model=StandardResponse[NotificationTemplateResponse],
    status_code=status.HTTP_200_OK,
    summary="Get notification template",
    description="Get a specific notification template by ID. Requires notifications.view permission.",
)
async def get_template(
    template_id: UUID,
    current_user: Annotated[User, Depends(require_permission("notifications.view"))],
    repository: Annotated[NotificationRepository, Depends(get_notification_repository)],
) -> StandardResponse[NotificationTemplateResponse]:
    """Get a specific notification template."""
    # Get all templates and filter by ID and tenant
    templates = repository.get_all_templates(tenant_id=current_user.tenant_id)
    template = next((t for t in templates if t.id == template_id), None)

    if not template:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOTIFICATION_TEMPLATE_NOT_FOUND",
            message=f"Template with ID {template_id} not found",
        )

    return StandardResponse(
        data=NotificationTemplateResponse.model_validate(template),
        message="Template retrieved successfully",
    )


@router.put(
    "/templates/{template_id}",
    response_model=StandardResponse[NotificationTemplateResponse],
    status_code=status.HTTP_200_OK,
    summary="Update notification template",
    description="Update a notification template. Requires notifications.edit permission.",
)
async def update_template(
    template_id: UUID,
    template_data: NotificationTemplateUpdate,
    current_user: Annotated[User, Depends(require_permission("notifications.edit"))],
    repository: Annotated[NotificationRepository, Depends(get_notification_repository)],
) -> StandardResponse[NotificationTemplateResponse]:
    """Update a notification template."""
    # Build update dict with only provided fields
    update_dict = template_data.model_dump(exclude_unset=True)

    template = repository.update_template(
        template_id, current_user.tenant_id, update_dict
    )

    if not template:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOTIFICATION_TEMPLATE_NOT_FOUND",
            message=f"Template with ID {template_id} not found",
        )

    return StandardResponse(
        data=NotificationTemplateResponse.model_validate(template),
        message="Template updated successfully",
    )


@router.delete(
    "/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete notification template",
    description="Delete a notification template. Requires notifications.delete permission.",
)
async def delete_template(
    template_id: UUID,
    current_user: Annotated[User, Depends(require_permission("notifications.delete"))],
    repository: Annotated[NotificationRepository, Depends(get_notification_repository)],
) -> None:
    """Delete a notification template."""
    deleted = repository.delete_template(template_id, current_user.tenant_id)
    if not deleted:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOTIFICATION_TEMPLATE_NOT_FOUND",
            message=f"Template with ID {template_id} not found",
        )


@router.get(
    "/templates/{template_id}/versions",
    response_model=StandardListResponse[NotificationTemplateVersionResponse],
    status_code=status.HTTP_200_OK,
    summary="List notification template versions",
    description="List version history for a notification template. Requires notifications.view permission.",
)
async def list_template_versions(
    template_id: UUID,
    current_user: Annotated[User, Depends(require_permission("notifications.view"))],
    repository: Annotated[NotificationRepository, Depends(get_notification_repository)],
) -> StandardListResponse[NotificationTemplateVersionResponse]:
    """List version history for a notification template."""
    templates = repository.get_all_templates(tenant_id=current_user.tenant_id)
    if not any(t.id == template_id for t in templates):
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOTIFICATION_TEMPLATE_NOT_FOUND",
            message=f"Template with ID {template_id} not found",
        )

    versions = repository.list_template_versions(template_id)

    return StandardListResponse(
        data=[NotificationTemplateVersionResponse.model_validate(v) for v in versions],
        meta={
            "total": len(versions),
            "page": 1,
            "page_size": max(len(versions), 1),
            "total_pages": 1,
        },
    )


@router.post(
    "/templates/{template_id}/render",
    response_model=StandardResponse[NotificationTemplateRenderResponse],
    status_code=status.HTTP_200_OK,
    summary="Render a notification template",
    description="Render a notification template with a variable context. Requires notifications.view permission.",
)
async def render_template(
    template_id: UUID,
    render_request: NotificationTemplateRenderRequest,
    current_user: Annotated[User, Depends(require_permission("notifications.view"))],
    repository: Annotated[NotificationRepository, Depends(get_notification_repository)],
) -> StandardResponse[NotificationTemplateRenderResponse]:
    """Render a notification template with the given context."""
    from app.core.notifications.renderer import TemplateRenderer

    templates = repository.get_all_templates(tenant_id=current_user.tenant_id)
    template = next((t for t in templates if t.id == template_id), None)
    if not template:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOTIFICATION_TEMPLATE_NOT_FOUND",
            message=f"Template with ID {template_id} not found",
        )

    try:
        rendered_body = TemplateRenderer.render(template.body, render_request.context)
        rendered_subject = (
            TemplateRenderer.render(template.subject, render_request.context)
            if template.subject
            else None
        )
    except ValueError as exc:
        raise APIException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="NOTIFICATION_TEMPLATE_RENDER_ERROR",
            message=str(exc),
        ) from exc

    return StandardResponse(
        data=NotificationTemplateRenderResponse(
            subject=rendered_subject, body=rendered_body
        ),
        message="Template rendered successfully",
    )


@router.get(
    "/channels-catalog",
    response_model=StandardListResponse[NotificationChannelCatalogEntry],
    status_code=status.HTTP_200_OK,
    summary="List notification channels and their availability",
    description=(
        "List all notification channels with whether this tenant can "
        "currently send through each one and whether the channel requires "
        "a per-recipient ContactMethod. Requires notifications.view permission."
    ),
)
async def get_channels_catalog(
    current_user: Annotated[User, Depends(require_permission("notifications.view"))],
    db: Annotated[Session, Depends(get_db)],
) -> StandardListResponse[NotificationChannelCatalogEntry]:
    """List notification channels with per-tenant availability."""
    from app.core.notifications.channel_catalog import get_channel_catalog

    catalog = get_channel_catalog(db, current_user.tenant_id)

    data = [
        NotificationChannelCatalogEntry(
            channel=entry.channel,
            available=entry.available,
            requires_contact_method=entry.requires_contact_method,
            method_types=entry.method_types,
        )
        for entry in catalog
    ]

    return StandardListResponse(
        data=data,
        meta={
            "total": len(data),
            "page": 1,
            "page_size": max(len(data), 1),
            "total_pages": 1,
        },
    )


@router.post(
    "/send",
    response_model=StandardResponse[list[dict]],
    status_code=status.HTTP_200_OK,
    summary="Send notification manually",
    description="Send a notification manually. Requires notifications.manage permission.",
)
async def send_notification(
    request: NotificationSendRequest,
    current_user: Annotated[User, Depends(require_permission("notifications.manage"))],
    service: Annotated[NotificationService, Depends(get_notification_service)],
) -> StandardResponse[list[dict]]:
    """Send a notification manually."""
    results = await service.send(
        event_type=request.event_type,
        recipient_id=request.recipient_id,
        channels=request.channels,
        data=request.data,
        tenant_id=current_user.tenant_id,
    )

    return StandardResponse(
        data=results,
        message="Notification sent successfully",
    )


@router.get(
    "/queue",
    response_model=StandardListResponse[NotificationQueueResponse],
    status_code=status.HTTP_200_OK,
    summary="List notification queue entries",
    description="List notification queue entries for the current tenant. Requires notifications.view permission.",
)
async def list_queue_entries(
    current_user: Annotated[User, Depends(require_permission("notifications.view"))],
    repository: Annotated[NotificationRepository, Depends(get_notification_repository)],
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Page size"),
    status: str | None = Query(
        default=None, description="Filter by status (pending, sent, failed)"
    ),
) -> StandardListResponse[NotificationQueueResponse]:
    """List notification queue entries."""
    skip = (page - 1) * page_size

    # Get total count for accurate pagination
    total = repository.count_queue_entries(
        tenant_id=current_user.tenant_id, status=status
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    queue_entries = repository.get_queue_entries(
        tenant_id=current_user.tenant_id, status=status, skip=skip, limit=page_size
    )

    return StandardListResponse(
        data=[
            NotificationQueueResponse.model_validate(entry) for entry in queue_entries
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
    "/queue/{queue_id}",
    response_model=StandardResponse[NotificationQueueResponse],
    status_code=status.HTTP_200_OK,
    summary="Get notification queue entry",
    description="Get a specific notification queue entry by ID. Requires notifications.view permission.",
)
async def get_queue_entry(
    queue_id: Annotated[UUID, Path(..., description="Queue entry ID")],
    current_user: Annotated[User, Depends(require_permission("notifications.view"))],
    repository: Annotated[NotificationRepository, Depends(get_notification_repository)],
) -> StandardResponse[NotificationQueueResponse]:
    """Get a specific notification queue entry."""
    entry = repository.get_queue_entry_by_id(queue_id, current_user.tenant_id)

    if not entry:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOTIFICATION_QUEUE_ENTRY_NOT_FOUND",
            message=f"Queue entry with ID {queue_id} not found",
        )

    return StandardResponse(
        data=NotificationQueueResponse.model_validate(entry),
        message="Queue entry retrieved successfully",
    )


@router.patch(
    "/queue/{queue_id}/read",
    response_model=StandardResponse[NotificationQueueResponse],
    status_code=status.HTTP_200_OK,
    summary="Mark notification as read",
    description="Mark a notification queue entry as read. Requires notifications.view permission.",
)
async def mark_notification_read(
    queue_id: Annotated[UUID, Path(..., description="Notification queue entry ID")],
    current_user: Annotated[User, Depends(require_permission("notifications.view"))],
    repository: Annotated[NotificationRepository, Depends(get_notification_repository)],
) -> StandardResponse[NotificationQueueResponse]:
    """Mark a notification as read."""
    entry = repository.mark_as_read(queue_id, current_user.tenant_id)

    if not entry:
        raise APIException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOTIFICATION_NOT_FOUND",
            message=f"Notification with ID {queue_id} not found",
        )

    return StandardResponse(
        data=NotificationQueueResponse.model_validate(entry),
        message="Notification marked as read",
    )


@router.get(
    "/event-types",
    response_model=StandardListResponse[NotificationEventTypeResponse],
    status_code=status.HTTP_200_OK,
    summary="List available notification event types",
    description=(
        "List notification event types available for preference configuration, "
        "aggregated from all enabled modules. Empty if the notifications module "
        "itself is disabled for this tenant."
    ),
)
async def get_notification_event_types(
    current_user: Annotated[User, Depends(require_permission("preferences.view"))],
) -> StandardListResponse[NotificationEventTypeResponse]:
    """List notification event types available for preference configuration."""
    registry = get_module_registry()
    events = registry.get_notification_events(current_user.tenant_id)
    data = [
        NotificationEventTypeResponse(
            event_type=e.event_type,
            module=e.module,
            label_key=e.label_key,
            default_channels=e.default_channels,
            default_enabled=e.default_enabled,
        )
        for e in events
    ]

    return StandardListResponse(
        data=data,
        meta={
            "total": len(data),
            "page": 1,
            "page_size": max(len(data), 1),
            "total_pages": 1,
        },
    )
