"""Automation router for rule-based automation management."""

import hashlib
import hmac
import logging
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Header, Path, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth.dependencies import get_user_permissions, require_permission
from app.core.automation.permissions import (
    AUTOMATION_DELETE,
    AUTOMATION_READ,
    AUTOMATION_WRITE,
)
from app.core.automation.schemas import (
    ExecutionResponse,
    NodeCatalogItem,
    RuleCreate,
    RuleListResponse,
    RuleResponse,
    RuleTestRequest,
    RuleTestResponse,
    RuleUpdate,
    WebhookFireResponse,
    WebhookSecretResponse,
)
from app.core.automation.service import AutomationService
from app.core.db.deps import get_db
from app.core.exceptions import APIException
from app.core.users.models import User
from app.schemas.common import StandardResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def get_automation_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
) -> AutomationService:
    """Dependency to get AutomationService."""
    return AutomationService(db)  # type: ignore[arg-type]


def get_public_automation_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AutomationService:
    """No-auth dependency for public webhook endpoint."""
    return AutomationService(db)  # type: ignore[arg-type]


@router.post(
    "/rules",
    response_model=StandardResponse[RuleResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create automation rule",
    tags=["Automation"],
)
async def create_rule(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_WRITE))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    rule_data: RuleCreate,
) -> StandardResponse[RuleResponse]:
    """Create a new automation rule."""
    if not current_user.tenant_id:
        raise APIException(
            code="TENANT_REQUIRED",
            message="User must have a tenant assigned",
            status_code=403,
        )

    rule = service.create_rule(
        tenant_id=current_user.tenant_id,
        name=rule_data.name,
        description=rule_data.description,
        trigger=rule_data.trigger.model_dump(exclude_none=True),
        conditions=(
            [c.model_dump(exclude_none=True) for c in rule_data.conditions]
            if rule_data.conditions
            else None
        ),
        actions=[a.model_dump(exclude_none=True) for a in rule_data.actions],
        enabled=rule_data.enabled,
        owner_user_id=current_user.id,
    )

    return StandardResponse(data=rule)


@router.get(
    "/rules",
    response_model=StandardResponse[RuleListResponse],
    summary="List automation rules",
    tags=["Automation"],
)
async def list_rules(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    enabled_only: bool = Query(False),
) -> StandardResponse[RuleListResponse]:
    """List automation rules for tenant."""
    if not current_user.tenant_id:
        raise APIException(
            code="TENANT_REQUIRED",
            message="User must have a tenant assigned",
            status_code=403,
        )

    rules = service.get_all_rules(
        tenant_id=current_user.tenant_id,
        enabled_only=enabled_only,
        skip=skip,
        limit=limit,
    )
    total = service.count_all_rules(
        tenant_id=current_user.tenant_id,
        enabled_only=enabled_only,
    )

    return StandardResponse(
        data=RuleListResponse(
            items=[RuleResponse.model_validate(r) for r in rules],
            total=total,
            skip=skip,
            limit=limit,
        )
    )


@router.get(
    "/rules/{rule_id}",
    response_model=StandardResponse[RuleResponse],
    summary="Get rule details",
    tags=["Automation"],
)
async def get_rule(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    rule_id: UUID = Path(...),
) -> StandardResponse[RuleResponse]:
    """Get automation rule details."""
    if not current_user.tenant_id:
        raise APIException(
            code="TENANT_REQUIRED",
            message="User must have a tenant assigned",
            status_code=403,
        )

    rule = service.get_rule(rule_id=rule_id, tenant_id=current_user.tenant_id)
    if not rule:
        raise APIException(
            code="RULE_NOT_FOUND", message="Rule not found", status_code=404
        )

    return StandardResponse(data=rule)


@router.put(
    "/rules/{rule_id}",
    response_model=StandardResponse[RuleResponse],
    summary="Update automation rule",
    tags=["Automation"],
)
async def update_rule(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_WRITE))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    rule_id: UUID = Path(...),
    rule_data: RuleUpdate | None = None,
) -> StandardResponse[RuleResponse]:
    """Update an automation rule."""
    if not current_user.tenant_id:
        raise APIException(
            code="TENANT_REQUIRED",
            message="User must have a tenant assigned",
            status_code=403,
        )

    if not rule_data:
        raise APIException(
            code="VALIDATION_ERROR", message="Rule data is required", status_code=400
        )
    rule = service.update_rule(
        rule_id=rule_id,
        tenant_id=current_user.tenant_id,
        name=rule_data.name,
        description=rule_data.description,
        trigger=(
            rule_data.trigger.model_dump(exclude_none=True)
            if rule_data.trigger
            else None
        ),
        conditions=(
            [c.model_dump(exclude_none=True) for c in rule_data.conditions]
            if rule_data.conditions
            else None
        ),
        actions=(
            [a.model_dump(exclude_none=True) for a in rule_data.actions]
            if rule_data.actions
            else None
        ),
        enabled=rule_data.enabled,
    )
    if not rule:
        raise APIException(
            code="RULE_NOT_FOUND", message="Rule not found", status_code=404
        )

    return StandardResponse(data=rule)


@router.delete(
    "/rules/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete automation rule",
    tags=["Automation"],
)
async def delete_rule(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_DELETE))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    rule_id: UUID = Path(...),
) -> None:
    """Delete an automation rule."""
    if not current_user.tenant_id:
        raise APIException(
            code="TENANT_REQUIRED",
            message="User must have a tenant assigned",
            status_code=403,
        )

    success = service.delete_rule(rule_id=rule_id, tenant_id=current_user.tenant_id)
    if not success:
        raise APIException(
            code="RULE_NOT_FOUND", message="Rule not found", status_code=404
        )


@router.post(
    "/rules/{rule_id}/test",
    response_model=StandardResponse[RuleTestResponse],
    summary="Test rule with a synthetic event (dry run)",
    tags=["Automation"],
)
async def test_rule(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_WRITE))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    rule_id: UUID = Path(...),
    body: RuleTestRequest = Body(...),
) -> StandardResponse[RuleTestResponse]:
    """Fire a rule with a synthetic event without persisting any execution record."""
    if not current_user.tenant_id:
        raise APIException(
            code="TENANT_REQUIRED",
            message="User must have a tenant assigned",
            status_code=403,
        )

    trace = await service.test_rule(
        rule_id=rule_id,
        tenant_id=current_user.tenant_id,
        event_type=body.event_type,
        payload=body.payload,
        current_user_id=current_user.id,
    )
    if trace is None:
        raise APIException(
            code="RULE_NOT_FOUND", message="Rule not found", status_code=404
        )

    return StandardResponse(data=RuleTestResponse(**trace))


@router.get(
    "/rules/{rule_id}/executions",
    response_model=StandardResponse[list[ExecutionResponse]],
    summary="Get rule executions",
    tags=["Automation"],
)
async def get_rule_executions(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    rule_id: UUID = Path(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
) -> StandardResponse[list[ExecutionResponse]]:
    """Get execution history for a rule."""
    if not current_user.tenant_id:
        raise APIException(
            code="TENANT_REQUIRED",
            message="User must have a tenant assigned",
            status_code=403,
        )

    executions = service.get_executions(rule_id=rule_id, skip=skip, limit=limit)

    return StandardResponse(
        data=[ExecutionResponse.model_validate(e) for e in executions]
    )


@router.post(
    "/webhooks/{rule_id}",
    response_model=StandardResponse[WebhookFireResponse],
    summary="Fire a webhook-triggered automation rule",
    tags=["Automation"],
)
async def fire_webhook_rule(
    rule_id: UUID,
    request: Request,
    service: Annotated[AutomationService, Depends(get_public_automation_service)],
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
) -> StandardResponse[WebhookFireResponse]:
    """Execute a webhook-triggered rule. No authentication required.
    Verifies X-Webhook-Secret against the stored SHA-256 hash.
    """
    rule = service.repository.get_rule_by_id_only(rule_id)
    if not rule:
        raise APIException(
            code="RULE_NOT_FOUND", message="Rule not found", status_code=404
        )

    trigger = rule.trigger if isinstance(rule.trigger, dict) else {}
    if trigger.get("type") != "webhook_trigger":
        raise APIException(
            code="RULE_NOT_FOUND", message="Rule not found", status_code=404
        )

    stored_hash: str | None = trigger.get("params", {}).get("secret_hash")
    if not x_webhook_secret or not stored_hash:
        raise APIException(
            code="WEBHOOK_INVALID_SECRET",
            message="Invalid or missing webhook secret",
            status_code=403,
        )

    provided_hash = hashlib.sha256(x_webhook_secret.encode()).hexdigest()
    if not hmac.compare_digest(provided_hash, stored_hash):
        try:
            from app.core.redis import get_redis_client

            redis = await get_redis_client()
            fail_key = f"webhook:failed:{rule_id}"
            fail_count = await redis.incr(fail_key)
            await redis.expire(fail_key, 3600)
            if fail_count > 10:
                raise APIException(
                    code="WEBHOOK_RATE_LIMITED",
                    message="Too many failed attempts",
                    status_code=429,
                )
        except APIException:
            raise
        except Exception:
            pass
        raise APIException(
            code="WEBHOOK_INVALID_SECRET",
            message="Invalid webhook secret",
            status_code=403,
        )

    try:
        body: dict = await request.json()
    except Exception:
        body = {}

    execution = await service.fire_webhook_rule(rule=rule, request_body=body)

    return StandardResponse(
        data=WebhookFireResponse(
            execution_id=UUID(str(execution.id)),
            status=str(execution.status),
        )
    )


@router.post(
    "/rules/{rule_id}/webhook-secret",
    response_model=StandardResponse[WebhookSecretResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Generate or rotate webhook secret for a rule",
    tags=["Automation"],
)
async def generate_webhook_secret(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_WRITE))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    rule_id: UUID = Path(...),
) -> StandardResponse[WebhookSecretResponse]:
    """Generate a new webhook secret for a rule. Secret is shown only once."""
    if not current_user.tenant_id:
        raise APIException(
            code="TENANT_REQUIRED",
            message="User must have a tenant assigned",
            status_code=403,
        )

    result = service.rotate_webhook_secret(
        rule_id=rule_id, tenant_id=current_user.tenant_id
    )
    if result is None:
        raise APIException(
            code="RULE_NOT_FOUND", message="Rule not found", status_code=404
        )

    _rule, raw_secret = result
    webhook_url = f"/api/v1/automation/webhooks/{rule_id}"

    return StandardResponse(
        data=WebhookSecretResponse(webhook_url=webhook_url, secret=raw_secret)
    )


# ---------------------------------------------------------------------------
# Node catalog meta endpoints (P2-T04)
# ---------------------------------------------------------------------------

_ACTION_CATALOG: list[dict] = [
    {
        "node_type": "notify",
        "label": "Send Notification",
        "description": "Send a notification via in-app, email, or WhatsApp",
        "category": "actions",
        "permission_required": "automation.write",
        "config_schema": {
            "channels": {
                "type": "array",
                "items": {"type": "string", "enum": ["in-app", "email", "whatsapp"]},
            },
            "message": {
                "type": "string",
                "description": "Message text (supports {{field}} interpolation)",
            },
            "recipient_id": {
                "type": "string",
                "format": "uuid",
                "description": "Leave empty to notify the rule owner",
            },
        },
        "icon": "Bell",
    },
    {
        "node_type": "create_task",
        "label": "Create Task (own)",
        "description": "Create a task assigned to yourself",
        "category": "actions",
        "permission_required": "tasks.write",
        "config_schema": {
            "title": {
                "type": "string",
                "description": "Task title (supports {{field}} interpolation)",
            },
            "description": {"type": "string"},
            "due_in_days": {
                "type": "integer",
                "description": "Due date offset in days from now",
            },
        },
        "icon": "CheckSquare",
    },
    {
        "node_type": "ai_action",
        "label": "AI Capability",
        "description": "Invoke an AI capability as a workflow step (uses tenant AI provider config)",
        "category": "actions",
        "permission_required": "ai.use",
        "config_schema": {
            "qualified_name": {
                "type": "string",
                "description": "Capability to invoke (e.g. tasks.get_my_tasks)",
            },
        },
        "icon": "Braces",
    },
    {
        "node_type": "publish_event",
        "label": "Publish Event",
        "description": "Emit a custom ERP event to trigger other automation rules (rule chaining)",
        "category": "actions",
        "permission_required": "automation.write",
        "config_schema": {
            "event_type": {
                "type": "string",
                "description": "Event type to publish (e.g. automation.my_custom_event)",
            },
            "entity_type": {
                "type": "string",
                "description": "Entity type for the event",
            },
            "payload": {
                "type": "object",
                "description": "Additional data to include in the event payload",
            },
        },
        "icon": "Zap",
    },
    {
        "node_type": "update_entity",
        "label": "Update Entity",
        "description": "Update an existing ERP record (task, lease, work_order) status or fields",
        "category": "actions",
        "permission_required": None,
        "config_schema": {
            "entity_type": {
                "type": "string",
                "enum": ["task", "lease", "work_order"],
                "description": "Entity type to update",
            },
            "entity_id": {
                "type": "string",
                "format": "uuid",
                "description": "Leave empty to use event.entity_id",
            },
            "fields": {
                "type": "object",
                "description": 'Fields to update (e.g. {"status": "completed"})',
            },
        },
        "icon": "RefreshCw",
    },
]


@router.get(
    "/meta/triggers",
    response_model=StandardResponse[list[NodeCatalogItem]],
    summary="Get trigger node catalog",
    tags=["Automation"],
)
async def get_trigger_catalog(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
) -> StandardResponse[list[NodeCatalogItem]]:
    """Return all trigger node types, each marked available based on user permissions."""
    from app.core.event_catalog.loader import EventCatalogLoader

    catalog = EventCatalogLoader()
    event_types = catalog.list_event_types()

    items: list[NodeCatalogItem] = []

    for event_type in sorted(event_types):
        module = event_type.split(".")[0]
        required_perm = f"{module}.read"
        items.append(
            NodeCatalogItem(
                node_type="event_trigger",
                label=event_type,
                description=f"Fires when {event_type} occurs",
                category="triggers",
                permission_required=required_perm,
                available=required_perm in user_permissions,
                config_schema={"event_type": {"type": "string", "const": event_type}},
                icon="Zap",
            )
        )

    static_triggers: list[tuple[str, str, str, str, dict[str, Any]]] = [
        (
            "schedule_trigger",
            "Schedule",
            "Fire on a cron schedule (e.g. every Monday 9am)",
            "Clock",
            {
                "expression": {
                    "type": "string",
                    "description": "5-field cron expression (e.g. 0 9 * * 1)",
                },
                "timezone": {"type": "string", "default": "UTC"},
            },
        ),
        ("manual_trigger", "Manual", "Run manually via the UI", "Play", {}),
        (
            "webhook_trigger",
            "Webhook",
            "Fire when an external HTTP POST is received (HMAC-SHA256 verified)",
            "Webhook",
            {
                "secret_hash": {
                    "type": "string",
                    "description": "SHA-256 hash of the webhook secret (set via /rules/{id}/webhook-secret)",
                    "readOnly": True,
                }
            },
        ),
    ]
    for node_type, label, desc, icon, config_schema in static_triggers:
        items.append(
            NodeCatalogItem(
                node_type=node_type,
                label=label,
                description=desc,
                category="triggers",
                permission_required="automation.write",
                available="automation.write" in user_permissions,
                config_schema=config_schema,
                icon=icon,
            )
        )

    return StandardResponse(data=items)


@router.get(
    "/meta/actions",
    response_model=StandardResponse[list[NodeCatalogItem]],
    summary="Get action node catalog",
    tags=["Automation"],
)
async def get_action_catalog(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
) -> StandardResponse[list[NodeCatalogItem]]:
    """Return all action node types, each marked available based on user permissions."""
    items = [
        NodeCatalogItem(
            **{k: v for k, v in entry.items() if k != "permission_required"},
            permission_required=entry.get("permission_required"),
            available=(
                entry.get("permission_required") is None
                or entry["permission_required"] in user_permissions
            ),
        )
        for entry in _ACTION_CATALOG
    ]
    return StandardResponse(data=items)


@router.get(
    "/meta/data-sources",
    response_model=StandardResponse[list[NodeCatalogItem]],
    summary="Get data source node catalog",
    tags=["Automation"],
)
async def get_data_source_catalog(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
) -> StandardResponse[list[NodeCatalogItem]]:
    """Return data source nodes available to the current user.

    Phase 2: event_payload is always available. erp_query nodes from the AI
    capability registry are returned in Phase 3 once CapabilityResolver exposes
    a per-user filtered list.
    """
    from app.core.automation.ai.capability_registry import capability_registry
    from app.core.automation.ai.capability_resolver import capability_resolver

    items: list[NodeCatalogItem] = [
        NodeCatalogItem(
            node_type="event_payload",
            label="Event Payload",
            description="Access fields from the trigger event (e.g. $.event.entity_id)",
            category="data_sources",
            permission_required=None,
            available=True,
            config_schema={
                "field_path": {
                    "type": "string",
                    "description": "JSONPath into the event payload (e.g. $.entity_id)",
                }
            },
            icon="Braces",
        )
    ]

    # Add erp_query nodes from the capability registry — one per authorized capability
    all_caps = capability_registry.all_active()
    authorized = capability_resolver.filter(
        all_caps, user_permissions, max_candidates=50
    )
    for cap in authorized:
        items.append(
            NodeCatalogItem(
                node_type="erp_query",
                label=cap.capability_name.replace("_", " ").title(),
                description=cap.description,
                category="data_sources",
                permission_required=cap.permission_required,
                available=True,
                config_schema={
                    "qualified_name": {
                        "type": "string",
                        "const": cap.qualified_name,
                    }
                },
                icon="Braces",
            )
        )

    return StandardResponse(data=items)
