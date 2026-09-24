"""Base data source for reporting infrastructure."""

from abc import ABC, abstractmethod
from typing import Any, ClassVar

from sqlalchemy.orm import Session


class BaseDataSource(ABC):
    """Abstract base class for data sources."""

    #: Permission a user must hold to execute, list columns for, or list
    #: filters for this dataset (e.g. "billing.view"). None means the
    #: dataset requires no permission beyond reporting.view/manage itself —
    #: subclasses should always set a real value; None only preserves
    #: BaseDataSource's own instantiability for tests/mocks.
    required_permission: ClassVar[str | None] = None

    #: The exact key this class is registered under in DataSourceRegistry
    #: (e.g. "billing", "products") — used to scope FieldPermission rule
    #: lookups. Must match the registry key exactly; subclasses should
    #: always set a real value.
    dataset_type: ClassVar[str | None] = None

    def __init__(
        self,
        db: Session,
        tenant_id: Any,
        user_permissions: set[str] | None = None,
    ):
        """Initialize data source.

        Args:
            db: Database session
            tenant_id: Tenant ID for multi-tenancy
            user_permissions: Effective permission set of the requesting
                user, used by get_columns()/get_data() to filter columns
                a FieldPermission rule blocks them from seeing. None means
                "no restriction" (internal/system callers, not HTTP requests).
        """
        self.db = db
        self.tenant_id = tenant_id
        self.user_permissions = user_permissions

    def _column_rule_service(self):
        """Lazily build the column rule service (avoids a hard import at
        module load time and lets tests construct a BaseDataSource without
        a real DB/repository)."""
        from app.core.reporting.column_rule_service import ReportingColumnRuleService
        from app.repositories.reporting_repository import ReportingRepository

        return ReportingColumnRuleService(ReportingRepository(self.db))

    def _filter_columns(self, columns: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Drop any column a FieldPermission rule blocks user_permissions
        from seeing. Call at the end of get_columns() (FR-7)."""
        if self.dataset_type is None:
            return columns
        return self._column_rule_service().filter_columns(
            self.tenant_id, self.dataset_type, columns, self.user_permissions
        )

    def _filter_rows(self, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Strip any ruled-out column key from every row — defense in depth
        alongside _filter_columns (FR-7)."""
        if self.dataset_type is None:
            return rows
        return self._column_rule_service().filter_rows(
            self.tenant_id, self.dataset_type, rows, self.user_permissions
        )

    @abstractmethod
    async def get_data(
        self,
        filters: dict[str, Any] | None = None,
        pagination: dict[str, int] | None = None,
    ) -> dict[str, Any]:
        """Get data for the report.

        Args:
            filters: Filter configuration
            pagination: Pagination configuration (skip, limit)

        Returns:
            Dictionary with 'data' (list of rows) and 'total' (total count)
        """

    @abstractmethod
    def get_columns(self) -> list[dict[str, Any]]:
        """Get available columns for this data source.

        Each column is a dict with:
            name:      column identifier, used as the key into result rows
            type:      "string" | "number" | "datetime" | "boolean" | "uuid"
            label:     fallback display text, in English
            label_key: i18n key resolved frontend-side, e.g.
                       "reporting.columns.inventory.unit_cost"

        **Always set `label_key`.** `label` alone renders verbatim in whatever
        locale the user is in — an English header over Spanish content (UX-008).
        The frontend resolves `label_key` and falls back to `label` when the key
        is missing from the catalog, so a stale key degrades to English rather
        than rendering the raw key.

        This mirrors ModuleNavigationItem.label_key and WidgetManifest.label_key
        — the same contract in all three places.

        Returns:
            List of column definitions.
        """

    @abstractmethod
    def get_filters(self) -> list[dict[str, Any]]:
        """Get available filters for this data source.

        Returns:
            List of filter definitions with 'name', 'type', 'options', etc.
        """
