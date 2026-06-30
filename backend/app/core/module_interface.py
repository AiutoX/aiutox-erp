"""Module interface for all modules in the system."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from fastapi import APIRouter
from sqlalchemy.orm import Session


@dataclass(slots=True)
class ModuleNavigationSettingRequirement:
    """Requirement for displaying a navigation item based on module settings."""

    module: str
    key: str
    value: Any | None = None


@dataclass(slots=True)
class WidgetManifest:
    """Widget contributed by a module to the user dashboard."""

    widget_id: str  # "{module}.{widget_name}"
    label: str
    description: str
    frontend_component: str = ""  # Lazy import key, e.g. "features/tasks/TasksWidget"
    required_tier: str = "basic"  # basic | pro | enterprise
    width: int = 4  # Grid width (1-12)
    height: int = 2  # Grid height
    config_schema: dict[str, Any] | None = (
        None  # Optional JSON Schema for widget config
    )


@dataclass(slots=True)
class ModuleNavigationItem:
    """Navigation item exposed by a module (main or configuration)."""

    id: str
    label: str
    path: str
    permission: str | None = None
    icon: str | None = None
    category: str | None = None
    order: int = 0
    badge: int | None = None
    requires_module_setting: ModuleNavigationSettingRequirement | None = None


@dataclass(slots=True)
class RolePermissionSeed:
    """Suggested default permission grant for a role, seeded at install time.

    Represents one (role, permission) pair the module suggests as a sensible
    starting point for a tenant. Seeded into RolePermission as an editable,
    per-tenant baseline — NOT a hardcoded grant. Tenants can later revoke or
    extend these via the role-permissions management UI
    (PermissionService.set_role_permissions).
    """

    role: str
    permission: str


class ModuleInterface(ABC):
    """Interface that all modules must implement."""

    @property
    @abstractmethod
    def module_id(self) -> str:
        """Unique module identifier (e.g., 'products', 'auth').

        Returns:
            Module ID in snake_case
        """

    @property
    @abstractmethod
    def module_type(self) -> str:
        """Module type: 'core' for infrastructure or 'business' for business modules.

        Returns:
            'core' or 'business'
        """

    @property
    @abstractmethod
    def enabled(self) -> bool:
        """Whether the module is enabled.

        This should check configuration from ConfigService or default to True.

        Returns:
            True if module is enabled, False otherwise
        """

    def get_router(self) -> APIRouter | None:
        """Get the FastAPI router for this module.

        Returns:
            APIRouter instance if module has API endpoints, None otherwise
        """
        return None

    def get_models(self) -> list:
        """Get all SQLAlchemy models for this module.

        Returns:
            List of SQLAlchemy model classes
        """
        return []

    def get_dependencies(self) -> list[str]:
        """Get list of module IDs this module depends on.

        Returns:
            List of module IDs (e.g., ['auth', 'users', 'pubsub'])
        """
        return []

    def on_load(self) -> None:
        """Callback called when module is loaded by the registry.

        Use this for initialization tasks like registering data sources,
        notification templates, etc.
        """

    def get_navigation_items(self) -> list[ModuleNavigationItem]:
        """Main navigation entries exposed by the module."""

        return []

    def get_settings_navigation(self) -> list[ModuleNavigationItem]:
        """Configuration/navigation entries that should appear under Configuración."""

        return []

    def get_settings_schema(self) -> list[dict]:
        """Field definitions for the module's configurable settings.

        Each dict must have at minimum: key, label, type.
        Supported types: "text", "number", "boolean", "select".
        For "select" include an "options" list.
        For "number" optionally include "min_value" / "max_value".

        Returns:
            List of field definition dicts. Empty list means no configurable settings.
        """
        return []

    @property
    def module_name(self) -> str:
        """Human-readable module name.

        Returns:
            Module name (defaults to module_id)
        """
        return self.module_id

    @property
    def description(self) -> str:
        """Module description.

        Returns:
            Description string (defaults to empty string)
        """
        return ""

    def get_widgets(self) -> list[WidgetManifest]:
        """Get widgets this module contributes to the dashboard.

        Returns:
            List of WidgetManifest objects, empty if module has no widgets
        """
        return []

    def get_role_permission_seeds(self) -> list[RolePermissionSeed]:
        """Suggested default (role, permission) grants seeded at install time.

        Seeded into RolePermission as an editable per-tenant baseline —
        decoupled from the hardcoded MODULE_ROLES catalog so tenants can
        customize them later without being overridden by catalog changes.
        Idempotent: re-installing must not create duplicate rows (the
        underlying table has a UniqueConstraint on tenant_id/role/permission).

        Returns:
            List of RolePermissionSeed pairs. Empty list means the module
            relies solely on the hardcoded MODULE_ROLES catalog.
        """
        return []

    @classmethod
    def get_migrations_path(cls) -> str | None:
        """Return absolute path to this module's migrations/versions directory.

        External modules installed via pip must override this so Alembic can
        discover their migration branches. Built-in modules return None
        because their migrations are found via filesystem scanning.
        """
        return None

    def on_install(self, tenant_id: UUID, db: Session) -> None:
        """Hook called after successful installation.

        Override this to perform post-installation tasks like:
        - Creating default configurations
        - Initializing module-specific data
        - Registering default widgets
        - Setting up notification templates

        Args:
            tenant_id: Tenant being installed for
            db: Database session
        """
        pass

    def on_uninstall(self, tenant_id: UUID, db: Session) -> None:
        """Hook called before hard uninstall.

        Override this to perform pre-uninstall cleanup like:
        - Exporting critical data
        - Cleaning up external resources
        - Notifying dependent modules

        Args:
            tenant_id: Tenant being uninstalled for
            db: Database session
        """
        pass
