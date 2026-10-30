"""Reporting module for extensible report infrastructure."""

from app.core.module_interface import ModuleInterface, ModuleNavigationItem
from app.core.reporting.data_source import BaseDataSource
from app.core.reporting.engine import ReportingEngine
from app.core.reporting.service import ReportingService


class ReportingCoreModule(ModuleInterface):
    """Core reporting module metadata for dynamic navigation.

    Reporting's routes are mounted directly in app/api/v1/__init__.py, not via
    get_router() here — the ModuleRegistry.get_routers() path is dead code, so
    get_router() is intentionally not overridden (a second mount would
    duplicate every /reporting route if that path were ever revived). This
    class exists to publish the sidebar entry (UX-012).
    """

    @property
    def module_id(self) -> str:
        return "reporting"

    @property
    def module_name(self) -> str:
        return "Reportes"

    @property
    def module_type(self) -> str:
        return "core"

    @property
    def enabled(self) -> bool:
        return True

    def get_navigation_items(self) -> list[ModuleNavigationItem]:
        return [
            ModuleNavigationItem(
                id="reporting.main",
                label="Reportes",
                label_key="reporting.nav.main",
                path="/reporting",
                # reporting.view is what every /reporting page route requires
                # and what the reporting module roles grant; reporting.read is
                # held by none of them.
                permission="reporting.view",
                icon="grid",
                order=20,
            )
        ]


def create_module(_db: object | None = None) -> ReportingCoreModule:
    return ReportingCoreModule()


__all__ = [
    "BaseDataSource",
    "ReportingEngine",
    "ReportingService",
    "ReportingCoreModule",
    "create_module",
]
