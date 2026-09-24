"""WorkItem event subscribers — upsert/complete work items from domain events."""

from __future__ import annotations

import logging
import uuid

from app.core.db.session import SessionLocal
from app.core.pubsub.models import Event
from app.core.work_items.service import WorkItemService

logger = logging.getLogger(__name__)

_PRIORITY_MAP = {
    "critical": "critical",
    "high": "high",
    "media": "medium",
    "medium": "medium",
    "baja": "low",
    "low": "low",
}


def _map_priority(raw: str | None) -> str:
    if not raw:
        return "medium"
    return _PRIORITY_MAP.get(raw.lower(), "medium")


# ─── tasks subscriber ────────────────────────────────────────────────────────


async def on_task_event(event: Event) -> None:
    """Handle task.created / task.updated / task.completed events."""
    meta = event.metadata.additional_data
    assignee_raw = meta.get("assignee_id")
    if not assignee_raw and event.event_type != "task.completed":
        logger.debug("on_task_event: no assignee_id, skipping")
        return

    with SessionLocal() as db:
        svc = WorkItemService(db)

        if event.event_type == "task.completed":
            try:
                svc.complete(item_id=event.entity_id, tenant_id=event.tenant_id)
                db.commit()
            except Exception:
                logger.warning(
                    "on_task_event: complete failed for task %s (may not exist as WorkItem)",
                    event.entity_id,
                )
            return

        try:
            assignee_id = uuid.UUID(str(assignee_raw))
        except (ValueError, AttributeError):
            logger.warning("on_task_event: invalid assignee_id %s", assignee_raw)
            return

        due_date_raw = meta.get("due_date")
        due_date = None
        if due_date_raw:
            from datetime import datetime

            try:
                due_date = datetime.fromisoformat(str(due_date_raw))
            except (ValueError, TypeError):
                pass

        svc.upsert(
            tenant_id=event.tenant_id,
            source_module="tasks",
            source_type="task",
            source_id=str(event.entity_id),
            assignee_id=assignee_id,
            title=meta.get("title", "Tarea sin título"),
            category="work",
            priority=_map_priority(meta.get("priority")),
            status="pending",
            deep_link=f"/tasks/{event.entity_id}",
            source_snapshot={
                "title": meta.get("title"),
                "priority": meta.get("priority"),
            },
            due_date=due_date,
        )
        db.commit()


# ─── calendar subscriber ──────────────────────────────────────────────────────


async def on_calendar_event(event: Event) -> None:
    """Handle calendar.event.created — only required-attendance events."""
    meta = event.metadata.additional_data

    if not meta.get("required_attendance"):
        logger.debug("on_calendar_event: not required_attendance, skipping")
        return

    attendee_raw = meta.get("attendee_id")
    if not attendee_raw:
        logger.warning("on_calendar_event: no attendee_id, skipping")
        return

    try:
        attendee_id = uuid.UUID(str(attendee_raw))
    except (ValueError, AttributeError):
        logger.warning("on_calendar_event: invalid attendee_id %s", attendee_raw)
        return

    start_raw = meta.get("start_time")
    start_time = None
    if start_raw:
        from datetime import datetime

        try:
            start_time = datetime.fromisoformat(str(start_raw))
        except (ValueError, TypeError):
            pass

    with SessionLocal() as db:
        svc = WorkItemService(db)
        svc.upsert(
            tenant_id=event.tenant_id,
            source_module="calendar",
            source_type="event",
            source_id=str(event.entity_id),
            assignee_id=attendee_id,
            title=meta.get("title", "Evento sin título"),
            category="collab",
            priority="medium",
            status="pending",
            deep_link=f"/calendar/{event.entity_id}",
            source_snapshot={"title": meta.get("title")},
            due_date=start_time,
        )
        db.commit()


# ─── CRM subscriber ───────────────────────────────────────────────────────────


async def on_crm_event(event: Event) -> None:
    """Handle crm.lead.assigned events."""
    meta = event.metadata.additional_data
    assignee_raw = meta.get("assignee_id")
    if not assignee_raw:
        logger.warning("on_crm_event: no assignee_id, skipping")
        return

    try:
        assignee_id = uuid.UUID(str(assignee_raw))
    except (ValueError, AttributeError):
        logger.warning("on_crm_event: invalid assignee_id %s", assignee_raw)
        return

    with SessionLocal() as db:
        svc = WorkItemService(db)
        svc.upsert(
            tenant_id=event.tenant_id,
            source_module="crm",
            source_type="lead",
            source_id=str(event.entity_id),
            assignee_id=assignee_id,
            title=f"Lead: {meta.get('lead_name', 'Sin nombre')}",
            category="work",
            priority="high",
            status="pending",
            deep_link=f"/crm/leads/{event.entity_id}",
            source_snapshot={"lead_name": meta.get("lead_name")},
        )
        db.commit()


# ─── maintenance subscriber ───────────────────────────────────────────────────


async def on_maintenance_event(event: Event) -> None:
    """Handle maintenance.work_order.assigned events."""
    meta = event.metadata.additional_data
    assignee_raw = meta.get("assigned_to_id")
    if not assignee_raw:
        logger.warning("on_maintenance_event: no assigned_to_id, skipping")
        return

    try:
        assignee_id = uuid.UUID(str(assignee_raw))
    except (ValueError, AttributeError):
        logger.warning("on_maintenance_event: invalid assigned_to_id %s", assignee_raw)
        return

    with SessionLocal() as db:
        svc = WorkItemService(db)
        svc.upsert(
            tenant_id=event.tenant_id,
            source_module="maintenance",
            source_type="work_order",
            source_id=str(event.entity_id),
            assignee_id=assignee_id,
            title=meta.get("titulo", "Orden de trabajo"),
            category="work",
            priority=_map_priority(meta.get("prioridad")),
            status="pending",
            deep_link=f"/maintenance/work-orders/{event.entity_id}",
            source_snapshot={
                "titulo": meta.get("titulo"),
                "prioridad": meta.get("prioridad"),
            },
        )
        db.commit()


# ─── billing subscriber ───────────────────────────────────────────────────────


async def on_billing_event(event: Event) -> None:
    """Handle billing.payment.requires_approval events."""
    meta = event.metadata.additional_data
    approver_raw = meta.get("approver_id")
    if not approver_raw:
        logger.warning("on_billing_event: no approver_id, skipping")
        return

    try:
        approver_id = uuid.UUID(str(approver_raw))
    except (ValueError, AttributeError):
        logger.warning("on_billing_event: invalid approver_id %s", approver_raw)
        return

    amount = meta.get("amount", "")
    description = meta.get("description", "Pago pendiente de aprobación")

    with SessionLocal() as db:
        svc = WorkItemService(db)
        svc.upsert(
            tenant_id=event.tenant_id,
            source_module="billing",
            source_type="payment",
            source_id=str(event.entity_id),
            assignee_id=approver_id,
            title=f"Aprobar pago: {description} ({amount})",
            category="work",
            priority="high",
            status="pending",
            deep_link=f"/billing/payments/{event.entity_id}",
            source_snapshot={"amount": amount, "description": description},
        )
        db.commit()
