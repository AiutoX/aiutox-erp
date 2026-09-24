"""Automation router for rule-based automation management."""

import hashlib
import hmac
import logging
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Header, Path, Query, Request, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_user_permissions, require_permission
from app.core.automation.engine import AutomationEngine
from app.core.automation.permissions import (
    AUTOMATION_ADMIN,
    AUTOMATION_DELETE,
    AUTOMATION_READ,
    AUTOMATION_WRITE,
)
from app.core.automation.schemas import (
    AutomationStatsResponse,
    ConditionOperatorItem,
    ExecutionCreate,
    ExecutionResponse,
    ExecutionResultResponse,
    NodeCatalogItem,
    OperationResult,
    RuleCloneRequest,
    RuleCreate,
    RuleResponse,
    RuleTestRequest,
    RuleTestResponse,
    RuleUpdate,
    WebhookFireResponse,
    WebhookSecretResponse,
)
from app.core.automation.service import AutomationService
from app.core.config_file import get_settings
from app.core.db.deps import get_db
from app.core.exceptions import APIException
from app.core.pubsub.client import RedisStreamsClient
from app.core.pubsub.models import Event, EventMetadata
from app.core.pubsub.publisher import EventPublisher
from app.core.users.models import User
from app.schemas.common import StandardListResponse, StandardResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def get_event_publisher() -> EventPublisher:
    """Dependency to get EventPublisher (same wiring the legacy router used).

    Constructing the service WITHOUT this publisher silently disables
    automation.created/updated/deleted event publishing (BUG-002, decision D3).
    """
    settings = get_settings()
    client = RedisStreamsClient(
        redis_url=settings.REDIS_URL, password=settings.REDIS_PASSWORD
    )
    return EventPublisher(client)


def get_automation_service(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
    publisher: Annotated[EventPublisher, Depends(get_event_publisher)],
) -> AutomationService:
    """Dependency to get AutomationService."""
    return AutomationService(db, publisher=publisher)


def get_public_automation_service(
    db: Annotated[Session, Depends(get_db)],
) -> AutomationService:
    """No-auth dependency for public webhook endpoint."""
    return AutomationService(db)


def get_automation_engine(
    db: Annotated[Session, Depends(get_db)],
    publisher: Annotated[EventPublisher, Depends(get_event_publisher)],
) -> AutomationEngine:
    """Dependency to get AutomationEngine for manual execution."""
    return AutomationEngine(db, publisher=publisher)


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
    response_model=StandardListResponse[RuleResponse],
    summary="List automation rules",
    tags=["Automation"],
)
async def list_rules(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Page size"),
    enabled_only: bool = Query(default=False, description="Only enabled rules"),
    is_active: bool | None = Query(
        default=None, description="Filter by enabled state (frontend contract)"
    ),
) -> StandardListResponse[RuleResponse]:
    """List automation rules for tenant (legacy frontend list contract)."""
    if not current_user.tenant_id:
        raise APIException(
            code="TENANT_REQUIRED",
            message="User must have a tenant assigned",
            status_code=403,
        )

    skip = (page - 1) * page_size
    rules = service.get_all_rules(
        tenant_id=current_user.tenant_id,
        enabled_only=enabled_only,
        skip=skip,
        limit=page_size,
        enabled=is_active,
    )
    total = service.count_all_rules(
        tenant_id=current_user.tenant_id,
        enabled_only=enabled_only,
        enabled=is_active,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return StandardListResponse(
        data=[RuleResponse.model_validate(r) for r in rules],
        meta={
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
        message="Rules retrieved successfully",
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
    response_model=StandardListResponse[ExecutionResponse],
    summary="Get rule executions",
    tags=["Automation"],
)
async def get_rule_executions(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    rule_id: UUID = Path(...),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Page size"),
) -> StandardListResponse[ExecutionResponse]:
    """Get execution history for a rule (legacy frontend list contract)."""
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

    skip = (page - 1) * page_size
    executions = service.get_executions(rule_id=rule_id, skip=skip, limit=page_size)
    total = service.count_executions(rule_id)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return StandardListResponse(
        data=[ExecutionResponse.model_validate(e) for e in executions],
        meta={
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
        message="Executions retrieved successfully",
    )


@router.post(
    "/rules/{rule_id}/execute",
    response_model=StandardResponse[ExecutionResultResponse],
    summary="Execute automation rule manually",
    tags=["Automation"],
)
async def execute_rule(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_ADMIN))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    engine: Annotated[AutomationEngine, Depends(get_automation_engine)],
    rule_id: UUID = Path(...),
    body: ExecutionCreate | None = Body(default=None),
) -> StandardResponse[ExecutionResultResponse]:
    """Execute a rule manually with a synthetic event; persists the execution.

    Distinct from POST /rules/{id}/test, which is a dry run that persists
    nothing (BUG-002, decision D2).
    """
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

    payload = body or ExecutionCreate()
    additional_data: dict[str, Any] = {"manual_execution": True}
    if payload.trigger_data:
        additional_data.update(payload.trigger_data)

    try:
        manual_event = Event(
            event_type=payload.event_type,
            entity_type=payload.entity_type,
            entity_id=payload.entity_id or rule_id,
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            metadata=EventMetadata(
                source="automation_service",
                version="1.0",
                additional_data=additional_data,
            ),
        )
    except ValidationError as exc:
        raise APIException(
            code="INVALID_EVENT_TYPE",
            message=(
                "event_type must match pattern '<module>.<action>' "
                "(lowercase, underscores)"
            ),
            status_code=400,
        ) from exc

    execution = await engine.execute_rule(rule, manual_event)

    return StandardResponse(
        data=ExecutionResultResponse(
            execution_id=UUID(str(execution.id)),
            status=str(execution.status),
            result=execution.result,
        ),
        message="Rule executed successfully",
    )


@router.post(
    "/rules/{rule_id}/enable",
    response_model=StandardResponse[RuleResponse],
    summary="Enable an automation rule",
    tags=["Automation"],
)
async def enable_rule(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_WRITE))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    rule_id: UUID = Path(...),
) -> StandardResponse[RuleResponse]:
    """Set enabled=true on a rule."""
    if not current_user.tenant_id:
        raise APIException(
            code="TENANT_REQUIRED",
            message="User must have a tenant assigned",
            status_code=403,
        )

    rule = service.update_rule(
        rule_id=rule_id, tenant_id=current_user.tenant_id, enabled=True
    )
    if not rule:
        raise APIException(
            code="RULE_NOT_FOUND", message="Rule not found", status_code=404
        )
    return StandardResponse(data=RuleResponse.model_validate(rule))


@router.post(
    "/rules/{rule_id}/disable",
    response_model=StandardResponse[RuleResponse],
    summary="Disable an automation rule",
    tags=["Automation"],
)
async def disable_rule(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_WRITE))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    rule_id: UUID = Path(...),
) -> StandardResponse[RuleResponse]:
    """Set enabled=false on a rule. Triggers check enabled at fire time."""
    if not current_user.tenant_id:
        raise APIException(
            code="TENANT_REQUIRED",
            message="User must have a tenant assigned",
            status_code=403,
        )

    rule = service.update_rule(
        rule_id=rule_id, tenant_id=current_user.tenant_id, enabled=False
    )
    if not rule:
        raise APIException(
            code="RULE_NOT_FOUND", message="Rule not found", status_code=404
        )
    return StandardResponse(data=RuleResponse.model_validate(rule))


@router.post(
    "/rules/{rule_id}/clone",
    response_model=StandardResponse[RuleResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Clone an automation rule",
    tags=["Automation"],
)
async def clone_rule(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_WRITE))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    rule_id: UUID = Path(...),
    body: RuleCloneRequest = Body(...),
) -> StandardResponse[RuleResponse]:
    """Clone a rule as a disabled copy without its webhook secret."""
    if not current_user.tenant_id:
        raise APIException(
            code="TENANT_REQUIRED",
            message="User must have a tenant assigned",
            status_code=403,
        )

    rule = service.clone_rule(
        rule_id=rule_id,
        tenant_id=current_user.tenant_id,
        name=body.name,
        description=body.description,
        owner_user_id=current_user.id,
    )
    if not rule:
        raise APIException(
            code="RULE_NOT_FOUND", message="Rule not found", status_code=404
        )
    return StandardResponse(
        data=RuleResponse.model_validate(rule), message="Rule cloned successfully"
    )


@router.post(
    "/rules/validate",
    response_model=StandardResponse[OperationResult],
    summary="Validate a rule configuration without persisting it",
    tags=["Automation"],
)
async def validate_rule(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_WRITE))],
    payload: dict[str, Any] = Body(...),
) -> StandardResponse[OperationResult]:
    """Validate rule shape, condition operators, and action node types."""
    from pydantic import ValidationError

    from app.core.automation.schemas import ValidationErrorItem

    errors: list[ValidationErrorItem] = []
    warnings: list[str] = []

    try:
        rule = RuleCreate.model_validate(payload)
    except ValidationError as exc:
        for err in exc.errors():
            errors.append(
                ValidationErrorItem(
                    field=".".join(str(part) for part in err["loc"]),
                    message=err["msg"],
                )
            )
        return StandardResponse(data=OperationResult(success=False, errors=errors))

    valid_operators = {entry["operator"] for entry in _CONDITION_OPERATOR_CATALOG}
    for index, condition in enumerate(rule.conditions or []):
        if condition.operator not in valid_operators:
            errors.append(
                ValidationErrorItem(
                    field=f"conditions.{index}.operator",
                    message=f"Unknown operator '{condition.operator}'",
                )
            )

    known_actions = {entry["node_type"] for entry in _ACTION_CATALOG}
    for index, action in enumerate(rule.actions):
        node_type = action.type or action.action_type
        if not node_type:
            errors.append(
                ValidationErrorItem(
                    field=f"actions.{index}.type",
                    message="Action type is required",
                )
            )
        elif node_type not in known_actions:
            warnings.append(
                f"Action type '{node_type}' is not in the current action catalog"
            )

    return StandardResponse(
        data=OperationResult(success=not errors, errors=errors, warnings=warnings)
    )


@router.get(
    "/stats",
    response_model=StandardResponse[AutomationStatsResponse],
    summary="Get tenant automation statistics",
    tags=["Automation"],
)
async def get_automation_stats(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
) -> StandardResponse[AutomationStatsResponse]:
    """Aggregate rule and execution statistics for the tenant."""
    if not current_user.tenant_id:
        raise APIException(
            code="TENANT_REQUIRED",
            message="User must have a tenant assigned",
            status_code=403,
        )

    stats = service.get_stats(tenant_id=current_user.tenant_id)
    return StandardResponse(data=AutomationStatsResponse(**stats))


@router.get(
    "/executions/{execution_id}",
    response_model=StandardResponse[ExecutionResponse],
    summary="Get a single execution",
    tags=["Automation"],
)
async def get_execution_detail(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
    service: Annotated[AutomationService, Depends(get_automation_service)],
    execution_id: UUID = Path(...),
) -> StandardResponse[ExecutionResponse]:
    """Get one execution by ID, tenant-scoped through its rule."""
    if not current_user.tenant_id:
        raise APIException(
            code="TENANT_REQUIRED",
            message="User must have a tenant assigned",
            status_code=403,
        )

    execution = service.get_execution(
        execution_id=execution_id, tenant_id=current_user.tenant_id
    )
    if not execution:
        raise APIException(
            code="EXECUTION_NOT_FOUND",
            message="Execution not found",
            status_code=404,
        )
    return StandardResponse(data=ExecutionResponse.model_validate(execution))


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
        "permission_required": "automation.edit",
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
        "permission_required": "automation.edit",
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
                permission_required="automation.edit",
                available="automation.edit" in user_permissions,
                config_schema=config_schema,
                icon=icon,
            )
        )

    return StandardResponse(data=items)


# Canonical operator vocabulary — must match condition_evaluator.py's
# ConditionEvaluator._evaluate_condition exactly (BUG-001: this catalog is
# the single source of truth the frontend now reads from, instead of
# maintaining its own separate hardcoded list that can drift).
_CONDITION_OPERATOR_CATALOG: list[dict] = [
    {
        "operator": "==",
        "description": "Equals",
        "value_types": ["string", "number", "boolean"],
    },
    {
        "operator": "!=",
        "description": "Not equals",
        "value_types": ["string", "number", "boolean"],
    },
    {
        "operator": ">",
        "description": "Greater than",
        "value_types": ["number"],
    },
    {
        "operator": "<",
        "description": "Less than",
        "value_types": ["number"],
    },
    {
        "operator": ">=",
        "description": "Greater than or equal",
        "value_types": ["number"],
    },
    {
        "operator": "<=",
        "description": "Less than or equal",
        "value_types": ["number"],
    },
    {
        "operator": "in",
        "description": "Value is in a list",
        "value_types": ["array"],
    },
    {
        "operator": "contains",
        "description": "String or list contains value",
        "value_types": ["string", "array"],
    },
]


@router.get(
    "/condition-operators",
    response_model=StandardResponse[list[ConditionOperatorItem]],
    summary="Get condition operator catalog",
    tags=["Automation"],
)
async def get_condition_operators(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
) -> StandardResponse[list[ConditionOperatorItem]]:
    """Return the canonical operator vocabulary for condition builders.

    Every operator here is negatable via the condition's "negate": true
    flag (e.g. "in" + negate=True means "not in") — see
    condition_evaluator.py, which is the actual source of truth this
    catalog mirrors.
    """
    items = [
        ConditionOperatorItem(**entry, negatable=True)
        for entry in _CONDITION_OPERATOR_CATALOG
    ]
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
