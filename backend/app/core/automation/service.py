"""Automation service for rule management."""

import logging
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.automation.events import AutomationEventPublisher
from app.core.automation.models import AutomationExecution, Rule
from app.core.pubsub.publisher import EventPublisher
from app.repositories.automation_repository import AutomationRepository

logger = logging.getLogger(__name__)


class AutomationService:
    """Service for automation rule management."""

    def __init__(self, db: Session, publisher: EventPublisher | None = None):
        """Initialize service with database session.

        Args:
            db: Database session
            publisher: EventPublisher instance for publishing events (optional)
        """
        self.db = db
        self.repository = AutomationRepository(db)
        self.publisher = publisher
        self._event_publisher = (
            AutomationEventPublisher(publisher) if publisher else None
        )

    def create_rule(
        self,
        tenant_id: UUID,
        name: str,
        trigger: dict[str, Any],
        actions: list[dict[str, Any]],
        description: str | None = None,
        conditions: list[dict[str, Any]] | None = None,
        enabled: bool = True,
        owner_user_id: UUID | None = None,
    ) -> Rule:
        """Create a new automation rule.

        Args:
            tenant_id: Tenant ID
            name: Rule name
            trigger: Trigger configuration (event or time)
            actions: List of actions to execute
            description: Rule description (optional)
            conditions: List of conditions (optional)
            enabled: Whether rule is enabled

        Returns:
            Created rule
        """
        rule_data = {
            "tenant_id": tenant_id,
            "name": name,
            "description": description,
            "enabled": enabled,
            "trigger": trigger,
            "conditions": conditions or [],
            "actions": actions,
            "owner_user_id": owner_user_id,
        }
        rule = self.repository.create_rule(rule_data)

        # Create initial version
        self.repository.create_rule_version(
            {
                "rule_id": rule.id,
                "version": 1,
                "definition": {
                    "name": name,
                    "description": description,
                    "trigger": trigger,
                    "conditions": conditions or [],
                    "actions": actions,
                },
            }
        )

        if self._event_publisher:
            self._event_publisher.publish_automation_created(
                rule_id=rule.id,  # type: ignore[arg-type]
                rule_name=name,
                tenant_id=tenant_id,
                created_by=owner_user_id or UUID(int=0),
            )

        logger.info(f"Created rule '{name}' (ID: {rule.id}) for tenant {tenant_id}")
        return rule

    def get_rule(self, rule_id: UUID, tenant_id: UUID) -> Rule | None:
        """Get a rule by ID.

        Args:
            rule_id: Rule ID
            tenant_id: Tenant ID

        Returns:
            Rule or None if not found
        """
        return self.repository.get_rule_by_id(rule_id, tenant_id)

    def get_all_rules(
        self,
        tenant_id: UUID,
        enabled_only: bool = False,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Rule]:
        """Get all rules for a tenant.

        Args:
            tenant_id: Tenant ID
            enabled_only: Only return enabled rules
            skip: Pagination offset
            limit: Pagination limit

        Returns:
            List of rules
        """
        return self.repository.get_all_rules(tenant_id, enabled_only, skip, limit)

    def count_all_rules(self, tenant_id: UUID, enabled_only: bool = False) -> int:
        """Count all rules for a tenant.

        Args:
            tenant_id: Tenant ID
            enabled_only: Only count enabled rules

        Returns:
            Count of rules
        """
        return self.repository.count_all_rules(tenant_id, enabled_only)

    def update_rule(
        self,
        rule_id: UUID,
        tenant_id: UUID,
        name: str | None = None,
        description: str | None = None,
        trigger: dict[str, Any] | None = None,
        conditions: list[dict[str, Any]] | None = None,
        actions: list[dict[str, Any]] | None = None,
        enabled: bool | None = None,
    ) -> Rule | None:
        """Update a rule.

        Args:
            rule_id: Rule ID
            tenant_id: Tenant ID
            name: New name (optional)
            description: New description (optional)
            trigger: New trigger (optional)
            conditions: New conditions (optional)
            actions: New actions (optional)
            enabled: New enabled status (optional)

        Returns:
            Updated rule or None if not found
        """
        rule = self.repository.get_rule_by_id(rule_id, tenant_id)
        if not rule:
            return None

        update_data: dict[str, Any] = {}
        if name is not None:
            update_data["name"] = name
        if description is not None:
            update_data["description"] = description
        if trigger is not None:
            update_data["trigger"] = trigger
        if conditions is not None:
            update_data["conditions"] = conditions
        if actions is not None:
            update_data["actions"] = actions
        if enabled is not None:
            update_data["enabled"] = enabled

        updated_rule = self.repository.update_rule(rule_id, tenant_id, update_data)

        # Create new version if rule definition changed
        if updated_rule and (
            trigger is not None or conditions is not None or actions is not None
        ):
            latest_version = self.repository.get_latest_version(rule_id)
            new_version = (latest_version.version + 1) if latest_version else 1
            self.repository.create_rule_version(
                {
                    "rule_id": rule_id,
                    "version": new_version,
                    "definition": {
                        "name": updated_rule.name,
                        "description": updated_rule.description,
                        "trigger": updated_rule.trigger,
                        "conditions": updated_rule.conditions or [],
                        "actions": updated_rule.actions,
                    },
                }
            )

        # Publish event
        if self._event_publisher:
            self._event_publisher.publish_automation_updated(
                rule_id=rule_id,
                tenant_id=tenant_id,
                updated_by=UUID(int=0),
            )

        logger.info(f"Updated rule {rule_id} for tenant {tenant_id}")
        return updated_rule

    def delete_rule(self, rule_id: UUID, tenant_id: UUID) -> bool:
        """Delete a rule.

        Args:
            rule_id: Rule ID
            tenant_id: Tenant ID

        Returns:
            True if deleted, False if not found
        """
        result = self.repository.delete_rule(rule_id, tenant_id)
        if result:
            # Publish event
            if self._event_publisher:
                self._event_publisher.publish_automation_deleted(
                    rule_id=rule_id,
                    tenant_id=tenant_id,
                    deleted_by=UUID(int=0),
                )

            logger.info(f"Deleted rule {rule_id} for tenant {tenant_id}")
        return result

    def get_executions(
        self, rule_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[AutomationExecution]:
        """Get execution history for a rule.

        Args:
            rule_id: Rule ID
            skip: Pagination offset
            limit: Pagination limit

        Returns:
            List of executions
        """
        return self.repository.get_executions_by_rule(rule_id, skip, limit)

    def count_executions(self, rule_id: UUID) -> int:
        """Count executions for a rule.

        Args:
            rule_id: Rule ID

        Returns:
            Count of executions
        """
        return self.repository.count_executions_by_rule(rule_id)

    async def fire_webhook_rule(
        self,
        rule: Rule,
        request_body: dict[str, Any],
    ) -> AutomationExecution:
        """Execute a webhook-triggered rule with a synthetic event.

        Args:
            rule: Rule ORM object (already validated by caller).
            request_body: Raw request body dict embedded as additional_data.

        Returns:
            AutomationExecution record.
        """
        from app.core.automation.engine import AutomationEngine
        from app.core.pubsub.models import Event, EventMetadata

        synthetic_event = Event(
            event_type="automation.webhook_triggered",
            entity_type="webhook",
            entity_id=UUID(str(rule.id)),
            tenant_id=UUID(str(rule.tenant_id)),
            user_id=None,
            metadata=EventMetadata(
                source="webhook_trigger",
                version="1.0",
                additional_data=request_body,
            ),
        )
        engine = AutomationEngine(self.db)
        return await engine.execute_rule(rule, synthetic_event)

    def rotate_webhook_secret(
        self,
        rule_id: UUID,
        tenant_id: UUID,
    ) -> tuple[Rule, str] | None:
        """Generate a new webhook secret for a rule and store its SHA-256 hash.

        Args:
            rule_id: Rule ID.
            tenant_id: Tenant scope.

        Returns:
            (updated_rule, plaintext_secret) or None if rule not found.
            The plaintext secret is returned once and never stored.
        """
        import hashlib
        import secrets as _secrets

        rule = self.repository.get_rule_by_id(rule_id, tenant_id)
        if not rule:
            return None

        raw_secret = _secrets.token_hex(32)
        secret_hash = hashlib.sha256(raw_secret.encode()).hexdigest()

        trigger = dict(rule.trigger) if isinstance(rule.trigger, dict) else {}
        params = dict(trigger.get("params", {}))
        params["secret_hash"] = secret_hash
        trigger["params"] = params

        updated = self.repository.update_rule(rule_id, tenant_id, {"trigger": trigger})
        if updated is None:
            return None
        return (updated, raw_secret)

    async def test_rule(
        self,
        rule_id: UUID,
        tenant_id: UUID,
        event_type: str,
        payload: dict[str, Any],
        current_user_id: UUID,
    ) -> dict | None:
        """Dry-run a rule with a synthetic event; returns trace or None if not found.

        Args:
            rule_id: Rule to test
            tenant_id: Tenant scope
            event_type: Event type to simulate
            payload: Additional data to include in the event metadata
            current_user_id: User running the test (used as event.user_id)

        Returns:
            Trace dict or None if rule not found
        """
        import uuid

        from app.core.automation.engine import AutomationEngine
        from app.core.pubsub.models import Event, EventMetadata

        rule = self.repository.get_rule_by_id(rule_id, tenant_id)
        if not rule:
            return None

        synthetic_event = Event(
            event_type=event_type,
            entity_type=event_type.split(".")[0] if "." in event_type else "unknown",
            entity_id=uuid.uuid4(),
            tenant_id=tenant_id,
            user_id=current_user_id,
            metadata=EventMetadata(
                source="rule_test_runner",
                version="1.0",
                additional_data=payload or {},
            ),
        )

        engine = AutomationEngine(self.db)
        return await engine.test_rule(rule, synthetic_event)
