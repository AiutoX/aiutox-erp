"""Automation module schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TriggerConfig(BaseModel):
    """Trigger configuration."""

    model_config = ConfigDict(extra="allow")
    event_type: str | None = Field(None, description="Event type trigger")
    schedule: str | None = Field(None, description="Cron schedule for time trigger")


class ConditionConfig(BaseModel):
    """Condition configuration."""

    model_config = ConfigDict(extra="allow")
    field: str
    operator: str
    value: Any


class ActionConfig(BaseModel):
    """Action configuration."""

    model_config = ConfigDict(extra="allow")
    action_type: str
    target: str
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


class RuleListResponse(BaseModel):
    """Rule list response."""

    items: list[RuleResponse]
    total: int
    skip: int
    limit: int


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
