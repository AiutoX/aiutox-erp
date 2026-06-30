"""Automation engine for executing rules."""

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.automation.action_executor import ActionExecutor
from app.core.automation.condition_evaluator import ConditionEvaluator
from app.core.automation.events import AutomationEventPublisher
from app.core.automation.models import (
    AutomationExecution,
    AutomationExecutionStatus,
    Rule,
)
from app.core.automation.permissions import resolve_owner_permissions
from app.core.pubsub.models import Event
from app.core.pubsub.publisher import EventPublisher
from app.repositories.automation_repository import AutomationRepository

logger = logging.getLogger(__name__)


class AutomationEngine:
    """Engine for executing automation rules."""

    def __init__(self, db: Session, publisher: EventPublisher | None = None):
        """Initialize automation engine.

        Args:
            db: Database session
            publisher: EventPublisher instance for publishing events (optional)
        """
        self.db = db
        self.repository = AutomationRepository(db)
        self.condition_evaluator = ConditionEvaluator()
        self.action_executor = ActionExecutor(db, publisher=publisher)
        self._event_publisher = (
            AutomationEventPublisher(publisher) if publisher else None
        )
        self.publisher = publisher

    async def execute_rule(self, rule: Rule, event: Event) -> AutomationExecution:
        """Execute a rule for a given event.

        Args:
            rule: Rule to execute
            event: Triggering event

        Returns:
            AutomationExecution record
        """
        # Check idempotency: has this rule already processed this event?
        existing_execution = self.repository.get_execution_by_rule_and_event(
            UUID(str(rule.id)), event.event_id
        )
        if existing_execution:
            logger.info(
                f"Event {event.event_id} already processed by rule {rule.id}, skipping"
            )
            return existing_execution

        # Check if rule is enabled
        if not rule.enabled:
            logger.debug(f"Rule {rule.id} is disabled, skipping")
            execution = self.repository.create_execution(
                {
                    "rule_id": rule.id,
                    "event_id": event.event_id,
                    "status": AutomationExecutionStatus.SKIPPED,
                    "result": {"reason": "rule_disabled"},
                }
            )
            return execution

        # Evaluate conditions if any
        if rule.conditions:
            conditions_list = (
                rule.conditions if isinstance(rule.conditions, list) else []
            )
            conditions_met = self.condition_evaluator.evaluate(conditions_list, event)
            if not conditions_met:
                logger.debug(
                    f"Conditions not met for rule {rule.id} with event {event.event_id}"
                )
                execution = self.repository.create_execution(
                    {
                        "rule_id": rule.id,
                        "event_id": event.event_id,
                        "status": AutomationExecutionStatus.SKIPPED,
                        "result": {"reason": "conditions_not_met"},
                    }
                )
                return execution

        # Re-verify owner permissions before executing any action (DEC-017)
        if rule.owner_user_id:
            owner_perms = resolve_owner_permissions(
                self.db, UUID(str(rule.owner_user_id))
            )
            required_perms = self._collect_required_permissions(rule)
            missing = required_perms - owner_perms
            if missing:
                logger.warning(
                    "Rule %s: permission_denied — owner %s missing: %s",
                    rule.id,
                    rule.owner_user_id,
                    missing,
                )
                return self.repository.create_execution(
                    {
                        "rule_id": rule.id,
                        "event_id": event.event_id,
                        "status": AutomationExecutionStatus.PERMISSION_DENIED,
                        "result": {"missing_permissions": sorted(missing)},
                        "error_message": f"Owner lost permissions: {sorted(missing)}",
                    }
                )

        # Execute actions
        try:
            actions_list = rule.actions if isinstance(rule.actions, list) else []
            result = await self.action_executor.execute(actions_list, event)
            execution = self.repository.create_execution(
                {
                    "rule_id": rule.id,
                    "event_id": event.event_id,
                    "status": AutomationExecutionStatus.SUCCESS,
                    "result": result,
                }
            )

            if self._event_publisher:
                try:
                    self._event_publisher.publish_automation_executed(
                        rule_id=rule.id,  # type: ignore[arg-type]
                        execution_id=execution.id,  # type: ignore[arg-type]
                        tenant_id=event.tenant_id,
                        status=AutomationExecutionStatus.SUCCESS,
                        result=result,
                    )
                except Exception as pub_err:
                    logger.warning(
                        "Failed to publish automation.executed event: %s", pub_err
                    )

            logger.info(
                f"Successfully executed rule {rule.id} for event {event.event_id}"
            )
            return execution
        except Exception as e:
            logger.error(
                f"Failed to execute rule {rule.id} for event {event.event_id}: {e}",
                exc_info=True,
            )
            execution = self.repository.create_execution(
                {
                    "rule_id": rule.id,
                    "event_id": event.event_id,
                    "status": AutomationExecutionStatus.FAILED,
                    "error_message": str(e),
                    "result": None,
                }
            )

            if self._event_publisher:
                try:
                    self._event_publisher.publish_automation_failed(
                        rule_id=rule.id,  # type: ignore[arg-type]
                        execution_id=execution.id,  # type: ignore[arg-type]
                        tenant_id=event.tenant_id,
                        error_message=str(e),
                    )
                except Exception as pub_err:
                    logger.warning(
                        "Failed to publish automation.failed event: %s", pub_err
                    )

            return execution

    def _collect_required_permissions(self, rule: Rule) -> set[str]:
        """Return the set of permissions required to execute all of this rule's actions."""
        required: set[str] = set()
        for action in rule.actions or []:
            if not isinstance(action, dict):
                continue
            action_type = action.get("type") or action.get("action_type")
            if action_type in ("create_task", "create_own_task"):
                required.add("tasks.write")
            elif action_type in ("notification", "notify", "publish_event"):
                required.add("automation.write")
            elif action_type == "ai_action":
                required.add("ai.use")
            elif action_type == "update_entity":
                entity_type = action.get("params", {}).get("entity_type")
                if entity_type:
                    required.add(f"{entity_type}.write")
        return required

    async def test_rule(self, rule: Rule, event: Event) -> dict:
        """Execute a rule as a dry run and return an execution trace.

        Does NOT persist any execution record. Safe to call at any time.

        Args:
            rule: Rule to test
            event: Synthetic event to fire against the rule

        Returns:
            Trace dict with condition_results, action_results, conditions_passed, is_test
        """
        trace: dict = {
            "is_test": True,
            "conditions_passed": False,
            "condition_results": [],
            "action_results": [],
        }

        conditions_list = rule.conditions if isinstance(rule.conditions, list) else []
        for condition in conditions_list:
            passed = self.condition_evaluator._evaluate_condition(condition, event)
            trace["condition_results"].append(
                {
                    "condition": condition,
                    "passed": passed,
                }
            )

        all_passed = (
            all(r["passed"] for r in trace["condition_results"])
            if trace["condition_results"]
            else True
        )
        trace["conditions_passed"] = all_passed

        if not all_passed:
            return trace

        actions_list = rule.actions if isinstance(rule.actions, list) else []
        try:
            result = await self.action_executor.execute(actions_list, event)
            trace["action_results"] = result.get("results", [])
        except Exception as exc:
            logger.error("test_rule action execution failed: %s", exc, exc_info=True)
            trace["error"] = str(exc)

        return trace

    async def process_event(self, event: Event) -> list[AutomationExecution]:
        """Process an event by executing all matching rules.

        Args:
            event: Event to process

        Returns:
            List of execution records
        """
        # Get all enabled rules for the tenant
        rules = self.repository.get_all_rules(
            tenant_id=event.tenant_id, enabled_only=True
        )

        executions = []
        for rule in rules:
            # Check if rule matches event type
            trigger = rule.trigger
            trigger_dict = trigger if isinstance(trigger, dict) else {}
            if trigger_dict.get("type") == "event":
                event_type = trigger_dict.get("event_type")
                if event_type and event.event_type == event_type:
                    execution = await self.execute_rule(rule, event)
                    executions.append(execution)

        return executions
