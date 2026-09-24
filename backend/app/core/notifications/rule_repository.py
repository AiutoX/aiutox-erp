"""NotificationRuleRepository — CRUD + wildcard resolution for notification rules."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.notifications.rule_models import (
    NotificationRuleOverride,
    NotificationRuleTemplate,
)

# Wildcard priority: lower number = higher priority (returned first)
_PRIORITY = {
    "exact": 0,
    "module_wildcard": 1,
    "action_wildcard": 2,
    "catch_all": 3,
}


def _event_priority(event_type: str, pattern: str) -> int | None:
    """Return priority if pattern matches event_type, else None."""
    if pattern == event_type:
        return _PRIORITY["exact"]

    parts = event_type.split(".", 1)
    module = parts[0] if parts else ""
    action = parts[1] if len(parts) > 1 else ""

    if pattern == f"{module}.*":
        return _PRIORITY["module_wildcard"]
    if action and pattern == f"*.{action}":
        return _PRIORITY["action_wildcard"]
    if pattern == "*":
        return _PRIORITY["catch_all"]

    return None


class NotificationRuleRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

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
        template = NotificationRuleTemplate(
            tenant_id=tenant_id,
            event_type=event_type,
            context_type=context_type,
            description=description,
            is_active=is_active,
            default_notify_roles=default_notify_roles,
            default_notify_users=[str(u) for u in default_notify_users],
            default_channels=default_channels,
            auto_create_purchase_request=auto_create_purchase_request,
            created_by=created_by,
        )
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        return template

    def soft_delete_template(self, template_id: UUID, tenant_id: UUID) -> bool:
        template = (
            self.db.query(NotificationRuleTemplate)
            .filter_by(id=template_id, tenant_id=tenant_id)
            .filter(NotificationRuleTemplate.deleted_at.is_(None))
            .first()
        )
        if template is None:
            return False
        template.deleted_at = datetime.now(UTC)
        self.db.commit()
        return True

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
    ) -> NotificationRuleOverride:
        override = NotificationRuleOverride(
            tenant_id=tenant_id,
            template_id=template_id,
            context_type=context_type,
            context_id=context_id,
            notify_roles=notify_roles,
            notify_users=[str(u) for u in notify_users] if notify_users else None,
            channels=channels,
            auto_create_purchase_request=auto_create_purchase_request,
            is_active=is_active,
            created_by=created_by,
        )
        self.db.add(override)
        self.db.commit()
        self.db.refresh(override)
        return override

    def find_override(
        self,
        template_id: UUID,
        context_type: str,
        context_id: UUID,
    ) -> NotificationRuleOverride | None:
        return (
            self.db.query(NotificationRuleOverride)
            .filter_by(
                template_id=template_id,
                context_type=context_type,
                context_id=context_id,
                is_active=True,
            )
            .first()
        )

    # ------------------------------------------------------------------
    # Wildcard matching
    # ------------------------------------------------------------------

    def find_matching_templates(
        self,
        event_type: str,
        context_type: str,
        tenant_id: UUID,
    ) -> list[NotificationRuleTemplate]:
        """Return active, non-deleted templates matching event_type, ordered by priority."""
        candidates = (
            self.db.query(NotificationRuleTemplate)
            .filter(
                NotificationRuleTemplate.tenant_id == tenant_id,
                NotificationRuleTemplate.is_active.is_(True),
                NotificationRuleTemplate.deleted_at.is_(None),
            )
            .all()
        )

        matched: list[tuple[int, NotificationRuleTemplate]] = []
        for template in candidates:
            priority = _event_priority(event_type, template.event_type)
            if priority is not None:
                matched.append((priority, template))

        matched.sort(key=lambda x: x[0])
        return [t for _, t in matched]

    # ------------------------------------------------------------------
    # Effective rule resolution
    # ------------------------------------------------------------------

    def resolve_effective_rule(
        self,
        event_type: str,
        context_type: str,
        context_id: UUID,
        tenant_id: UUID,
    ) -> dict[str, Any] | None:
        """Merge the most specific matching template with any property/building override.

        Override values take precedence when non-null; template defaults used otherwise.
        Returns None if no template matches.
        """
        templates = self.find_matching_templates(event_type, context_type, tenant_id)
        if not templates:
            return None

        template = templates[0]
        override = self.find_override(template.id, context_type, context_id)  # type: ignore[arg-type]

        roles = (
            override.notify_roles
            if override and override.notify_roles is not None
            else template.default_notify_roles
        )
        users = (
            override.notify_users
            if override and override.notify_users is not None
            else template.default_notify_users
        )
        channels = (
            override.channels
            if override and override.channels is not None
            else template.default_channels
        )
        auto_purchase = (
            override.auto_create_purchase_request
            if override and override.auto_create_purchase_request is not None
            else template.auto_create_purchase_request
        )

        return {
            "template_id": template.id,
            "roles": roles,
            "users": users,
            "channels": channels,
            "auto_create_purchase_request": auto_purchase,
        }
