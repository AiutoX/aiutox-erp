"""RBAC permissions for the automation module."""

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def resolve_owner_permissions(db: Session, owner_user_id: UUID | None) -> set[str]:
    """Re-resolve current permissions for the rule owner at execution time.

    Returns empty set if owner_user_id is None, user not found, or deactivated.
    Empty set always causes a permission_denied halt in the engine.
    """
    if not owner_user_id:
        return set()

    from app.repositories.user_repository import UserRepository
    from app.services.permission_service import PermissionService

    user = UserRepository(db).get_by_id(owner_user_id)
    if user is None or not user.is_active:
        logger.warning(
            "resolve_owner_permissions: user %s not found or inactive", owner_user_id
        )
        return set()

    return PermissionService(db).get_effective_permissions(user.id)


# Automation permissions
AUTOMATION_READ = "automation.read"
AUTOMATION_WRITE = "automation.write"
AUTOMATION_DELETE = "automation.delete"
AUTOMATION_ADMIN = "automation.admin"

# All automation permissions
ALL_AUTOMATION_PERMISSIONS = [
    AUTOMATION_READ,
    AUTOMATION_WRITE,
    AUTOMATION_DELETE,
    AUTOMATION_ADMIN,
]

# Permission descriptions
PERMISSION_DESCRIPTIONS = {
    AUTOMATION_READ: "View automation rules and execution history",
    AUTOMATION_WRITE: "Create and update automation rules",
    AUTOMATION_DELETE: "Delete automation rules",
    AUTOMATION_ADMIN: "Manage all automation settings and execute rules manually",
}
