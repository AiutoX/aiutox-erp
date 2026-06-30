from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AgentRunCreate(BaseModel):
    goal: str = Field(..., min_length=1, max_length=2000)
    context: dict[str, Any] | None = None


class AgentRunReject(BaseModel):
    feedback: str = Field(..., min_length=1, max_length=2000)


class AgentRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    status: str
    goal: str
    current_step: int
    result_summary: str | None
    created_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def populate_created_at(cls, data: Any) -> Any:
        if hasattr(data, "started_at"):
            obj = dict(
                id=data.id,
                status=data.status,
                goal=data.goal,
                current_step=data.current_step,
                result_summary=data.result_summary,
                created_at=data.started_at,
                started_at=data.started_at,
                completed_at=data.completed_at,
            )
            return obj
        if isinstance(data, dict) and "created_at" not in data:
            data["created_at"] = data.get("started_at")
        return data


class AgentPlanStepRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    step_index: int
    capability: str
    params: dict[str, Any]
    reason: str | None = None
    requires_confirmation: bool
    status: str
    result: dict[str, Any] | None = None


class AgentRunDetailRead(AgentRunRead):
    plan_steps: list[AgentPlanStepRead] = []
