"""TEMPLATE module for AiutoX ERP."""

from pathlib import Path

from aiutox_sdk.module_interface import ModuleInterface, ModuleNavigationItem
from fastapi import APIRouter


class TemplateModule(ModuleInterface):
    """TEMPLATE module implementation."""

    @property
    def module_id(self) -> str:
        return "TEMPLATE"

    @property
    def module_type(self) -> str:
        return "business"

    @property
    def enabled(self) -> bool:
        return True

    def get_router(self) -> APIRouter | None:
        from aiutox_module_TEMPLATE.api import router

        return router

    def get_models(self) -> list:
        return []

    def get_dependencies(self) -> list[str]:
        return ["auth", "users", "pubsub"]

    @classmethod
    def get_migrations_path(cls) -> str | None:
        return str(Path(__file__).parent / "migrations" / "versions")

    def get_navigation_items(self) -> list[ModuleNavigationItem]:
        return [
            ModuleNavigationItem(
                id="TEMPLATE.main",
                label="TEMPLATE",
                path="/TEMPLATE",
                permission="TEMPLATE.view",
                icon="grid",
                order=0,
            ),
        ]

    @property
    def module_name(self) -> str:
        return "TEMPLATE"

    @property
    def description(self) -> str:
        return "TEMPLATE module for AiutoX ERP"
