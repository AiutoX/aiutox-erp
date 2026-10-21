"""Reference data core module — countries, currencies, languages, admin divisions.

Global, tenant-independent lookup tables (MODULE-SPEC Section 9). Critical
infrastructure: never tenant-disableable, mirroring ``AuthCoreModule`` /
``UsersCoreModule`` (ISSUE-007 contract C5). Schema creation is a separate,
HITL-gated Alembic migration (ISSUE-023); the read API is ISSUE-026's scope,
so ``get_router()`` is intentionally not overridden here (the
``ModuleInterface`` default already returns ``None``).
"""

from app.core.module_interface import ModuleInterface


class ReferenceDataModule(ModuleInterface):
    """Core reference-data module metadata for dynamic navigation."""

    is_critical = True

    @property
    def module_id(self) -> str:
        return "reference_data"

    @property
    def module_name(self) -> str:
        return "Datos de referencia"

    @property
    def module_type(self) -> str:
        return "core"

    @property
    def enabled(self) -> bool:
        return True

    def get_models(self) -> list[type]:
        from app.core.reference_data.models import (
            RefAdminDivision,
            RefCountry,
            RefCurrency,
            RefLanguage,
            RefSyncState,
        )

        return [RefCountry, RefCurrency, RefLanguage, RefAdminDivision, RefSyncState]


def create_module(_db: object | None = None) -> ReferenceDataModule:
    return ReferenceDataModule()


__all__ = ["ReferenceDataModule", "create_module"]
