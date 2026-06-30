"""Automation module PubSub events."""

from uuid import UUID

from app.core.pubsub.event_helpers import safe_publish_event
from app.core.pubsub.publisher import EventPublisher

# Event types
AUTOMATION_CREATED = "automation.created"
AUTOMATION_UPDATED = "automation.updated"
AUTOMATION_DELETED = "automation.deleted"
AUTOMATION_EXECUTED = "automation.executed"
AUTOMATION_FAILED = "automation.failed"
AUTOMATION_TRIGGERED = "automation.triggered"

ALL_AUTOMATION_EVENTS = [
    AUTOMATION_CREATED,
    AUTOMATION_UPDATED,
    AUTOMATION_DELETED,
    AUTOMATION_EXECUTED,
    AUTOMATION_FAILED,
    AUTOMATION_TRIGGERED,
]


class AutomationEventPublisher:
    """Publishes automation-related domain events to PubSub."""

    def __init__(self, event_publisher: EventPublisher):
        self.event_publisher = event_publisher

    def publish_automation_created(
        self,
        rule_id: UUID,
        rule_name: str,
        tenant_id: UUID,
        created_by: UUID,
    ) -> None:
        """Publish automation.created event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=AUTOMATION_CREATED,
            entity_type="automation_rule",
            entity_id=rule_id,
            tenant_id=tenant_id,
            user_id=created_by,
            metadata={
                "rule_name": rule_name,
            },
        )

    def publish_automation_updated(
        self,
        rule_id: UUID,
        tenant_id: UUID,
        updated_by: UUID,
        changes: dict | None = None,
    ) -> None:
        """Publish automation.updated event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=AUTOMATION_UPDATED,
            entity_type="automation_rule",
            entity_id=rule_id,
            tenant_id=tenant_id,
            user_id=updated_by,
            metadata={
                "changes": changes or {},
            },
        )

    def publish_automation_deleted(
        self,
        rule_id: UUID,
        tenant_id: UUID,
        deleted_by: UUID,
    ) -> None:
        """Publish automation.deleted event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=AUTOMATION_DELETED,
            entity_type="automation_rule",
            entity_id=rule_id,
            tenant_id=tenant_id,
            user_id=deleted_by,
        )

    def publish_automation_executed(
        self,
        rule_id: UUID,
        execution_id: UUID,
        tenant_id: UUID,
        status: str,
        result: dict | None = None,
    ) -> None:
        """Publish automation.executed event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=AUTOMATION_EXECUTED,
            entity_type="automation_execution",
            entity_id=execution_id,
            tenant_id=tenant_id,
            metadata={
                "rule_id": str(rule_id),
                "status": status,
                "result": result or {},
            },
        )

    def publish_automation_failed(
        self,
        rule_id: UUID,
        execution_id: UUID,
        tenant_id: UUID,
        error_message: str,
    ) -> None:
        """Publish automation.failed event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=AUTOMATION_FAILED,
            entity_type="automation_execution",
            entity_id=execution_id,
            tenant_id=tenant_id,
            metadata={
                "rule_id": str(rule_id),
                "error_message": error_message,
            },
        )

    def publish_automation_triggered(
        self,
        rule_id: UUID,
        tenant_id: UUID,
        trigger_type: str,
        trigger_data: dict | None = None,
    ) -> None:
        """Publish automation.triggered event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=AUTOMATION_TRIGGERED,
            entity_type="automation_rule",
            entity_id=rule_id,
            tenant_id=tenant_id,
            metadata={
                "trigger_type": trigger_type,
                "trigger_data": trigger_data or {},
            },
        )
