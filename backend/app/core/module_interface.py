"""Module interface for all modules in the system."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any
from uuid import UUID

from fastapi import APIRouter
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from app.core.import_export.handler import ImportExportHandler
    from app.core.search.handler import SearchProvider


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
    label: str  # Fallback text; prefer label_key for user-facing display
    description: str  # Fallback text; prefer description_key
    # Component location, relative to `frontend/app/`, without extension:
    # "features/{module}/widgets/{ComponentName}". The frontend resolver globs
    # `features/**/widgets/*.tsx` and derives this same key from each file's
    # path, so a module contributes a widget by placing its component at the
    # conventional location — no shared frontend file is edited. Mirrors the
    # i18n auto-discovery convention (features/{module}/i18n/{lang}.ts).
    frontend_component: str = ""
    required_tier: str = "basic"  # basic | pro | enterprise
    width: int = 4  # Grid width (1-12)
    height: int = 2  # Grid height
    config_schema: dict[str, Any] | None = (
        None  # Optional JSON Schema for widget config
    )
    permission: str | None = None
    href: str | None = None
    accent_color: str | None = None
    quick_actions: list[dict[str, str]] | None = None
    default_enabled: bool = True
    data_endpoint: str = ""
    # i18n keys resolved frontend-side, falling back to label/description when
    # unset or missing from the catalog. Same contract as
    # ModuleNavigationItem.label_key.
    label_key: str | None = None
    description_key: str | None = None


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
    label_key: str | None = None
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


@dataclass(slots=True)
class NotificationEventDescriptor:
    """A notification event type a module actually fires, self-declared.

    Mirrors the WidgetManifest/RolePermissionSeed self-declaration pattern —
    a module opts into the notification-preferences UI solely by overriding
    get_notification_events(), no central registry file to edit.
    """

    event_type: str  # e.g. "comment.replied" — matches NotificationService.send()'s event_type arg
    module: str  # module_id this event belongs to, used for UI grouping
    label_key: str  # i18n key for the human-readable event label
    default_channels: list[str]
    default_enabled: bool = True


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

    def get_import_export_handler(self) -> "ImportExportHandler | None":
        """Return this module's bulk import/export handler, if it supports one.

        Default: None (module does not support generic import/export). Mirrors
        the get_widgets() pattern — core/import_export discovers handlers via
        ModuleRegistry, never by importing a business module directly.
        """
        return None

    def get_search_handler(self) -> "SearchProvider | None":
        """Return this module's search provider, if it supports being searched.

        Default: None (module's entities are not searchable). Mirrors the
        get_import_export_handler() pattern — core/search discovers providers
        via ModuleRegistry, never by importing a business module directly.
        """
        return None

    def get_notification_events(self) -> list["NotificationEventDescriptor"]:
        """Return notification event types this module actually fires.

        Default: [] (module fires no user-facing notification events).
        Mirrors the get_import_export_handler() pattern — core/notifications
        discovers these via ModuleRegistry, never by importing a business
        module directly.
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

    @classmethod
    def get_required_core_version(cls) -> str | None:
        """Return the PEP 440 version specifier this module requires of core.

        External modules distributed as separate pip packages (e.g. a paid
        business module sold independently of the OSS core) declare which
        core version range they were built and tested against, e.g.
        ``">=0.1.0,<0.2.0"``. The module registry checks this against
        ``app.core.version.CORE_VERSION`` when loading plugins via entry
        points and refuses to load incompatible versions rather than risk
        a mismatch. Built-in modules return None (no constraint — they ship
        in lockstep with core).
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
