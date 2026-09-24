"""Reporting engine for executing reports."""

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.core.auth.permissions import has_permission
from app.core.exceptions import APIException
from app.core.reporting.data_source import BaseDataSource
from app.core.reporting.models import ReportDefinition
from app.core.reporting.visualizations import (
    ChartVisualization,
    KPIVisualization,
    TableVisualization,
)

logger = logging.getLogger(__name__)


class ReportingEngine:
    """Engine for executing reports."""

    def __init__(self, db: Session | None = None):
        """Initialize reporting engine.

        Args:
            db: Database session (optional for test instantiation)
        """
        self.db = db
        self._data_sources: dict[str, type[BaseDataSource]] = {}

    async def run_report(
        self,
        report_def: "ReportDefinition | None" = None,
        filters: dict[str, Any] | None = None,
        pagination: dict[str, int] | None = None,
    ) -> dict[str, Any]:
        """Alias for execute() — run a report and return results.

        Args:
            report_def: Report definition (may be None for scaffolded calls)
            filters: Additional filters
            pagination: Pagination config

        Returns:
            Report results dict
        """
        if report_def is None:
            return {"data": [], "total": 0}
        return await self.execute(report_def, filters, pagination)

    def register_data_source(
        self, source_type: str, data_source_class: type[BaseDataSource]
    ) -> None:
        """Register a data source class.

        Args:
            source_type: Data source type identifier (e.g., 'products')
            data_source_class: Data source class that inherits from BaseDataSource
        """
        self._data_sources[source_type] = data_source_class
        logger.info(f"Registered data source: {source_type}")

    async def execute(
        self,
        report_def: ReportDefinition,
        filters: dict[str, Any] | None = None,
        pagination: dict[str, int] | None = None,
        user_permissions: set[str] | None = None,
    ) -> dict[str, Any]:
        """Execute a report.

        Args:
            report_def: Report definition
            filters: Additional filters to apply
            pagination: Pagination configuration
            user_permissions: Effective permission set of the requesting
                user. Checked against the data source's declared
                required_permission before execution (UX-003) — None means
                no check is performed (internal/system callers, not HTTP
                requests).

        Returns:
            Dictionary with report data and visualization

        Raises:
            ValueError: If data source type is not registered
            APIException: 403 if user_permissions is provided and lacks the
                data source's required_permission. 502 if the data source
                fails to initialize (e.g. its backing module isn't
                installed, like `products` without aiutox-module-products —
                registered classes always import cleanly since their own
                internal ImportError guard only wraps the third-party repo
                import, not the class itself) or raises while fetching data
                (DB error, missing related record, etc.) — wrapped so every
                caller (HTTP router, internal callers, and the REP-005
                execution-history consumer, which needs a real APIException
                to record a failed ReportExecution/AuditLog entry) gets the
                project's standard structured error instead of a raw
                exception.
        """
        # Get data source class
        data_source_class = self._data_sources.get(report_def.data_source_type)
        if not data_source_class:
            raise ValueError(
                f"Data source type '{report_def.data_source_type}' is not registered"
            )

        required_permission = getattr(data_source_class, "required_permission", None)
        if (
            user_permissions is not None
            and required_permission is not None
            and not has_permission(user_permissions, required_permission)
        ):
            raise APIException(
                code="REPORTING_DATASET_FORBIDDEN",
                message=(
                    f"You do not have the '{required_permission}' permission "
                    f"required to access the '{report_def.data_source_type}' dataset"
                ),
                status_code=403,
            )

        # Create data source instance
        assert self.db is not None, "Database session required to execute reports"
        try:
            data_source = data_source_class(
                self.db, report_def.tenant_id, user_permissions
            )
        except Exception as exc:
            logger.error(
                f"Data source '{report_def.data_source_type}' failed to "
                f"initialize: {exc}",
                exc_info=True,
            )
            raise APIException(
                code="REPORTING_EXECUTION_FAILED",
                message=(
                    f"Failed to execute report against data source "
                    f"'{report_def.data_source_type}'"
                ),
                status_code=502,
            ) from exc

        # Merge filters
        merged_filters: dict[str, Any] = (
            dict(report_def.filters) if isinstance(report_def.filters, dict) else {}
        )
        if filters:
            merged_filters.update(filters)

        # Get data
        try:
            data_result = await data_source.get_data(merged_filters, pagination)
        except Exception as exc:
            logger.error(
                f"Data source '{report_def.data_source_type}' failed during "
                f"execution: {exc}",
                exc_info=True,
            )
            raise APIException(
                code="REPORTING_EXECUTION_FAILED",
                message=(
                    f"Failed to execute report against data source "
                    f"'{report_def.data_source_type}'"
                ),
                status_code=502,
            ) from exc

        # Apply visualization
        visualization = self._get_visualization(report_def.visualization_type)
        visualization_result = visualization.render(
            data_result["data"], report_def.config or {}
        )

        return {
            "data": data_result["data"],
            "total": data_result["total"],
            "visualization": visualization_result,
            "columns": data_source.get_columns(),
        }

    def _get_visualization(self, visualization_type: str):
        """Get visualization instance.

        Args:
            visualization_type: Type of visualization ('table', 'chart', 'kpi')

        Returns:
            Visualization instance

        Raises:
            ValueError: If visualization type is not supported
        """
        if visualization_type == "table":
            return TableVisualization()
        elif visualization_type == "chart":
            return ChartVisualization()
        elif visualization_type == "kpi":
            return KPIVisualization()
        else:
            raise ValueError(f"Unsupported visualization type: {visualization_type}")
