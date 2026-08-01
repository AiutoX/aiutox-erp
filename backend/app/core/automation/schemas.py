"""Automation module schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TriggerConfig(BaseModel):
    """Trigger configuration.

    `type` is the discriminator the engine and frontend use
    (event/event_trigger, schedule_trigger, manual_trigger, webhook_trigger).
    """

    model_config = ConfigDict(extra="allow")
    type: str | None = Field(None, description="Trigger type discriminator")
    event_type: str | None = Field(None, description="Event type trigger")
    schedule: str | dict[str, Any] | None = Field(
        None, description="Cron schedule for time trigger"
    )
    params: dict[str, Any] | None = None


class ConditionConfig(BaseModel):
    """Condition configuration."""

    model_config = ConfigDict(extra="allow")
    field: str
    operator: str
    value: Any
    negate: bool | None = None
    logical_operator: str | None = None


class ActionConfig(BaseModel):
    """Action configuration.

    The stored/frontend shape uses `type` as the node discriminator; the
    older `action_type`/`target` fields are kept optional for backward
    compatibility with rules created against early schemas.
    """

    model_config = ConfigDict(extra="allow")
    type: str | None = Field(None, description="Action node type discriminator")
    action_type: str | None = None
    target: str | None = None
    params: dict[str, Any] | None = None


class RuleCreate(BaseModel):
    """Create rule request."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    trigger: TriggerConfig
    conditions: list[ConditionConfig] | None = None
    actions: list[ActionConfig]
    enabled: bool = True


class RuleUpdate(BaseModel):
    """Update rule request."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    trigger: TriggerConfig | None = None
    conditions: list[ConditionConfig] | None = None
    actions: list[ActionConfig] | None = None
    enabled: bool | None = None


class RuleVersionResponse(BaseModel):
    """Rule version response."""

    id: UUID
    version: int
    created_at: datetime


class ExecutionResponse(BaseModel):
    """Automation execution response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    rule_id: UUID
    status: str
    result: dict[str, Any] | None = None
    error_message: str | None = None
    executed_at: datetime


class RuleResponse(BaseModel):
    """Rule response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    owner_user_id: UUID | None = None
    name: str
    description: str | None = None
    enabled: bool
    trigger: dict[str, Any]
    conditions: list[dict[str, Any]] | None = None
    actions: list[dict[str, Any]]
    created_at: datetime
    updated_at: datetime


class RuleCloneRequest(BaseModel):
    """Clone request body."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class ExecutionCreate(BaseModel):
    """Manual execution request body (frontend AutomationExecutionCreate)."""

    trigger_data: dict[str, Any] | None = None
    event_type: str = Field("automation.manual", description="Event type to simulate")
    entity_type: str = Field("rule", description="Entity type for the event")
    entity_id: UUID | None = Field(
        None, description="Entity ID; defaults to the rule ID"
    )


class ExecutionResultResponse(BaseModel):
    """Manual execution result."""

    execution_id: UUID
    status: str
    result: dict[str, Any] | list[Any] | None = None


class ValidationErrorItem(BaseModel):
    """A single validation error for the rules/validate endpoint."""

    field: str
    message: str


class OperationResult(BaseModel):
    """Validation outcome (frontend AutomationOperationResult)."""

    success: bool
    errors: list[ValidationErrorItem] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class ExecutionsByDayEntry(BaseModel):
    """Execution count for a single day."""

    date: str
    count: int


class TopRuleEntry(BaseModel):
    """Most-executed rule summary."""

    rule_id: UUID
    rule_name: str
    execution_count: int
    success_rate: float


class AutomationStatsResponse(BaseModel):
    """Tenant automation statistics (frontend AutomationStats)."""

    total_rules: int
    active_rules: int
    total_executions: int
    successful_executions: int
    failed_executions: int
    pending_executions: int
    executions_by_status: dict[str, int]
    executions_by_day: list[ExecutionsByDayEntry]
    top_rules: list[TopRuleEntry]


class NodeCatalogItem(BaseModel):
    """A single entry in the node catalog (trigger, action, or data source)."""

    node_type: str
    label: str
    description: str
    category: str
    permission_required: str | None = None
    available: bool
    config_schema: dict[str, Any]
    icon: str


class ConditionOperatorItem(BaseModel):
    """A single operator entry in the condition-operator catalog.

    The canonical vocabulary — see condition_evaluator.py's
    ConditionEvaluator._evaluate_condition, the single source of truth this
    catalog mirrors (BUG-001: the frontend and installers previously drifted
    from the evaluator's actual accepted operators)."""

    operator: str
    description: str
    value_types: list[str]
    negatable: bool


class RuleTestRequest(BaseModel):
    """Request body for the rule test runner endpoint."""

    event_type: str = Field(
        ..., description="Event type to simulate (e.g. task.created)"
    )
    payload: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional data to include in event metadata",
    )


class ConditionTraceResult(BaseModel):
    """Trace entry for one evaluated condition."""

    condition: dict[str, Any]
    passed: bool


class RuleTestResponse(BaseModel):
    """Response from the rule test runner — full execution trace (dry run)."""

    is_test: bool = True
    conditions_passed: bool
    condition_results: list[ConditionTraceResult]
    action_results: list[dict[str, Any]]
    error: str | None = None


class WebhookFireResponse(BaseModel):
    """Response from a successful webhook fire."""

    execution_id: UUID
    status: str


class WebhookSecretResponse(BaseModel):
    """Returned once when a new webhook secret is generated or rotated."""

    webhook_url: str
    secret: str  # plaintext shown only on generation, never stored
