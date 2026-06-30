"""Notification rules router — template CRUD and property/building overrides."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.core.auth.dependencies import require_permission
from app.core.db.deps import get_db
from app.core.exceptions import APIException
from app.core.notifications.rule_repository import NotificationRuleRepository
from app.core.notifications.rule_service import NotificationRuleService
from app.core.users.models import User
from app.schemas.common import StandardListResponse, StandardResponse
from app.schemas.notification_rule import (
    EffectiveRuleResponse,
    NotificationRuleOverrideCreate,
    NotificationRuleOverrideResponse,
    NotificationRuleOverrideUpdate,
    NotificationRuleTemplateCreate,
    NotificationRuleTemplateResponse,
    NotificationRuleTemplateUpdate,
)

router = APIRouter()


# ------------------------------------------------------------------
# Dependencies
# ------------------------------------------------------------------


def get_rule_service(
    db: Annotated[Session, Depends(get_db)],
) -> NotificationRuleService:
    """Dependency to get NotificationRuleService."""
    repository = NotificationRuleRepository(db)
    return NotificationRuleService(repository)


# ------------------------------------------------------------------
# Template CRUD — Tenant Admin only (notifications.rules.manage)
# ------------------------------------------------------------------


@router.post(
    "/templates",
    response_model=StandardResponse[NotificationRuleTemplateResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create notification rule template",
    description="Create a new notification rule template. Requires notifications.rules.manage permission.",
)
async def create_template(
    template_data: NotificationRuleTemplateCreate,
    current_user: Annotated[
        User, Depends(require_permission("notifications.rules.manage"))
    ],
    service: Annotated[NotificationRuleService, Depends(get_rule_service)],
) -> StandardResponse[NotificationRuleTemplateResponse]:
    """Create a new notification rule template."""
    template = service.create_template(
        tenant_id=current_user.tenant_id,
        event_type=template_data.event_type,
        context_type=template_data.context_type,
        description=template_data.description,
        is_active=template_data.is_active,
        default_notify_roles=template_data.default_notify_roles,
        default_notify_users=template_data.default_notify_users,
        default_channels=template_data.default_channels,
        auto_create_purchase_request=template_data.auto_create_purchase_request,
        created_by=current_user.id,
    )

    return StandardResponse(
        data=NotificationRuleTemplateResponse.model_validate(template),
        meta={"message": "Template created successfully"},
    )


@router.get(
    "/templates",
    response_model=StandardListResponse[NotificationRuleTemplateResponse],
    status_code=status.HTTP_200_OK,
    summary="List notification rule templates",
    description="List all notification rule templates for the current tenant. Requires notifications.rules.manage permission.",
)
async def list_templates(
    current_user: Annotated[
        User, Depends(require_permission("notifications.rules.manage"))
    ],
    service: Annotated[NotificationRuleService, Depends(get_rule_service)],
) -> StandardListResponse[NotificationRuleTemplateResponse]:
    """List all notification rule templates for the tenant."""
    templates = service.list_templates(current_user.tenant_id)

    return StandardListResponse(
        data=[NotificationRuleTemplateResponse.model_validate(t) for t in templates],
        meta={
            "total": len(templates),
            "page": 1,
            "page_size": len(templates),
            "total_pages": 1 if templates else 0,
        },
    )


@router.get(
    "/templates/{template_id}",
    response_model=StandardResponse[NotificationRuleTemplateResponse],
    status_code=status.HTTP_200_OK,
    summary="Get notification rule template",
    description="Get a specific notification rule template by ID. Requires notifications.rules.manage permission.",
)
async def get_template(
    template_id: Annotated[UUID, Path(..., description="Template ID")],
    current_user: Annotated[
        User, Depends(require_permission("notifications.rules.manage"))
    ],
    service: Annotated[NotificationRuleService, Depends(get_rule_service)],
) -> StandardResponse[NotificationRuleTemplateResponse]:
    """Get a specific notification rule template."""
    template = service.get_template(template_id, current_user.tenant_id)

    return StandardResponse(
        data=NotificationRuleTemplateResponse.model_validate(template),
        meta={"message": "Template retrieved successfully"},
    )


@router.put(
    "/templates/{template_id}",
    response_model=StandardResponse[NotificationRuleTemplateResponse],
    status_code=status.HTTP_200_OK,
    summary="Update notification rule template",
    description="Update a notification rule template. Requires notifications.rules.manage permission.",
)
async def update_template(
    template_id: Annotated[UUID, Path(..., description="Template ID")],
    template_data: NotificationRuleTemplateUpdate,
    current_user: Annotated[
        User, Depends(require_permission("notifications.rules.manage"))
    ],
    service: Annotated[NotificationRuleService, Depends(get_rule_service)],
) -> StandardResponse[NotificationRuleTemplateResponse]:
    """Update a notification rule template."""
    # Get existing template to preserve unchanged fields
    existing = service.get_template(template_id, current_user.tenant_id)

    update_data = template_data.model_dump(exclude_unset=True)

    template = service.update_template(
        template_id=template_id,
        tenant_id=current_user.tenant_id,
        event_type=update_data.get("event_type", existing.event_type),
        description=update_data.get("description", existing.description),
        is_active=update_data.get("is_active", existing.is_active),
        default_notify_roles=update_data.get(
            "default_notify_roles", existing.default_notify_roles
        ),
        default_notify_users=update_data.get(
            "default_notify_users", existing.default_notify_users
        ),
        default_channels=update_data.get("default_channels", existing.default_channels),
        auto_create_purchase_request=update_data.get(
            "auto_create_purchase_request", existing.auto_create_purchase_request
        ),
        updated_by=current_user.id,
    )

    return StandardResponse(
        data=NotificationRuleTemplateResponse.model_validate(template),
        meta={"message": "Template updated successfully"},
    )


@router.delete(
    "/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete notification rule template",
    description="Soft-delete a notification rule template. Requires notifications.rules.manage permission.",
)
async def delete_template(
    template_id: Annotated[UUID, Path(..., description="Template ID")],
    current_user: Annotated[
        User, Depends(require_permission("notifications.rules.manage"))
    ],
    service: Annotated[NotificationRuleService, Depends(get_rule_service)],
) -> None:
    """Soft-delete a notification rule template."""
    deleted = service.delete_template(template_id, current_user.tenant_id)
    if not deleted:
        raise APIException(
            code="NOTIFICATION_RULE_TEMPLATE_NOT_FOUND",
            message=f"Template {template_id} not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )


# ------------------------------------------------------------------
# Property-level override CRUD
# ------------------------------------------------------------------


@router.get(
    "/properties/{property_id}/rules",
    response_model=StandardResponse[list[EffectiveRuleResponse]],
    status_code=status.HTTP_200_OK,
    summary="Get effective notification rules for property",
    description="Get merged effective notification rules for a property. Requires notifications.rules.view permission.",
)
async def get_property_effective_rules(
    property_id: Annotated[UUID, Path(..., description="Property ID")],
    current_user: Annotated[
        User, Depends(require_permission("notifications.rules.view"))
    ],
    service: Annotated[NotificationRuleService, Depends(get_rule_service)],
) -> StandardResponse[list[EffectiveRuleResponse]]:
    """Get effective notification rules for a property (merged template + override)."""
    # For now, return a single effective rule for the most common event type
    # In a full implementation, this would query all matching templates
    effective = service.get_effective_rules(
        event_type="material_request.created",
        context_type="property",
        context_id=property_id,
        tenant_id=current_user.tenant_id,
    )

    if effective is None:
        return StandardResponse(
            data=[],
            meta={"message": "No rules found for this property"},
        )

    rule_response = EffectiveRuleResponse(
        template_id=effective["template_id"],
        event_type="material_request.created",
        context_type="property",
        context_id=property_id,
        roles=effective["roles"],
        users=effective["users"],
        channels=effective["channels"],
        auto_create_purchase_request=effective["auto_create_purchase_request"],
        has_override=True,
    )

    return StandardResponse(
        data=[rule_response],
        meta={"message": "Effective rules retrieved successfully"},
    )


@router.post(
    "/properties/{property_id}/templates/{template_id}/override",
    response_model=StandardResponse[NotificationRuleOverrideResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create property-level override",
    description="Create a notification rule override for a property. Requires notifications.rules.override permission.",
)
async def create_property_override(
    property_id: Annotated[UUID, Path(..., description="Property ID")],
    template_id: Annotated[UUID, Path(..., description="Template ID")],
    override_data: NotificationRuleOverrideCreate,
    current_user: Annotated[
        User, Depends(require_permission("notifications.rules.override"))
    ],
    service: Annotated[NotificationRuleService, Depends(get_rule_service)],
) -> StandardResponse[NotificationRuleOverrideResponse]:
    """Create a property-level override for a template."""
    override = service.create_override(
        tenant_id=current_user.tenant_id,
        template_id=template_id,
        context_type="property",
        context_id=property_id,
        notify_roles=override_data.notify_roles,
        notify_users=override_data.notify_users,
        channels=override_data.channels,
        auto_create_purchase_request=override_data.auto_create_purchase_request,
        is_active=override_data.is_active,
        created_by=current_user.id,
    )

    return StandardResponse(
        data=NotificationRuleOverrideResponse.model_validate(override),
        meta={"message": "Override created successfully"},
    )


@router.put(
    "/properties/{property_id}/templates/{template_id}/override",
    response_model=StandardResponse[NotificationRuleOverrideResponse],
    status_code=status.HTTP_200_OK,
    summary="Update property-level override",
    description="Update a notification rule override for a property. Requires notifications.rules.override permission.",
)
async def update_property_override(
    property_id: Annotated[UUID, Path(..., description="Property ID")],
    template_id: Annotated[UUID, Path(..., description="Template ID")],
    override_data: NotificationRuleOverrideUpdate,
    current_user: Annotated[
        User, Depends(require_permission("notifications.rules.override"))
    ],
    service: Annotated[NotificationRuleService, Depends(get_rule_service)],
) -> StandardResponse[NotificationRuleOverrideResponse]:
    """Update a property-level override."""
    update_data = override_data.model_dump(exclude_unset=True)

    override = service.update_override(
        template_id=template_id,
        context_type="property",
        context_id=property_id,
        tenant_id=current_user.tenant_id,
        notify_roles=update_data.get("notify_roles"),
        notify_users=update_data.get("notify_users"),
        channels=update_data.get("channels"),
        auto_create_purchase_request=update_data.get("auto_create_purchase_request"),
        is_active=update_data.get("is_active", True),
        updated_by=current_user.id,
    )

    return StandardResponse(
        data=NotificationRuleOverrideResponse.model_validate(override),
        meta={"message": "Override updated successfully"},
    )


@router.delete(
    "/properties/{property_id}/templates/{template_id}/override",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete property-level override",
    description="Delete a notification rule override for a property. Requires notifications.rules.override permission.",
)
async def delete_property_override(
    property_id: Annotated[UUID, Path(..., description="Property ID")],
    template_id: Annotated[UUID, Path(..., description="Template ID")],
    current_user: Annotated[
        User, Depends(require_permission("notifications.rules.override"))
    ],
    service: Annotated[NotificationRuleService, Depends(get_rule_service)],
) -> None:
    """Delete a property-level override."""
    service.delete_override(
        template_id=template_id,
        context_type="property",
        context_id=property_id,
        tenant_id=current_user.tenant_id,
    )


# ------------------------------------------------------------------
# Building-level override CRUD
# ------------------------------------------------------------------


@router.get(
    "/buildings/{building_id}/rules",
    response_model=StandardResponse[list[EffectiveRuleResponse]],
    status_code=status.HTTP_200_OK,
    summary="Get effective notification rules for building",
    description="Get merged effective notification rules for a building. Requires notifications.rules.view permission.",
)
async def get_building_effective_rules(
    building_id: Annotated[UUID, Path(..., description="Building ID")],
    current_user: Annotated[
        User, Depends(require_permission("notifications.rules.view"))
    ],
    service: Annotated[NotificationRuleService, Depends(get_rule_service)],
) -> StandardResponse[list[EffectiveRuleResponse]]:
    """Get effective notification rules for a building (merged template + override)."""
    effective = service.get_effective_rules(
        event_type="material_request.created",
        context_type="building",
        context_id=building_id,
        tenant_id=current_user.tenant_id,
    )

    if effective is None:
        return StandardResponse(
            data=[],
            meta={"message": "No rules found for this building"},
        )

    rule_response = EffectiveRuleResponse(
        template_id=effective["template_id"],
        event_type="material_request.created",
        context_type="building",
        context_id=building_id,
        roles=effective["roles"],
        users=effective["users"],
        channels=effective["channels"],
        auto_create_purchase_request=effective["auto_create_purchase_request"],
        has_override=True,
    )

    return StandardResponse(
        data=[rule_response],
        meta={"message": "Effective rules retrieved successfully"},
    )


@router.post(
    "/buildings/{building_id}/templates/{template_id}/override",
    response_model=StandardResponse[NotificationRuleOverrideResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create building-level override",
    description="Create a notification rule override for a building. Requires notifications.rules.override permission.",
)
async def create_building_override(
    building_id: Annotated[UUID, Path(..., description="Building ID")],
    template_id: Annotated[UUID, Path(..., description="Template ID")],
    override_data: NotificationRuleOverrideCreate,
    current_user: Annotated[
        User, Depends(require_permission("notifications.rules.override"))
    ],
    service: Annotated[NotificationRuleService, Depends(get_rule_service)],
) -> StandardResponse[NotificationRuleOverrideResponse]:
    """Create a building-level override for a template."""
    override = service.create_override(
        tenant_id=current_user.tenant_id,
        template_id=template_id,
        context_type="building",
        context_id=building_id,
        notify_roles=override_data.notify_roles,
        notify_users=override_data.notify_users,
        channels=override_data.channels,
        auto_create_purchase_request=override_data.auto_create_purchase_request,
        is_active=override_data.is_active,
        created_by=current_user.id,
    )

    return StandardResponse(
        data=NotificationRuleOverrideResponse.model_validate(override),
        meta={"message": "Override created successfully"},
    )


@router.put(
    "/buildings/{building_id}/templates/{template_id}/override",
    response_model=StandardResponse[NotificationRuleOverrideResponse],
    status_code=status.HTTP_200_OK,
    summary="Update building-level override",
    description="Update a notification rule override for a building. Requires notifications.rules.override permission.",
)
async def update_building_override(
    building_id: Annotated[UUID, Path(..., description="Building ID")],
    template_id: Annotated[UUID, Path(..., description="Template ID")],
    override_data: NotificationRuleOverrideUpdate,
    current_user: Annotated[
        User, Depends(require_permission("notifications.rules.override"))
    ],
    service: Annotated[NotificationRuleService, Depends(get_rule_service)],
) -> StandardResponse[NotificationRuleOverrideResponse]:
    """Update a building-level override."""
    update_data = override_data.model_dump(exclude_unset=True)

    override = service.update_override(
        template_id=template_id,
        context_type="building",
        context_id=building_id,
        tenant_id=current_user.tenant_id,
        notify_roles=update_data.get("notify_roles"),
        notify_users=update_data.get("notify_users"),
        channels=update_data.get("channels"),
        auto_create_purchase_request=update_data.get("auto_create_purchase_request"),
        is_active=update_data.get("is_active", True),
        updated_by=current_user.id,
    )

    return StandardResponse(
        data=NotificationRuleOverrideResponse.model_validate(override),
        meta={"message": "Override updated successfully"},
    )


@router.delete(
    "/buildings/{building_id}/templates/{template_id}/override",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete building-level override",
    description="Delete a notification rule override for a building. Requires notifications.rules.override permission.",
)
async def delete_building_override(
    building_id: Annotated[UUID, Path(..., description="Building ID")],
    template_id: Annotated[UUID, Path(..., description="Template ID")],
    current_user: Annotated[
        User, Depends(require_permission("notifications.rules.override"))
    ],
    service: Annotated[NotificationRuleService, Depends(get_rule_service)],
) -> None:
    """Delete a building-level override."""
    service.delete_override(
        template_id=template_id,
        context_type="building",
        context_id=building_id,
        tenant_id=current_user.tenant_id,
    )
