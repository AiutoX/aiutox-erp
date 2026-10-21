"""Core catalogs module.

Provides tenant-aware, governed catalog lists (e.g. dropdown/select options),
declared via YAML descriptors (see app.core.catalogs.descriptors) and served
through a fail-open Redis cache (see app.core.catalogs.cache).

Critical infrastructure (ISSUE-014, C11): never tenant-disableable, mirroring
``UsersCoreModule`` / ``ReferenceDataModule`` (ISSUE-007 contract C5) -- every
form that needs a catalog-backed dropdown depends on this module's read
endpoint, so it must never be turned off per-tenant.
"""

from fastapi import APIRouter

from app.core.module_interface import ModuleInterface, ModuleNavigationItem


class CatalogsModule(ModuleInterface):
    """Core catalogs module metadata for the module registry."""

    is_critical = True

    @property
    def module_id(self) -> str:
        return "catalogs"

    @property
    def module_name(self) -> str:
        return "Catalogs"

    @property
    def module_type(self) -> str:
        return "core"

    @property
    def enabled(self) -> bool:
        return True

    def get_router(self) -> APIRouter | None:
        from app.core.catalogs.router import router

        return router

    def get_settings_navigation(self) -> list[ModuleNavigationItem]:
        # Sits after auth's "Roles y permisos" (order=70) and before users
        # (order=80) in the Configuracion sidebar (ISSUE-031, AC-UI-01).
        return [
            ModuleNavigationItem(
                id="catalogs.admin",
                label="Catálogos",
                label_key="config.nav.catalogs",
                path="/config/catalogs",
                permission="catalogs.manage",
                icon="list",
                category="Configuración",
                order=75,
            )
        ]


def create_module(_db: object | None = None) -> CatalogsModule:
    return CatalogsModule()


__all__ = ["CatalogsModule", "create_module"]
