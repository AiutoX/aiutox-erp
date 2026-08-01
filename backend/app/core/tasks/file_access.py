"""Registers `tasks` as an entity access resolver for the `files` module.

Files attached to a task (`File.entity_type == "task"`) inherit access from
whoever can already act on that task, via the same object-level ownership
check (`user_owns_task`) already enforced on the task mutation endpoints
themselves — no separate `files.*` permission or manually configured
`FilePermission` row required. See `app.core.files.entity_access` for the
resolver protocol this implements.
"""

from typing import TYPE_CHECKING
from uuid import UUID

from app.core.tasks.models import Task
from app.core.tasks.ownership import user_owns_task

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class TaskFileAccessResolver:
    """Delegates file access on task-attached files to `user_owns_task`.

    Stateless — takes the caller's request-scoped `db` session as a
    parameter rather than holding one, since resolvers are registered once
    at application startup and must outlive any single request/session.
    """

    def can_access(
        self,
        db: "Session",
        entity_id: UUID,
        user_id: UUID,
        tenant_id: UUID,
        user_permissions: set[str],
        action: str,
    ) -> bool:
        task = (
            db.query(Task)
            .filter(Task.id == entity_id, Task.tenant_id == tenant_id)
            .first()
        )
        if task is None:
            # Task deleted or not found — fall back to explicit FilePermission.
            return False
        return user_owns_task(task, user_id, user_permissions)


def register_tasks_file_access_resolver() -> None:
    """Register the tasks resolver with `files`' entity_access registry."""
    from app.core.files.entity_access import register_entity_access_resolver

    register_entity_access_resolver("task", TaskFileAccessResolver())
