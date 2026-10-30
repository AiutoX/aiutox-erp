"""Event consumer for the reporting module.

Subscribes to the central domain event stream (same one CalendarEventConsumer/
NotificationEventConsumer read) and records report.executed/report.failed
events into ReportExecution + a thin AuditLog entry. ReportingEventPublisher
existed with full payload shape but had zero call sites — see REP-005.
"""

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config_file import get_settings
from app.core.logging import create_audit_log_entry
from app.core.pubsub import EventConsumer, RedisStreamsClient
from app.core.pubsub.models import Event
from app.core.reporting.models import ReportExecution

logger = logging.getLogger(__name__)

_RELEVANT_EVENT_TYPES = {"report.executed", "report.failed"}


class ReportExecutionConsumer:
    """Consumer for report execution events that records execution history."""

    def __init__(self, db: Session, consumer: EventConsumer | None = None):
        """Initialize report execution consumer.

        Args:
            db: Database session
            consumer: EventConsumer instance (created if not provided)
        """
        self.db = db
        self.settings = get_settings()

        if consumer is None:
            client = RedisStreamsClient(
                redis_url=self.settings.REDIS_URL, password=self.settings.REDIS_PASSWORD
            )
            consumer = EventConsumer(client=client)

        self.consumer = consumer
        self._running = False

    async def start(self) -> None:
        """Start consuming report execution events."""
        if self._running:
            logger.warning("Reporting execution consumer is already running")
            return

        self._running = True

        await self.consumer.subscribe(
            group_name="reporting-execution-service",
            consumer_name="reporting-execution-consumer-1",
            event_types=[],  # Empty list = all events; filtered in the callback
            callback=self._handle_event,
            stream_name=self.settings.REDIS_STREAM_DOMAIN,
        )

        logger.info("Reporting execution consumer started")

    async def stop(self) -> None:
        """Stop consuming events."""
        self._running = False
        logger.info("Reporting execution consumer stopped")

    async def _handle_event(self, event: Event) -> None:
        """Record a report execution (success or failure) as a
        ReportExecution row plus a thin AuditLog entry.

        Args:
            event: Event from the domain stream
        """
        if event.event_type not in _RELEVANT_EVENT_TYPES:
            return

        try:
            data = event.metadata.additional_data
            report_id = UUID(str(event.entity_id))
            status = "success" if event.event_type == "report.executed" else "failed"

            execution = ReportExecution(
                report_id=report_id,
                tenant_id=event.tenant_id,
                user_id=event.user_id,
                row_count=data.get("row_count"),
                execution_time_ms=data.get("execution_time_ms"),
                status=status,
                error_message=data.get("error_message"),
                filters_used=data.get("filters"),
            )
            self.db.add(execution)
            self.db.commit()

            audit_action = (
                "reporting.report_executed"
                if status == "success"
                else "reporting.report_failed"
            )
            create_audit_log_entry(
                db=self.db,
                user_id=event.user_id,
                tenant_id=event.tenant_id,
                action=audit_action,
                resource_type="report",
                resource_id=report_id,
            )
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"Error recording execution for report {event.entity_id} "
                f"from event {event.event_type}: {e}",
                exc_info=True,
            )
            # Don't re-raise — continue processing other events
