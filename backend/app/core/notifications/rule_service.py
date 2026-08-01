"""NotificationRuleService — business logic for notification rule templates and overrides."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.core.exceptions import APIException
from app.core.notifications.rule_models import NotificationRuleTemplate
from app.core.notifications.rule_repository import NotificationRuleRepository

VALID_CHANNELS = {"email", "push", "sms", "whatsapp", "webhook"}


class NotificationRuleService:
    """Service layer for notification rule management.

    Handles template CRUD, override CRUD, and effective rule resolution.
    All operations are tenant-scoped and validate permissions at the API layer.
    """

    def __init__(self, repository: NotificationRuleRepository) -> None:
        self.repo = repository

    # ------------------------------------------------------------------
    # Template CRUD
    # ------------------------------------------------------------------

    def create_template(
        self,
        *,
        tenant_id: UUID,
        event_type: str,
        context_type: str,
        description: str | None,
        is_active: bool,
        default_notify_roles: list[str],
        default_notify_users: list[UUID],
        default_channels: list[str],
        auto_create_purchase_request: bool,
        created_by: UUID,
    ) -> NotificationRuleTemplate:
        """Create a new notification rule template."""
        # Validate event_type format
        if "." not in event_type:
            raise APIException(
                code="NOTIFICATION_RULE_INVALID_EVENT_TYPE",
                message="event_type must be in format 'module.action' (e.g., 'material_request.created')",
                status_code=400,
            )

        # Validate channels
        invalid_channels = set(default_channels) - VALID_CHANNELS
        if invalid_channels:
            raise APIException(
                code="NOTIFICATION_RULE_INVALID_CHANNEL",
                message=f"Invalid channels: {', '.join(sorted(invalid_channels))}",
                status_code=400,
            )

        return self.repo.create_template(
            tenant_id=tenant_id,
            event_type=event_type,
            context_type=context_type,
            description=description,
            is_active=is_active,
            default_notify_roles=default_notify_roles,
            default_notify_users=default_notify_users,
            default_channels=default_channels,
            auto_create_purchase_request=auto_create_purchase_request,
            created_by=created_by,
        )

    def get_template(
        self, template_id: UUID, tenant_id: UUID
    ) -> NotificationRuleTemplate:
        """Get a template by ID, scoped to tenant."""
        template = (
            self.repo.db.query(NotificationRuleTemplate)
            .filter_by(id=template_id, tenant_id=tenant_id)
            .filter(NotificationRuleTemplate.deleted_at.is_(None))
            .first()
        )
        if template is None:
            raise APIException(
                code="NOTIFICATION_RULE_TEMPLATE_NOT_FOUND",
                message=f"Notification rule template {template_id} not found",
                status_code=404,
            )
        return template

    def list_templates(self, tenant_id: UUID) -> list[NotificationRuleTemplate]:
        """List all active, non-deleted templates for a tenant."""
        return (
            self.repo.db.query(NotificationRuleTemplate)
            .filter_by(tenant_id=tenant_id)
            .filter(NotificationRuleTemplate.deleted_at.is_(None))
            .all()
        )

    def update_template(
        self,
        *,
        template_id: UUID,
        tenant_id: UUID,
        event_type: str,
        description: str | None,
        is_active: bool,
        default_notify_roles: list[str],
        default_notify_users: list[UUID],
        default_channels: list[str],
        auto_create_purchase_request: bool,
        updated_by: UUID,
    ) -> NotificationRuleTemplate:
        """Update a notification rule template."""
        template = self.get_template(template_id, tenant_id)

        template.event_type = event_type
        template.description = description
        template.is_active = is_active
        template.default_notify_roles = default_notify_roles
        template.default_notify_users = [str(u) for u in default_notify_users]
        template.default_channels = default_channels
        template.auto_create_purchase_request = auto_create_purchase_request
        template.updated_by = updated_by  # type: ignore[assignment]

        self.repo.db.commit()
        self.repo.db.refresh(template)
        return template

    def delete_template(self, template_id: UUID, tenant_id: UUID) -> bool:
        """Soft-delete a notification rule template."""
        return self.repo.soft_delete_template(
            template_id=template_id, tenant_id=tenant_id
        )

    # ------------------------------------------------------------------
    # Override CRUD
    # ------------------------------------------------------------------

    def create_override(
        self,
        *,
        tenant_id: UUID,
        template_id: UUID,
        context_type: str,
        context_id: UUID,
        notify_roles: list[str] | None,
        notify_users: list[UUID] | None,
        channels: list[str] | None,
        auto_create_purchase_request: bool | None,
        is_active: bool,
        created_by: UUID,
    ) -> Any:
        """Create a property/building-level override for a template."""
        # Verify template exists and belongs to tenant
        self.get_template(template_id, tenant_id)

        return self.repo.create_override(
            tenant_id=tenant_id,
            template_id=template_id,
            context_type=context_type,
            context_id=context_id,
            notify_roles=notify_roles,
            notify_users=notify_users,
            channels=channels,
            auto_create_purchase_request=auto_create_purchase_request,
            is_active=is_active,
            created_by=created_by,
        )

    def update_override(
        self,
        *,
        template_id: UUID,
        context_type: str,
        context_id: UUID,
        tenant_id: UUID,
        notify_roles: list[str] | None,
        notify_users: list[UUID] | None,
        channels: list[str] | None,
        auto_create_purchase_request: bool | None,
        is_active: bool,
        updated_by: UUID,
    ) -> Any:
        """Update an existing override."""
        override = self.repo.find_override(template_id, context_type, context_id)
        if override is None:
            raise APIException(
                code="NOTIFICATION_RULE_OVERRIDE_NOT_FOUND",
                message=f"Override for template {template_id} in {context_type} {context_id} not found",
                status_code=404,
            )

        override.notify_roles = notify_roles
        override.notify_users = [str(u) for u in notify_users] if notify_users else None
        override.channels = channels
        override.auto_create_purchase_request = auto_create_purchase_request
        override.is_active = is_active
        override.updated_by = updated_by  # type: ignore[assignment]

        self.repo.db.commit()
        self.repo.db.refresh(override)
        return override

    def delete_override(
        self,
        *,
        template_id: UUID,
        context_type: str,
        context_id: UUID,
        tenant_id: UUID,
    ) -> None:
        """Hard-delete an override."""
        override = self.repo.find_override(template_id, context_type, context_id)
        if override is None:
            raise APIException(
                code="NOTIFICATION_RULE_OVERRIDE_NOT_FOUND",
                message=f"Override for template {template_id} in {context_type} {context_id} not found",
                status_code=404,
            )

        self.repo.db.delete(override)
        self.repo.db.commit()

    # ------------------------------------------------------------------
    # Effective rule resolution
    # ------------------------------------------------------------------

    def get_effective_rules(
        self,
        *,
        event_type: str,
        context_type: str,
        context_id: UUID,
        tenant_id: UUID,
    ) -> dict[str, Any] | None:
        """Get merged effective rules (template defaults + override values).

        Override values take precedence when non-null; template defaults used otherwise.
        Returns None if no template matches.
        """
        return self.repo.resolve_effective_rule(
            event_type=event_type,
            context_type=context_type,
            context_id=context_id,
            tenant_id=tenant_id,
        )
