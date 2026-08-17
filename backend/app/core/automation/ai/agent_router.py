"""Agent Run REST endpoints for AI agent lifecycle (P5-API01)."""

import logging
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_user_permissions, require_permission
from app.core.automation.ai.agent_schemas import (
    AgentPlanStepRead,
    AgentRunCreate,
    AgentRunDetailRead,
    AgentRunRead,
    AgentRunReject,
)
from app.core.automation.ai.models import AIAgentPlanStep, AIAgentRun
from app.core.automation.permissions import AUTOMATION_READ, AUTOMATION_WRITE
from app.core.db.deps import get_db
from app.core.exceptions import APIException
from app.core.users.models import User
from app.schemas.common import StandardListResponse, StandardResponse

router = APIRouter(prefix="/agent-runs", tags=["ai-agents"])
logger = logging.getLogger(__name__)

TERMINAL_STATUSES = frozenset({"completed", "cancelled", "failed"})


def _get_run_or_404(db: Session, run_id: UUID, tenant_id: UUID) -> AIAgentRun:
    run = (
        db.query(AIAgentRun)
        .filter(AIAgentRun.id == run_id, AIAgentRun.tenant_id == tenant_id)
        .first()
    )
    if run is None:
        raise APIException(
            code="AGENT_RUN_NOT_FOUND",
            message="Agent run not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return run


def _build_executor(db: Session, tenant_id: UUID):
    from app.core.automation.ai.capability_registry import capability_registry
    from app.core.automation.ai.capability_resolver import capability_resolver
    from app.core.automation.ai.conversation_engine import _build_provider
    from app.core.automation.ai.repository import AIRepository

    repo = AIRepository(db)
    config = repo.get_active_provider_config(tenant_id=tenant_id)
    if config is None:
        raise APIException(
            code="AI_PROVIDER_NOT_CONFIGURED",
            message="No LLM provider configured for this tenant",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    from app.core.automation.ai.agent_executor import AgentExecutor

    provider = _build_provider(config)
    return AgentExecutor(
        provider=provider,
        registry=capability_registry,
        resolver=capability_resolver,
        model=config.model_conversation,
    )


async def _run_agent_plan(
    run_id: UUID,
    tenant_id: UUID,
    user_permissions: set[str],
) -> None:
    from app.core.db.deps import SessionLocal

    db = SessionLocal()
    try:
        run = (
            db.query(AIAgentRun)
            .filter(AIAgentRun.id == run_id, AIAgentRun.tenant_id == tenant_id)
            .first()
        )
        if run is None or run.status in TERMINAL_STATUSES:
            return

        executor = _build_executor(db, tenant_id)
        plan_steps_raw = await executor.plan(
            goal=run.goal,
            user_permissions=user_permissions,
        )

        db_steps: list[AIAgentPlanStep] = []
        for i, step_data in enumerate(plan_steps_raw):
            db_step = AIAgentPlanStep(
                agent_run_id=run.id,
                step_index=i,
                capability=step_data["capability"],
                params=step_data.get("params", {}),
                requires_confirmation=step_data.get("requires_confirmation", False),
                status="pending",
            )
            db.add(db_step)
            db_steps.append(db_step)

        run.plan = {"steps_count": len(plan_steps_raw), "replan_count": 0}
        run.status = "executing"
        db.commit()

        user_obj = db.query(User).filter(User.id == run.user_id).first()
        await executor.execute_plan(
            agent_run=run,
            plan_steps=db_steps,
            user=user_obj,
            db=db,
        )
        db.commit()
    except Exception:
        logger.exception("Background agent run %s failed", run_id)
        if run is not None:
            run.status = "failed"
            run.result_summary = "Background execution failed"
            db.commit()
    finally:
        db.close()


@router.post(
    "",
    response_model=StandardResponse[AgentRunRead],
    status_code=status.HTTP_201_CREATED,
    summary="Start a new agent run",
)
async def start_agent_run(
    body: AgentRunCreate,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_WRITE))],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    db: Annotated[Session, Depends(get_db)],
):
    from datetime import UTC, datetime

    run = AIAgentRun(
        id=uuid4(),
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        goal=body.goal,
        plan=body.context or {},
        status="planning",
        current_step=0,
        started_at=datetime.now(UTC),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    background_tasks.add_task(
        _run_agent_plan,
        run_id=UUID(str(run.id)),
        tenant_id=current_user.tenant_id,
        user_permissions=user_permissions,
    )

    return StandardResponse(data=AgentRunRead.model_validate(run))


@router.post(
    "/{run_id}/confirm",
    response_model=StandardResponse[AgentRunRead],
    summary="Confirm HITL step",
)
async def confirm_step(
    run_id: UUID,
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_WRITE))],
    db: Annotated[Session, Depends(get_db)],
):
    run = _get_run_or_404(db, run_id, current_user.tenant_id)

    if run.status != "awaiting_confirmation":
        raise APIException(
            code="AGENT_RUN_NOT_AWAITING",
            message="Agent run is not awaiting confirmation",
            status_code=status.HTTP_409_CONFLICT,
        )

    executor = _build_executor(db, current_user.tenant_id)
    steps = (
        db.query(AIAgentPlanStep)
        .filter(AIAgentPlanStep.agent_run_id == run.id)
        .order_by(AIAgentPlanStep.step_index)
        .all()
    )

    await executor.confirm(
        agent_run=run,
        plan_steps=steps,
        user=current_user,
        db=db,
    )
    db.commit()

    return StandardResponse(data=AgentRunRead.model_validate(run))


@router.post(
    "/{run_id}/reject",
    response_model=StandardResponse[AgentRunRead],
    summary="Reject HITL step",
)
async def reject_step(
    run_id: UUID,
    body: AgentRunReject,
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_WRITE))],
    db: Annotated[Session, Depends(get_db)],
):
    run = _get_run_or_404(db, run_id, current_user.tenant_id)

    if run.status != "awaiting_confirmation":
        raise APIException(
            code="AGENT_RUN_NOT_AWAITING",
            message="Agent run is not awaiting confirmation",
            status_code=status.HTTP_409_CONFLICT,
        )

    executor = _build_executor(db, current_user.tenant_id)
    steps = (
        db.query(AIAgentPlanStep)
        .filter(AIAgentPlanStep.agent_run_id == run.id)
        .order_by(AIAgentPlanStep.step_index)
        .all()
    )

    new_steps = await executor.reject(
        agent_run=run,
        plan_steps=steps,
        feedback=body.feedback,
        user=current_user,
        db=db,
    )

    if new_steps is not None:
        db.query(AIAgentPlanStep).filter(
            AIAgentPlanStep.agent_run_id == run.id,
            AIAgentPlanStep.status.in_(["pending", "rejected"]),
        ).delete(synchronize_session="fetch")

        for i, step_data in enumerate(new_steps):
            db_step = AIAgentPlanStep(
                agent_run_id=run.id,
                step_index=run.current_step + i,
                capability=step_data["capability"],
                params=step_data.get("params", {}),
                requires_confirmation=step_data.get("requires_confirmation", False),
                status="pending",
            )
            db.add(db_step)

    db.commit()
    return StandardResponse(data=AgentRunRead.model_validate(run))


@router.get(
    "",
    response_model=StandardListResponse[AgentRunRead],
    summary="List agent runs for current tenant",
)
async def list_agent_runs(
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
    db: Annotated[Session, Depends(get_db)],
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    query = db.query(AIAgentRun).filter(AIAgentRun.tenant_id == current_user.tenant_id)

    if status_filter:
        query = query.filter(AIAgentRun.status == status_filter)

    total = query.count()
    runs = (
        query.order_by(AIAgentRun.started_at.desc()).offset(offset).limit(limit).all()
    )

    page = (offset // limit) + 1 if limit else 1
    total_pages = (total + limit - 1) // limit if limit else 1

    return StandardListResponse(
        data=[AgentRunRead.model_validate(r) for r in runs],
        meta={
            "total": total,
            "page": page,
            "page_size": limit,
            "total_pages": total_pages,
        },
    )


@router.get(
    "/{run_id}",
    response_model=StandardResponse[AgentRunDetailRead],
    summary="Get agent run detail with plan steps",
)
async def get_agent_run(
    run_id: UUID,
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_READ))],
    db: Annotated[Session, Depends(get_db)],
):
    run = _get_run_or_404(db, run_id, current_user.tenant_id)

    steps = (
        db.query(AIAgentPlanStep)
        .filter(AIAgentPlanStep.agent_run_id == run.id)
        .order_by(AIAgentPlanStep.step_index)
        .all()
    )

    run_data = AgentRunRead.model_validate(run).model_dump()
    run_data["plan_steps"] = [AgentPlanStepRead.model_validate(s) for s in steps]

    return StandardResponse(data=AgentRunDetailRead(**run_data))


@router.delete(
    "/{run_id}",
    response_model=StandardResponse[AgentRunRead],
    summary="Cancel an agent run",
)
async def cancel_agent_run(
    run_id: UUID,
    current_user: Annotated[User, Depends(require_permission(AUTOMATION_WRITE))],
    db: Annotated[Session, Depends(get_db)],
):
    run = _get_run_or_404(db, run_id, current_user.tenant_id)

    if run.status in TERMINAL_STATUSES:
        raise APIException(
            code="AGENT_RUN_ALREADY_TERMINAL",
            message=f"Agent run is already in terminal status: {run.status}",
            status_code=status.HTTP_409_CONFLICT,
        )

    run.status = "cancelled"
    db.commit()

    return StandardResponse(data=AgentRunRead.model_validate(run))
