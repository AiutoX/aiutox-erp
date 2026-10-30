"""Task helper functions and utilities."""

from datetime import UTC, datetime
from uuid import UUID

from app.core.tasks.models import Task, TaskStatusEnum


def should_sync_to_calendar(task: Task, tenant_id: UUID) -> bool:
    """Check if task should be synced to calendar."""
    return (
        task.due_date is not None or task.start_at is not None or task.all_day
    ) and task.tenant_id == tenant_id


def validate_subtask_hierarchy(parent_id: UUID | None, task_id: UUID) -> None:
    """Validate that subtask hierarchy doesn't create cycles."""
    if parent_id == task_id:
        raise ValueError("Task cannot be its own parent")


def coerce_status(value: TaskStatusEnum | str) -> TaskStatusEnum:
    """Coerce status value to TaskStatusEnum."""
    if isinstance(value, TaskStatusEnum):
        return value
    try:
        return TaskStatusEnum(value.lower())
    except ValueError:
        return TaskStatusEnum.TODO


def validate_task_dates(
    start_at: datetime | None, due_date: datetime | None, end_at: datetime | None
) -> tuple[datetime | None, datetime | None, datetime | None]:
    """Validate and normalize task dates."""

    # Ensure timezone awareness
    def ensure_utc(dt: datetime | None) -> datetime | None:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=UTC)
        return dt

    start_at = ensure_utc(start_at)
    due_date = ensure_utc(due_date)
    end_at = ensure_utc(end_at)

    # Validate date logic
    if start_at and due_date and start_at > due_date:
        raise ValueError("Start date cannot be after due date")

    if due_date and end_at and due_date > end_at:
        raise ValueError("Due date cannot be after end date")

    if start_at and end_at and start_at > end_at:
        raise ValueError("Start date cannot be after end date")

    return start_at, due_date, end_at


def get_task_priority_weight(priority: str) -> int:
    """Get numeric weight for task priority."""
    priority_weights = {"low": 1, "medium": 2, "high": 3, "urgent": 4}
    return priority_weights.get(priority.lower(), 2)


def is_task_overdue(task: Task) -> bool:
    """Check if task is overdue."""
    if task.status in [TaskStatusEnum.DONE, TaskStatusEnum.CANCELLED]:
        return False

    if task.due_date is None:
        return False

    return datetime.now(UTC) > task.due_date


def get_task_duration_days(task: Task) -> int | None:
    """Calculate task duration in days."""
    if task.start_at is None or task.due_date is None:
        return None

    return (task.due_date.date() - task.start_at.date()).days


def format_task_title(task: Task, max_length: int = 50) -> str:
    """Format task title with truncation if needed."""
    if len(task.title) <= max_length:
        return task.title
    return task.title[: max_length - 3] + "..."


def get_task_completion_percentage(task: Task) -> float:
    """Calculate task completion percentage based on checklist items."""
    if not hasattr(task, "checklist_items") or not task.checklist_items:
        return 0.0

    if not task.checklist_items:
        return 0.0

    completed = sum(1 for item in task.checklist_items if item.completed)
    return (completed / len(task.checklist_items)) * 100
