"""Core users module — canonical home for User, UserRole, Organization models."""

from typing import TYPE_CHECKING

from fastapi import APIRouter

from app.core.module_interface import ModuleInterface, ModuleNavigationItem

if TYPE_CHECKING:
    from app.core.catalogs.descriptors import CatalogDescriptor


class UsersCoreModule(ModuleInterface):
    """Core users module metadata for dynamic navigation."""

    is_critical = True

    @property
    def module_id(self) -> str:
        return "users"

    @property
    def module_name(self) -> str:
        return "Usuarios"

    @property
    def module_type(self) -> str:
        return "core"

    @property
    def enabled(self) -> bool:
        return True

    def get_router(self) -> APIRouter | None:
        from app.api.v1.users import router

        return router

    def get_settings_navigation(self) -> list[ModuleNavigationItem]:
        return [
            ModuleNavigationItem(
                id="users.main",
                label="Usuarios",
                label_key="users.nav.main",
                path="/users",
                permission="users.view",
                icon="user",
                category="Configuración",
                order=80,
            )
        ]

    def get_search_handler(self):
        from app.core.db.session import SessionLocal
        from app.core.users.search_provider import UsersSearchProvider

        return UsersSearchProvider(SessionLocal())

    def get_catalogs(self) -> list["CatalogDescriptor"]:
        from pathlib import Path

        from app.core.catalogs.descriptors import load_catalog_declarations

        return load_catalog_declarations(Path(__file__).parent / "catalogs.yaml")


def create_module(_db: object | None = None) -> UsersCoreModule:
    return UsersCoreModule()


__all__ = ["UsersCoreModule", "create_module"]
