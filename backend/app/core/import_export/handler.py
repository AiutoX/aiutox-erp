"""Extension point letting a core/business module plug into generic import/export.

A module that supports bulk import/export implements ImportExportHandler and
returns it from ModuleInterface.get_import_export_handler(). core/import_export
never imports the module directly — it calls this interface polymorphically via
ModuleRegistry, the same pattern already used for get_widgets()/WidgetManifest.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from uuid import UUID


@dataclass(slots=True)
class ImportResult:
    """Outcome of importing a batch of rows."""

    successful: int
    failed: int
    errors: list[dict] = field(default_factory=list)


class ImportExportHandler(ABC):
    """Implemented by a module to support generic bulk import/export.

    Both methods are async because the underlying module services they call
    (e.g. TaskService.create_task) are async; ImportExportService.process_*
    (the only callers) are themselves async and await these directly.
    """

    @abstractmethod
    async def import_rows(
        self, rows: list[dict], tenant_id: UUID, user_id: UUID
    ) -> ImportResult:
        """Persist validated rows into this module's real data.

        Args:
            rows: parsed rows (already CSV/Excel-decoded, still raw strings/None).
            tenant_id: tenant to scope every write to.
            user_id: user to attribute created records to.

        Returns:
            ImportResult with per-row success/failure counts and row-level errors.
        """

    @abstractmethod
    async def export_rows(
        self, tenant_id: UUID, filters: dict | None = None
    ) -> list[dict]:
        """Return this module's real data as flat dict rows, tenant-scoped."""
