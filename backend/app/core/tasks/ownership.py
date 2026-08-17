"""Object-level ownership checks for task mutation endpoints (TSK-001).

Complements the identity-scoped, resource-blind `require_permission(...)` dependency
with a per-task relationship check: creator, assignee, or assigner may act on a task
they hold `tasks.manage`/`tasks.assign` for; a broader `tasks.manage.all` (or a wildcard
like `*`/`tasks.*`) bypasses the relationship requirement entirely.
"""

from uuid import UUID

from app.core.auth.permissions import has_permission
from app.core.tasks.models import Task

MANAGE_ALL_PERMISSION = "tasks.manage.all"


def user_owns_task(task: Task, user_id: UUID, user_permissions: set[str]) -> bool:
    """Update-level ownership: creator, assignee, assigner, or manage.all."""
    if has_permission(user_permissions, MANAGE_ALL_PERMISSION):
        return True
    if task.created_by_id == user_id or task.assigned_to_id == user_id:
        return True
    return any(
        assignment.assigned_to_id == user_id or assignment.assigned_by_id == user_id
        for assignment in task.assignments
    )


def user_can_delete_task(task: Task, user_id: UUID, user_permissions: set[str]) -> bool:
    """Delete-level ownership: creator or manage.all only (stricter than update)."""
    if has_permission(user_permissions, MANAGE_ALL_PERMISSION):
        return True
    return task.created_by_id == user_id
