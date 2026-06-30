"""Cross-module AI capabilities: daily briefing + automation digest."""

import logging
from collections import Counter
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.core.automation.ai.capability_decorator import agent_capability
from app.core.automation.models import (
    AutomationExecution,
    AutomationExecutionStatus,
    Rule,
)
from app.core.users.models import User

logger = logging.getLogger(__name__)


@agent_capability(
    name="get_daily_briefing",
    permission="ai.use",
    description=(
        "Returns a cross-module daily briefing: overdue tasks, expiring leases, "
        "active work orders, and low-stock items — scoped to the current user's tenant "
        "and permissions. Use for: 'daily briefing', 'what needs attention', 'summary'."
    ),
    capability_type="conversational",
    aliases=[
        "resumen del dia",
        "daily briefing",
        "que necesita atencion",
        "what needs attention",
        "resumen diario",
        "dame un resumen",
        "briefing",
    ],
    examples=[
        "dame el resumen del dia",
        "daily briefing",
        "que necesita mi atencion hoy",
        "show me what needs attention",
    ],
    result_format="briefing",
)
def get_daily_briefing(db: Session, current_user: User) -> dict:
    """Fan-out across modules via capability registry; no direct cross-module imports."""
    from app.core.automation.ai.capability_registry import capability_registry

    sections = []

    briefing_capabilities = [
        ("get_overdue_tasks", "Overdue tasks", "/tasks?filter=overdue"),
        ("list_expiring_leases", "Leases expiring soon", "/leases?filter=expiring"),
        (
            "get_sla_breached_orders",
            "SLA breached work orders",
            "/maintenance/work-orders?filter=sla_breached",
        ),
        ("get_low_stock_items", "Low stock items", "/inventory?filter=low_stock"),
    ]

    for cap_name, heading_prefix, view_all_href in briefing_capabilities:
        try:
            descriptor = capability_registry.get(cap_name)
            if descriptor is None or descriptor.fn is None:
                continue
            result = descriptor.fn(db, current_user)
            if result.get("items"):
                sections.append(
                    {
                        "heading": f"{heading_prefix} ({len(result['items'])})",
                        "items": result["items"][:3],
                        "viewAllHref": view_all_href,
                    }
                )
        except Exception:
            logger.debug("Briefing capability %s unavailable", cap_name)

    return {
        "title": "What needs your attention",
        "sections": sections,
    }


def _get_yesterday_executions(
    db: Session, tenant_id: UUID
) -> list[AutomationExecution]:
    now = datetime.now(UTC)
    yesterday_start = (now - timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    yesterday_end = yesterday_start + timedelta(days=1)

    return (
        db.query(AutomationExecution)
        .join(Rule, AutomationExecution.rule_id == Rule.id)
        .filter(
            Rule.tenant_id == tenant_id,
            AutomationExecution.executed_at >= yesterday_start,
            AutomationExecution.executed_at < yesterday_end,
        )
        .options(joinedload(AutomationExecution.rule))
        .all()
    )


@agent_capability(
    name="daily_digest",
    permission="automation.read",
    description="Daily summary of automation rule execution health",
    capability_type="digest",
    aliases=["automation digest", "rule execution summary", "automation health"],
    examples=["show automation digest", "how did my rules perform yesterday"],
    result_format="summary",
)
def get_automation_daily_digest(db: Session, current_user: User) -> dict:
    executions = _get_yesterday_executions(db, current_user.tenant_id)

    yesterday = (datetime.now(UTC) - timedelta(days=1)).date()

    status_counts: Counter[str] = Counter()
    rule_counts: Counter[str] = Counter()
    rule_names: dict[str, str] = {}
    failing_rules: dict[str, str] = {}

    for ex in executions:
        status_counts[str(ex.status)] += 1
        rid = str(ex.rule_id)
        rule_counts[rid] += 1
        if rid not in rule_names:
            rule_names[rid] = ex.rule.name
        if (
            str(ex.status) == AutomationExecutionStatus.FAILED
            and rid not in failing_rules
        ):
            failing_rules[rid] = ex.error_message or "unknown error"

    top_rules = [
        {"rule_id": rid, "rule_name": rule_names[rid], "executions": count}
        for rid, count in rule_counts.most_common(5)
    ]

    failing_list = [
        {"rule_id": rid, "rule_name": rule_names[rid], "error": err}
        for rid, err in failing_rules.items()
    ]

    return {
        "period": "yesterday",
        "date": str(yesterday),
        "executions": {
            "total": len(executions),
            "success": status_counts.get(AutomationExecutionStatus.SUCCESS, 0),
            "failed": status_counts.get(AutomationExecutionStatus.FAILED, 0),
            "permission_denied": status_counts.get(
                AutomationExecutionStatus.PERMISSION_DENIED, 0
            ),
            "skipped": status_counts.get(AutomationExecutionStatus.SKIPPED, 0),
        },
        "top_rules": top_rules,
        "failing_rules": failing_list,
    }
