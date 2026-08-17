"""AgentExecutor — AI agent that decomposes user goals into validated execution plans."""

import copy
import json
import logging
import re
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.automation.ai.capability_decorator import CapabilityDescriptor
from app.core.automation.ai.capability_registry import CapabilityRegistry
from app.core.automation.ai.capability_resolver import CapabilityResolver
from app.core.automation.ai.models import AIAgentPlanStep, AIAgentRun
from app.core.automation.ai.provider import LLMMessage, LLMProvider
from app.core.exceptions import BusinessRuleError

logger = logging.getLogger(__name__)

MAX_PLAN_RETRIES = 3
_STEP_REF_PATTERN = re.compile(r"^\$\.steps\[(\d+)\]\.result\.([\w.]+)$")

PLANNING_SYSTEM_PROMPT = """\
You are an AI agent planner for an ERP system. Your job is to decompose a user goal \
into a sequence of capability invocations.

You MUST respond with valid JSON only. No markdown, no explanation outside the JSON.

Output format:
{{"steps": [{{"capability": "module.capability_name", "params": {{}}, "reason": "why this step", "requires_confirmation": true|false}}]}}

Rules:
- Only use capabilities from the authorized list below.
- Set requires_confirmation=true for destructive or irreversible operations.
- Each step must reference exactly one capability by its qualified_name.
- params must match the capability's parameter schema.
"""


class AgentPlanError(BusinessRuleError):
    """Raised when plan generation fails after max retries."""

    pass


class AgentExecutor:
    def __init__(
        self,
        *,
        provider: LLMProvider,
        registry: CapabilityRegistry,
        resolver: CapabilityResolver,
        model: str,
        max_tokens: int = 4096,
    ) -> None:
        self._provider = provider
        self._registry = registry
        self._resolver = resolver
        self._model = model
        self._max_tokens = max_tokens

    async def plan(
        self,
        *,
        goal: str,
        user_permissions: set[str],
    ) -> list[dict[str, Any]]:
        """Generate a validated execution plan for the given goal.

        Calls LLM with planning prompt, validates each step against the capability
        registry and RBAC permissions. Retries up to MAX_PLAN_RETRIES on invalid plans.

        Returns list of validated step dicts.
        Raises AgentPlanError after MAX_PLAN_RETRIES failures.
        """
        authorized_caps = self._get_authorized_capabilities(user_permissions)
        constraints: list[str] = []

        for attempt in range(MAX_PLAN_RETRIES):
            prompt = self._build_planning_prompt(goal, authorized_caps, constraints)
            response = await self._provider.complete(
                system=PLANNING_SYSTEM_PROMPT,
                messages=[LLMMessage(role="user", content=prompt)],
                tools=None,
                model=self._model,
                max_tokens=self._max_tokens,
            )

            steps, errors = self._validate_plan(response, user_permissions)
            if not errors:
                return steps

            logger.warning(
                "Plan attempt %d/%d failed: %s",
                attempt + 1,
                MAX_PLAN_RETRIES,
                "; ".join(errors),
            )
            constraints.extend(errors)

        raise AgentPlanError("Unable to generate a valid plan")

    def _get_authorized_capabilities(
        self, user_permissions: set[str]
    ) -> list[CapabilityDescriptor]:
        all_caps = self._registry.all_active()
        return self._resolver.filter(all_caps, user_permissions, max_candidates=100)

    def _build_planning_prompt(
        self,
        goal: str,
        authorized_caps: list[CapabilityDescriptor],
        constraints: list[str],
    ) -> str:
        caps_section = "\n".join(
            f"- {c.qualified_name}: {c.description}" for c in authorized_caps
        )

        parts = [
            f"Authorized capabilities:\n{caps_section}",
            f"\nGoal: {goal}",
        ]

        if constraints:
            parts.append(
                "\nConstraints from previous failed attempts (you MUST avoid these errors):\n"
                + "\n".join(f"- {c}" for c in constraints)
            )

        return "\n".join(parts)

    def _validate_plan(
        self, response: str, user_permissions: set[str]
    ) -> tuple[list[dict[str, Any]], list[str]]:
        """Parse and validate the LLM response. Returns (steps, errors)."""
        errors: list[str] = []

        try:
            data = json.loads(response)
        except json.JSONDecodeError as e:
            return [], [f"Invalid JSON response: {e}"]

        if not isinstance(data, dict) or "steps" not in data:
            return [], ["Response must be a JSON object with a 'steps' array"]

        steps = data["steps"]
        if not isinstance(steps, list) or not steps:
            return [], ["'steps' must be a non-empty array"]

        validated_steps: list[dict[str, Any]] = []
        for i, step in enumerate(steps):
            step_errors = self._validate_step(step, i, user_permissions)
            if step_errors:
                errors.extend(step_errors)
            else:
                validated_steps.append(step)

        if errors:
            return [], errors
        return validated_steps, []

    def _validate_step(
        self, step: dict[str, Any], index: int, user_permissions: set[str]
    ) -> list[str]:
        """Validate a single step. Returns list of errors (empty if valid)."""
        errors: list[str] = []
        cap_name = step.get("capability", "")

        cap = self._registry.by_qualified_name(cap_name)
        if cap is None:
            errors.append(
                f"Step {index}: capability '{cap_name}' does not exist in registry"
            )
            return errors

        authorized = self._resolver.filter([cap], user_permissions, max_candidates=1)
        if not authorized:
            errors.append(
                f"Step {index}: user lacks permission for capability '{cap_name}'"
            )

        return errors

    async def confirm(
        self,
        *,
        agent_run: AIAgentRun,
        plan_steps: list[AIAgentPlanStep],
        user: Any,
        db: Session,
        stream_callback: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        """Confirm the awaiting step and resume execution from current_step."""
        if agent_run.status != "awaiting_confirmation":
            raise BusinessRuleError("Run is not awaiting confirmation")

        sorted_steps = sorted(plan_steps, key=lambda s: s.step_index)

        for step in sorted_steps:
            if step.step_index == agent_run.current_step and step.status == "awaiting":
                step.status = "confirmed"
                step.confirmed_at = datetime.now(UTC)
                break

        agent_run.status = "executing"
        await self.execute_plan(
            agent_run=agent_run,
            plan_steps=plan_steps,
            user=user,
            db=db,
            stream_callback=stream_callback,
        )

    async def reject(
        self,
        *,
        agent_run: AIAgentRun,
        plan_steps: list[AIAgentPlanStep],
        feedback: str,
        user: Any,
        db: Session,
        stream_callback: Callable[[dict[str, Any]], None] | None = None,
    ) -> list[dict[str, Any]] | None:
        """Reject the awaiting step and re-plan with user feedback as constraint."""
        if agent_run.status != "awaiting_confirmation":
            raise BusinessRuleError("Run is not awaiting confirmation")

        plan_meta = agent_run.plan if isinstance(agent_run.plan, dict) else {}
        replan_count = plan_meta.get("replan_count", 0)

        if replan_count >= 2:
            agent_run.status = "failed"
            agent_run.result_summary = "Unable to find an acceptable plan"
            if stream_callback:
                stream_callback(
                    {
                        "event": "agent_failed",
                        "error": agent_run.result_summary,
                    }
                )
            return None

        sorted_steps = sorted(plan_steps, key=lambda s: s.step_index)
        for step in sorted_steps:
            if step.step_index == agent_run.current_step and step.status == "awaiting":
                step.status = "rejected"
                break

        constrained_goal = f"{agent_run.goal}\nConstraint: {feedback}"

        user_permissions: set[str] = set()
        if hasattr(user, "permissions"):
            user_permissions = set(user.permissions)

        new_plan_steps = await self.plan(
            goal=constrained_goal,
            user_permissions=user_permissions,
        )

        plan_meta["replan_count"] = replan_count + 1
        agent_run.plan = plan_meta
        agent_run.status = "executing"

        return new_plan_steps

    async def execute_plan(
        self,
        *,
        agent_run: AIAgentRun,
        plan_steps: list[AIAgentPlanStep],
        user: Any,
        db: Session,
        stream_callback: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        """Execute plan steps sequentially with HITL pausing for operational capabilities."""

        def _emit(event: dict[str, Any]) -> None:
            if stream_callback is not None:
                stream_callback(event)

        sorted_steps = sorted(plan_steps, key=lambda s: s.step_index)
        step_results: list[dict[str, Any]] = []

        for step in sorted_steps:
            if step.status in ("completed", "confirmed"):
                step_results.append({"result": step.result})
                continue

            raw_params: dict[str, Any] = (
                step.params if isinstance(step.params, dict) else {}
            )
            resolved_params = DataChainResolver.resolve(raw_params, step_results)

            cap = self._registry.by_qualified_name(step.capability)
            needs_confirmation = (
                cap is not None and cap.capability_type == "operational"
            ) or step.requires_confirmation

            if needs_confirmation:
                agent_run.status = "awaiting_confirmation"
                agent_run.current_step = step.step_index
                step.status = "awaiting"
                _emit(
                    {
                        "event": "hitl_required",
                        "step_index": step.step_index,
                        "capability": step.capability,
                        "params": resolved_params,
                    }
                )
                return

            try:
                result = await cap.fn(db=db, current_user=user, **resolved_params)  # type: ignore[union-attr]
            except Exception as exc:
                step.status = "failed"
                step.error = str(exc)
                agent_run.status = "failed"
                _emit({"event": "agent_failed", "error": str(exc)})
                return

            step.status = "completed"
            step.result = result
            step.completed_at = datetime.now(UTC)
            step_results.append({"result": result})
            _emit(
                {
                    "event": "step_complete",
                    "step_index": step.step_index,
                    "result": result,
                }
            )

        agent_run.status = "completed"
        agent_run.completed_at = datetime.now(UTC)
        _emit(
            {
                "event": "agent_complete",
                "summary": f"Completed {len(sorted_steps)} steps",
            }
        )


class DataChainResolver:
    """Resolves inter-step data references in agent plan parameters."""

    @staticmethod
    def resolve(
        params: dict[str, Any], step_results: list[dict[str, Any]]
    ) -> dict[str, Any]:
        resolved = copy.deepcopy(params)
        DataChainResolver._resolve_recursive(resolved, step_results)
        return resolved

    @staticmethod
    def _resolve_recursive(obj: Any, step_results: list[dict[str, Any]]) -> None:
        if isinstance(obj, dict):
            for key in obj:
                if isinstance(obj[key], str):
                    obj[key] = DataChainResolver._resolve_value(obj[key], step_results)
                elif isinstance(obj[key], (dict, list)):
                    DataChainResolver._resolve_recursive(obj[key], step_results)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                if isinstance(item, str):
                    obj[i] = DataChainResolver._resolve_value(item, step_results)
                elif isinstance(item, (dict, list)):
                    DataChainResolver._resolve_recursive(item, step_results)

    @staticmethod
    def _resolve_value(value: str, step_results: list[dict[str, Any]]) -> Any:
        match = _STEP_REF_PATTERN.match(value)
        if not match:
            return value

        step_index = int(match.group(1))
        field_path = match.group(2)

        if step_index >= len(step_results):
            logger.warning(
                "DataChainResolver: step index %d out of range (have %d results)",
                step_index,
                len(step_results),
            )
            return None

        result_data = step_results[step_index].get("result")
        if result_data is None:
            logger.warning("DataChainResolver: step %d has no 'result' key", step_index)
            return None

        return DataChainResolver._traverse_path(result_data, field_path, value)

    @staticmethod
    def _traverse_path(data: Any, path: str, original_ref: str) -> Any:
        current = data
        for part in path.split("."):
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                logger.warning(
                    "DataChainResolver: cannot resolve path '%s' in reference '%s'",
                    path,
                    original_ref,
                )
                return None
        return current
