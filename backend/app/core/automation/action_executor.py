"""Action executor for automation rules."""

import logging
from typing import TYPE_CHECKING, Any, ClassVar

from sqlalchemy.orm import Session

from app.core.automation.ai.capability_registry import capability_registry
from app.core.pubsub.models import Event

if TYPE_CHECKING:
    from app.core.pubsub.publisher import EventPublisher

logger = logging.getLogger(__name__)


class ActionExecutor:
    """Executor for rule actions."""

    def __init__(self, db: Session, publisher: "EventPublisher | None" = None):
        """Initialize action executor.

        Args:
            db: Database session
            publisher: EventPublisher for publish_event actions (optional)
        """
        self.db = db
        self.publisher = publisher

    async def execute(
        self, actions: list[dict[str, Any]], event: Event
    ) -> dict[str, Any]:
        """Execute a list of actions.

        Args:
            actions: List of action dictionaries
            event: Triggering event

        Returns:
            Dictionary with execution results
        """
        results = []
        for action in actions:
            try:
                result = await self._execute_action(action, event)
                results.append({"action": action, "result": result, "success": True})
            except Exception as e:
                logger.error(f"Failed to execute action {action}: {e}", exc_info=True)
                results.append(
                    {
                        "action": action,
                        "result": None,
                        "success": False,
                        "error": str(e),
                    }
                )

        return {"actions_executed": len(actions), "results": results}

    async def _execute_action(self, action: dict[str, Any], event: Event) -> Any:
        """Execute a single action.

        Args:
            action: Action dictionary with 'type' and action-specific fields
            event: Triggering event

        Returns:
            Action result

        Raises:
            ValueError: If action type is not supported
        """
        action_type = action.get("type")

        if action_type == "ai_action":
            return await self._execute_ai_action(action, event)
        elif action_type == "publish_event":
            return await self._execute_publish_event_action(action, event)
        elif action_type in ("notification", "notify"):
            return await self._execute_notification_action(action, event)
        elif action_type in ("create_task", "create_own_task"):
            return await self._execute_create_task_action(action, event)
        elif action_type == "create_activity":
            return await self._execute_create_activity_action(action, event)
        elif action_type == "invoke_api":
            return await self._execute_invoke_api_action(action, event)
        elif action_type == "update_entity":
            return await self._execute_update_entity_action(action, event)
        else:
            raise ValueError(f"Unsupported action type: {action_type}")

    async def _execute_publish_event_action(
        self, action: dict[str, Any], event: Event
    ) -> dict[str, Any]:
        """Publish a custom ERP event from a rule action, enabling rule chaining.

        Uses the publisher injected at construction time (from AutomationEngine).
        Falls back gracefully when no publisher is configured.
        The published event inherits tenant_id and user_id from the triggering event.
        """
        params: dict[str, Any] = action.get("params") or {}
        event_type = params.get("event_type")
        if not event_type:
            logger.warning("publish_event action: missing event_type param")
            return {"status": "failed", "reason": "missing_event_type"}

        if self.publisher is None:
            logger.warning("publish_event action: no publisher configured; skipping")
            return {"status": "skipped", "reason": "no_publisher"}

        entity_type: str = params.get("entity_type", "automation")
        payload: dict[str, Any] = params.get("payload") or {}

        try:
            from app.core.pubsub.models import EventMetadata

            publish_metadata = EventMetadata(
                source="automation.publish_event",
                additional_data=payload or {},
            )
            await self.publisher.publish(
                event_type=event_type,
                entity_type=entity_type,
                entity_id=event.entity_id,
                tenant_id=event.tenant_id,
                user_id=event.user_id,
                metadata=publish_metadata,
            )
            return {
                "status": "published",
                "event_type": event_type,
                "entity_type": entity_type,
            }
        except Exception as exc:
            logger.error("publish_event action failed: %s", exc, exc_info=True)
            return {"status": "failed", "error": str(exc)}

    async def _execute_ai_action(
        self, action: dict[str, Any], event: Event
    ) -> dict[str, Any]:
        """Execute an ai_action by invoking a registered @agent_capability by qualified_name.

        The capability is looked up in the in-process registry. The event user is
        resolved to a User ORM object and passed as current_user so the capability
        runs with the correct permission scope.
        """
        from uuid import UUID

        from app.core.users.models import User

        params: dict[str, Any] = action.get("params") or {}
        qualified_name = params.get("qualified_name")
        if not qualified_name:
            logger.warning("ai_action: missing qualified_name param")
            return {"status": "failed", "reason": "missing_qualified_name"}

        descriptor = capability_registry.by_qualified_name(qualified_name)
        if descriptor is None:
            logger.warning(
                "ai_action: capability %r not found in registry", qualified_name
            )
            return {
                "status": "failed",
                "reason": "not_found",
                "qualified_name": qualified_name,
            }

        user_id_raw = params.get("user_id") or event.user_id
        if not user_id_raw:
            if descriptor.capability_type == "automation":
                capability_params = {
                    k: v
                    for k, v in params.items()
                    if k not in ("qualified_name", "user_id")
                }
                capability_params["tenant_id"] = event.tenant_id
                try:
                    result = await descriptor.fn(
                        db=self.db, current_user=None, **capability_params
                    )
                    return {
                        "status": "executed",
                        "qualified_name": qualified_name,
                        "result": result,
                    }
                except Exception as exc:
                    logger.error(
                        "ai_action %r failed: %s", qualified_name, exc, exc_info=True
                    )
                    return {
                        "status": "failed",
                        "error": str(exc),
                        "qualified_name": qualified_name,
                    }
            logger.warning(
                "ai_action: no user_id to resolve for capability %r", qualified_name
            )
            return {"status": "failed", "reason": "no_user"}

        current_user = self.db.get(User, UUID(str(user_id_raw)))  # type: ignore[attr-defined]
        if current_user is None:
            logger.warning("ai_action: user %s not found", user_id_raw)
            return {"status": "failed", "reason": "user_not_found"}

        capability_params = {
            k: v for k, v in params.items() if k not in ("qualified_name", "user_id")
        }
        try:
            result = await descriptor.fn(
                db=self.db, current_user=current_user, **capability_params
            )
            return {
                "status": "executed",
                "qualified_name": qualified_name,
                "result": result,
            }
        except Exception as exc:
            logger.error("ai_action %r failed: %s", qualified_name, exc, exc_info=True)
            return {
                "status": "failed",
                "error": str(exc),
                "qualified_name": qualified_name,
            }

    async def _execute_notification_action(
        self, action: dict[str, Any], event: Event
    ) -> dict[str, Any]:
        from app.core.notifications.service import NotificationService

        channels: list[str] = (
            action.get("channel") or action.get("channels") or ["in-app"]
        )
        if isinstance(channels, str):
            channels = [channels]
        template_name: str = action.get("template") or action.get("params", {}).get(
            "notification_event_type", "automation.rule_fired"
        )
        template_data: dict[str, Any] = {
            "entity_id": str(event.entity_id),
            "entity_type": event.entity_type,
            **(
                event.metadata.additional_data
                if event.metadata and event.metadata.additional_data
                else {}
            ),
            **(action.get("params", {}).get("extra_data") or {}),
        }

        # --- Selector-based send (lease_owner, lease_tenant, etc.) ---
        selector_keys: list[str] = action.get("recipient_selector") or []
        if selector_keys:
            from app.core.notifications.resolver_registry import get_resolver

            contacts = []
            event_data = event.metadata.additional_data or {} if event.metadata else {}
            for key in selector_keys:
                resolver_fn = get_resolver(key)
                if resolver_fn is None:
                    logger.warning(
                        "notify action: no resolver registered for selector %r", key
                    )
                    continue
                try:
                    resolved = await resolver_fn(
                        key, event_data, event.tenant_id, self.db
                    )
                    contacts.extend(resolved)
                except Exception as exc:
                    logger.error(
                        "notify action: resolver %r failed: %s", key, exc, exc_info=True
                    )

            if not contacts:
                logger.warning(
                    "notify action: selector_keys=%r resolved no contacts; skipping",
                    selector_keys,
                )
                return {"status": "skipped", "reason": "no_contacts_resolved"}

            service = NotificationService(self.db)
            all_results: list[dict[str, Any]] = []
            for contact in contacts:
                try:
                    results = await service.send_to_contact(
                        name=contact.name,
                        email=contact.email,
                        phone=contact.phone,
                        event_type=template_name,
                        channels=channels,
                        data=template_data,
                        tenant_id=event.tenant_id,
                    )
                    all_results.extend(results)
                except Exception as exc:
                    logger.error(
                        "notify action: send_to_contact failed for %s: %s",
                        contact.name,
                        exc,
                        exc_info=True,
                    )
                    all_results.append({"status": "failed", "error": str(exc)})

            return {
                "status": "sent",
                "recipients": len(contacts),
                "channels": channels,
                "results": all_results,
            }

        # --- Legacy: user-based send (recipient_id or event.user_id) ---
        from uuid import UUID

        params: dict[str, Any] = action.get("params") or {}
        recipient_id_raw = params.get("recipient_id") or event.user_id
        if not recipient_id_raw:
            logger.warning("notify action: no recipient resolved; skipping")
            return {"status": "skipped", "reason": "no_recipient"}

        recipient_id = UUID(str(recipient_id_raw))
        event_type: str = params.get("notification_event_type", template_name)
        legacy_data: dict[str, Any] = {
            "rule_name": params.get("rule_name", ""),
            "message": params.get("message", ""),
            **template_data,
        }

        try:
            service = NotificationService(self.db)
            await service.send(
                event_type=event_type,
                recipient_id=recipient_id,
                channels=channels,
                data=legacy_data,
                tenant_id=event.tenant_id,
            )
            return {
                "status": "sent",
                "channels": channels,
                "recipient_id": str(recipient_id),
            }
        except Exception as exc:
            logger.error("notify action failed: %s", exc, exc_info=True)
            return {"status": "failed", "error": str(exc)}

    async def _execute_create_activity_action(
        self, action: dict[str, Any], event: Event
    ) -> dict[str, Any]:
        """Execute a create activity action.

        Args:
            action: Action dictionary with 'activity_type', 'description', etc.
            event: Triggering event

        Returns:
            Result dictionary
        """
        # TODO: Integrate with Activities module when implemented
        logger.info(
            f"Create activity action: type={action.get('activity_type')}, "
            f"description={action.get('description')}"
        )
        return {
            "type": "create_activity",
            "status": "queued",
            "message": "Activity will be created when Activities module is implemented",
        }

    async def _execute_create_task_action(
        self, action: dict[str, Any], event: Event
    ) -> dict[str, Any]:
        """Execute a create_task action by calling create_own_task capability.

        The task is always assigned to the rule owner (owner_user_id on the action
        or on the Rule). assignee_id is NEVER sourced from action params — security
        invariant enforced in create_own_task itself.

        Args:
            action: Action dict with 'params' containing title, description, due_date.
                    May also carry 'owner_user_id' set by the rule engine.
            event: Triggering event used to resolve owner when action lacks owner_user_id.

        Returns:
            Result dictionary from create_own_task, or error dict on failure.
        """
        from uuid import UUID

        from app.core.users.models import User
        from app.modules.tasks.ai.capabilities import create_own_task

        owner_id_raw = action.get("owner_user_id") or event.user_id
        if not owner_id_raw:
            logger.warning("create_task action: no owner resolved; skipping")
            return {"status": "skipped", "reason": "no_owner"}

        try:
            owner_id = UUID(str(owner_id_raw))
        except (ValueError, AttributeError) as exc:
            logger.error("create_task action: invalid owner_user_id: %s", exc)
            return {"status": "failed", "error": "invalid_owner_user_id"}

        owner = self.db.get(User, owner_id)  # type: ignore[attr-defined]
        if owner is None:
            logger.warning("create_task action: owner user %s not found", owner_id)
            return {"status": "failed", "reason": "owner_user_not_found"}

        if owner.tenant_id != event.tenant_id:
            logger.error(
                "create_task action: owner tenant %s != event tenant %s — denied",
                owner.tenant_id,
                event.tenant_id,
            )
            return {"status": "failed", "reason": "permission_denied"}

        params: dict[str, Any] = action.get("params") or {}
        try:
            return await create_own_task(
                db=self.db,
                current_user=owner,
                title=params.get("title", "Automated task"),
                description=params.get("description"),
                due_date=params.get("due_date"),
            )
        except Exception as exc:
            logger.error("create_task action failed: %s", exc, exc_info=True)
            return {"status": "failed", "error": str(exc)}

    async def _execute_invoke_api_action(
        self, action: dict[str, Any], event: Event
    ) -> dict[str, Any]:
        """Execute an invoke API action.

        Args:
            action: Action dictionary with 'url', 'method', 'headers', 'body', etc.
            event: Triggering event

        Returns:
            Result dictionary
        """
        # TODO: Implement API invocation
        logger.info(
            f"Invoke API action: url={action.get('url')}, method={action.get('method')}"
        )
        return {
            "type": "invoke_api",
            "status": "not_implemented",
            "message": "API invocation not yet implemented",
        }

    # Status value mappings: spec English names -> real DB enum values
    _TASK_STATUS_MAP: ClassVar[dict[str, str]] = {
        "open": "todo",
        "in_progress": "in_progress",
        "completed": "done",
        "cancelled": "cancelled",
    }
    _LEASE_STATUS_MAP: ClassVar[dict[str, str]] = {
        "active": "activo",
        "expired": "terminado",
        "terminated": "cancelado",
    }
    _WORK_ORDER_STATUS_MAP: ClassVar[dict[str, str]] = {
        "open": "borrador",
        "assigned": "asignada",
        "in_progress": "en_progreso",
        "completed": "completada",
        "cancelled": "cancelada",
    }

    _SUPPORTED_TASK_FIELDS: ClassVar[set[str]] = {"status", "priority"}
    _SUPPORTED_LEASE_FIELDS: ClassVar[set[str]] = {"status"}
    _SUPPORTED_WORK_ORDER_FIELDS: ClassVar[set[str]] = {"status"}

    async def _execute_update_entity_action(
        self, action: dict[str, Any], event: Event
    ) -> dict[str, Any]:
        """Update an ERP entity (task, lease, work_order) via its internal service.

        entity_id is resolved from action.params.entity_id first, falling back to
        event.entity_id. Status names use spec English values mapped to real DB enums.
        """
        from uuid import UUID

        params: dict[str, Any] = action.get("params") or {}
        entity_type: str | None = params.get("entity_type")
        fields: dict[str, Any] = params.get("fields") or {}

        if entity_type not in ("task", "lease", "work_order"):
            return {"status": "failed", "reason": "unsupported_entity_type"}

        entity_id_raw = params.get("entity_id") or event.entity_id
        if not entity_id_raw:
            return {"status": "failed", "reason": "missing_entity_id"}

        try:
            entity_id = UUID(str(entity_id_raw))
        except (ValueError, AttributeError):
            return {"status": "failed", "reason": "invalid_entity_id"}

        if entity_type == "task":
            return await self._update_task_entity(entity_id, fields, event)
        elif entity_type == "lease":
            return await self._update_lease_entity(entity_id, fields, event)
        else:  # work_order
            return await self._update_work_order_entity(entity_id, fields, event)

    async def _update_task_entity(
        self, entity_id: "Any", fields: dict[str, Any], event: Event
    ) -> dict[str, Any]:
        from uuid import UUID

        from app.core.tasks.services.task_service import TaskService

        updates: dict[str, Any] = {}
        for field, value in fields.items():
            if field not in self._SUPPORTED_TASK_FIELDS:
                return {
                    "status": "failed",
                    "reason": "unsupported_field",
                    "field": field,
                }
            if field == "status":
                mapped = self._TASK_STATUS_MAP.get(str(value))
                if mapped is None:
                    return {
                        "status": "failed",
                        "reason": "unsupported_field",
                        "field": field,
                    }
                updates["status"] = mapped
            else:
                updates[field] = value

        try:
            service = TaskService(self.db)
            task = await service.update_task(
                entity_id,
                event.tenant_id,
                UUID(str(event.user_id)) if event.user_id else entity_id,
                **updates,
            )
        except Exception as exc:
            logger.error("update_entity(task) failed: %s", exc, exc_info=True)
            return {"status": "failed", "error": str(exc)}

        if task is None:
            return {"status": "failed", "reason": "entity_not_found"}

        return {
            "status": "updated",
            "entity_type": "task",
            "entity_id": str(entity_id),
            "fields_updated": fields,
        }

    async def _update_lease_entity(
        self, entity_id: "Any", fields: dict[str, Any], event: Event
    ) -> dict[str, Any]:
        from uuid import UUID

        try:
            from app.modules.real_estate.leases.services.lease_service import (
                LeaseService,
            )
        except ImportError:
            return {
                "status": "failed",
                "reason": "module_not_available",
                "module": "leases",
            }

        for field in fields:
            if field not in self._SUPPORTED_LEASE_FIELDS:
                return {
                    "status": "failed",
                    "reason": "unsupported_field",
                    "field": field,
                }

        status_value = fields.get("status")
        if status_value is not None:
            mapped = self._LEASE_STATUS_MAP.get(str(status_value))
            if mapped is None:
                return {
                    "status": "failed",
                    "reason": "unsupported_field",
                    "field": "status",
                }
            try:
                service = LeaseService(self.db)
                lease = service.transition_lease(
                    entity_id,
                    event.tenant_id,
                    mapped,
                    user_id=UUID(str(event.user_id)) if event.user_id else None,
                )
            except Exception as exc:
                logger.error("update_entity(lease) failed: %s", exc, exc_info=True)
                return {"status": "failed", "error": str(exc)}

            if lease is None:
                return {"status": "failed", "reason": "entity_not_found"}

        return {
            "status": "updated",
            "entity_type": "lease",
            "entity_id": str(entity_id),
            "fields_updated": fields,
        }

    async def _update_work_order_entity(
        self, entity_id: "Any", fields: dict[str, Any], event: Event
    ) -> dict[str, Any]:
        from uuid import UUID

        try:
            from app.modules.real_estate.maintenance.services.work_order_service import (
                WorkOrderService,
            )  # noqa: I001
        except ImportError:
            return {
                "status": "failed",
                "reason": "module_not_available",
                "module": "maintenance",
            }

        for field in fields:
            if field not in self._SUPPORTED_WORK_ORDER_FIELDS:
                return {
                    "status": "failed",
                    "reason": "unsupported_field",
                    "field": field,
                }

        status_value = fields.get("status")
        if status_value is not None:
            mapped = self._WORK_ORDER_STATUS_MAP.get(str(status_value))
            if mapped is None:
                return {
                    "status": "failed",
                    "reason": "unsupported_field",
                    "field": "status",
                }
            try:
                from app.modules.real_estate.maintenance.models.maintenance import (
                    WorkOrderStatus,
                )  # noqa: F811, I001

                service = WorkOrderService(self.db)
                wo = service.transition_status(
                    entity_id,
                    event.tenant_id,
                    WorkOrderStatus(mapped),
                    actor_id=UUID(str(event.user_id)) if event.user_id else entity_id,
                )
            except Exception as exc:
                logger.error("update_entity(work_order) failed: %s", exc, exc_info=True)
                return {"status": "failed", "error": str(exc)}

            if wo is None:
                return {"status": "failed", "reason": "entity_not_found"}

        return {
            "status": "updated",
            "entity_type": "work_order",
            "entity_id": str(entity_id),
            "fields_updated": fields,
        }
