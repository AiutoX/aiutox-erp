"""Reporting module PubSub events."""

from uuid import UUID

from app.core.pubsub.event_helpers import safe_publish_event
from app.core.pubsub.publisher import EventPublisher

# Event types
REPORT_CREATED = "report.created"
REPORT_UPDATED = "report.updated"
REPORT_DELETED = "report.deleted"
REPORT_EXECUTED = "report.executed"
REPORT_GENERATED = "report.generated"
REPORT_FAILED = "report.failed"

ALL_REPORTING_EVENTS = [
    REPORT_CREATED,
    REPORT_UPDATED,
    REPORT_DELETED,
    REPORT_EXECUTED,
    REPORT_FAILED,
]


class ReportingEventPublisher:
    """Publishes reporting-related domain events to PubSub."""

    def __init__(self, event_publisher: EventPublisher):
        self.event_publisher = event_publisher

    def publish_report_created(
        self,
        report_id: UUID,
        name: str,
        data_source_type: str,
        tenant_id: UUID,
        created_by: UUID,
    ) -> None:
        """Publish report.created event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=REPORT_CREATED,
            entity_type="report",
            entity_id=report_id,
            tenant_id=tenant_id,
            user_id=created_by,
            metadata={
                "report_name": name,
                "data_source_type": data_source_type,
            },
        )

    def publish_report_updated(
        self,
        report_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        changes: dict | None = None,
    ) -> None:
        """Publish report.updated event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=REPORT_UPDATED,
            entity_type="report",
            entity_id=report_id,
            tenant_id=tenant_id,
            user_id=updated_by,
            metadata={
                "changes": changes or {},
            },
        )

    def publish_report_deleted(
        self,
        report_id: UUID,
        tenant_id: UUID,
        deleted_by: UUID,
    ) -> None:
        """Publish report.deleted event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=REPORT_DELETED,
            entity_type="report",
            entity_id=report_id,
            tenant_id=tenant_id,
            user_id=deleted_by,
        )

    def publish_report_executed(
        self,
        report_id: UUID,
        tenant_id: UUID,
        executed_by: UUID,
        row_count: int,
        execution_time_ms: int,
    ) -> None:
        """Publish report.executed event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=REPORT_EXECUTED,
            entity_type="report",
            entity_id=report_id,
            tenant_id=tenant_id,
            user_id=executed_by,
            metadata={
                "row_count": row_count,
                "execution_time_ms": execution_time_ms,
            },
        )

    def publish_report_failed(
        self,
        report_id: UUID,
        tenant_id: UUID,
        executed_by: UUID,
        error_message: str,
    ) -> None:
        """Publish report.failed event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=REPORT_FAILED,
            entity_type="report",
            entity_id=report_id,
            tenant_id=tenant_id,
            user_id=executed_by,
            metadata={
                "error_message": error_message,
            },
        )
