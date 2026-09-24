"""Reporting service for report management."""

import logging
import time
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import APIException
from app.core.reporting.engine import ReportingEngine
from app.core.reporting.events import ReportingEventPublisher
from app.core.reporting.models import ReportDefinition
from app.repositories.reporting_repository import ReportingRepository

logger = logging.getLogger(__name__)


class ReportingService:
    """Service for managing reports."""

    def __init__(
        self,
        db: Session,
        event_publisher: ReportingEventPublisher | None = None,
    ):
        """Initialize service with database session.

        Args:
            db: Database session
            event_publisher: Optional ReportingEventPublisher. None disables
                event publishing (e.g. internal/system callers).
        """
        self.db = db
        self.repository = ReportingRepository(db)
        self.engine = ReportingEngine(db)
        self.event_publisher = event_publisher

    def create_report(
        self,
        tenant_id: UUID,
        name: str,
        data_source_type: str,
        visualization_type: str,
        created_by: UUID,
        description: str | None = None,
        filters: dict[str, Any] | None = None,
        config: dict[str, Any] | None = None,
    ) -> ReportDefinition:
        """Create a new report definition.

        Args:
            tenant_id: Tenant ID
            name: Report name
            data_source_type: Data source type (e.g., 'products')
            visualization_type: Visualization type ('table', 'chart', 'kpi')
            created_by: User ID who created the report
            description: Report description (optional)
            filters: Filter configuration (optional)
            config: Visualization configuration (optional)

        Returns:
            Created report definition
        """
        report_data = {
            "tenant_id": tenant_id,
            "name": name,
            "description": description,
            "data_source_type": data_source_type,
            "filters": filters,
            "visualization_type": visualization_type,
            "config": config,
            "created_by": created_by,
        }
        report = self.repository.create_report(report_data)
        logger.info(f"Created report '{name}' (ID: {report.id}) for tenant {tenant_id}")
        if self.event_publisher is not None:
            self.event_publisher.publish_report_created(
                report_id=report.id,  # type: ignore[arg-type]
                name=report.name,
                data_source_type=report.data_source_type,
                tenant_id=tenant_id,
                created_by=created_by,
            )
        return report

    def get_report(self, report_id: UUID, tenant_id: UUID) -> ReportDefinition | None:
        """Get a report by ID.

        Args:
            report_id: Report ID
            tenant_id: Tenant ID

        Returns:
            Report or None if not found
        """
        return self.repository.get_report_by_id(report_id, tenant_id)

    def get_all_reports(
        self, tenant_id: UUID, skip: int = 0, limit: int = 100
    ) -> tuple[list[ReportDefinition], int]:
        """Get all reports for a tenant.

        Args:
            tenant_id: Tenant ID
            skip: Pagination offset
            limit: Pagination limit

        Returns:
            Tuple of (page of reports, total count across all pages)
        """
        return self.repository.get_all_reports(tenant_id, skip, limit)

    def update_report(
        self,
        report_id: UUID,
        tenant_id: UUID,
        name: str | None = None,
        description: str | None = None,
        filters: dict[str, Any] | None = None,
        config: dict[str, Any] | None = None,
        updated_by: UUID | None = None,
    ) -> ReportDefinition | None:
        """Update a report.

        Args:
            report_id: Report ID
            tenant_id: Tenant ID
            name: New name (optional)
            description: New description (optional)
            filters: New filters (optional)
            config: New config (optional)
            updated_by: User ID performing the update (optional)

        Returns:
            Updated report or None if not found
        """
        update_data: dict[str, Any] = {}
        if name is not None:
            update_data["name"] = name
        if description is not None:
            update_data["description"] = description
        if filters is not None:
            update_data["filters"] = filters
        if config is not None:
            update_data["config"] = config

        updated_report = self.repository.update_report(
            report_id, tenant_id, update_data
        )
        if updated_report:
            logger.info(f"Updated report {report_id} for tenant {tenant_id}")
            if self.event_publisher is not None:
                self.event_publisher.publish_report_updated(
                    report_id=report_id,
                    tenant_id=tenant_id,
                    updated_by=updated_by,  # type: ignore[arg-type]
                    changes=update_data,
                )
        return updated_report

    def delete_report(
        self, report_id: UUID, tenant_id: UUID, deleted_by: UUID | None = None
    ) -> bool:
        """Delete a report.

        Args:
            report_id: Report ID
            tenant_id: Tenant ID
            deleted_by: User ID performing the deletion (optional)

        Returns:
            True if deleted, False if not found
        """
        result = self.repository.delete_report(report_id, tenant_id)
        if result:
            logger.info(f"Deleted report {report_id} for tenant {tenant_id}")
            if self.event_publisher is not None:
                self.event_publisher.publish_report_deleted(
                    report_id=report_id,
                    tenant_id=tenant_id,
                    deleted_by=deleted_by,  # type: ignore[arg-type]
                )
        return result

    async def execute_report(
        self,
        report_id: UUID,
        tenant_id: UUID,
        filters: dict[str, Any] | None = None,
        pagination: dict[str, int] | None = None,
        user_permissions: set[str] | None = None,
        executed_by: UUID | None = None,
    ) -> dict[str, Any]:
        """Execute a report.

        Args:
            report_id: Report ID
            tenant_id: Tenant ID
            filters: Additional filters to apply
            pagination: Pagination configuration
            user_permissions: Effective permission set of the requesting
                user, checked against the data source's required_permission
                (UX-003 per-dataset enforcement)
            executed_by: User ID performing the execution — used to publish
                report.executed/report.failed (REP-005). None means no
                execution history is recorded (internal/system callers).

        Returns:
            Report execution result

        Raises:
            ValueError: If report not found or data source not registered
            APIException: 403 if user lacks the dataset's required_permission
        """
        report = self.repository.get_report_by_id(report_id, tenant_id)
        if not report:
            raise ValueError(f"Report with ID {report_id} not found")

        start = time.monotonic()
        try:
            result = await self.engine.execute(
                report, filters, pagination, user_permissions
            )
        except APIException as exc:
            if self.event_publisher is not None and executed_by is not None:
                self.event_publisher.publish_report_failed(
                    report_id=report_id,
                    tenant_id=tenant_id,
                    executed_by=executed_by,
                    error_message=exc.message,
                    permission_denied=exc.status_code == 403,
                )
            raise

        execution_time_ms = int((time.monotonic() - start) * 1000)
        if self.event_publisher is not None and executed_by is not None:
            self.event_publisher.publish_report_executed(
                report_id=report_id,
                tenant_id=tenant_id,
                executed_by=executed_by,
                row_count=result.get("total", 0),
                execution_time_ms=execution_time_ms,
            )
        return result
