"""Task service for business logic - Consolidated version."""

from datetime import datetime
from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.db.deps import get_db
from app.core.logging import get_logger
from app.core.pubsub.publisher import EventPublisher
from app.core.tasks.models import Task, TaskPriority, TaskStatusEnum
from app.core.tasks.services.events import (
    TaskEventPublisher,
    get_task_event_publisher,
)
from app.core.tasks.services.exceptions import TaskAccessDenied, TaskNotFound
from app.core.tasks.services.task_helpers import (
    coerce_status,
    validate_subtask_hierarchy,
    validate_task_dates,
)
from app.core.users.models import User
from app.repositories.task_repository import TaskRepository

logger = get_logger(__name__)


class TaskService:
    """Service for task management."""

    def __init__(
        self,
        db: Session,
        event_publisher: EventPublisher | TaskEventPublisher | None = None,
    ):
        """Initialize task service."""
        self.db = db
        self.repository = TaskRepository(db)
        self.event_publisher: TaskEventPublisher = (
            event_publisher  # type: ignore[assignment]
            if isinstance(event_publisher, TaskEventPublisher)
            else get_task_event_publisher()
        )

    async def create_task(
        self,
        title: str,
        tenant_id: UUID,
        created_by_id: UUID,
        description: str | None = None,
        status: str = TaskStatusEnum.TODO,
        priority: str = TaskPriority.MEDIUM,
        assigned_to_id: UUID | None = None,
        due_date: datetime | None = None,
        start_at: datetime | None = None,
        end_at: datetime | None = None,
        all_day: bool = False,
        parent_task_id: UUID | None = None,
        tags: list[str] | None = None,
        task_type: str = "generic",
        **kwargs,
    ) -> Task:
        """Create a new task."""
        # Validate dates
        start_at, due_date, end_at = validate_task_dates(start_at, due_date, end_at)

        # Validate subtask hierarchy if parent specified
        if parent_task_id:
            validate_subtask_hierarchy(parent_task_id, created_by_id)

        # Prepare task data
        task_data = {
            "title": title,
            "description": description,
            "tenant_id": tenant_id,
            "created_by_id": created_by_id,
            "status": status,
            "priority": priority,
            "assigned_to_id": assigned_to_id,
            "due_date": due_date,
            "start_at": start_at,
            "end_at": end_at,
            "all_day": all_day,
            "parent_task_id": parent_task_id,
            "tags": tags,
            "task_type": task_type,
            **kwargs,
        }

        # Save to database
        task = self.repository.create_task(task_data)

        # Publish event using TaskEventPublisher
        await self.event_publisher.publish_task_created(
            UUID(str(task.id)),
            UUID(str(task.tenant_id)),
            UUID(str(task.created_by_id)) if task.created_by_id else None,  # type: ignore[arg-type]
            task_data,
        )

        return task

    def get_task(self, task_id: UUID, tenant_id: UUID) -> Task | None:
        """Get a task by ID."""
        return self.repository.get_task_by_id(task_id, tenant_id)

    def get_tasks(
        self,
        tenant_id: UUID,
        assigned_to_id: UUID | None = None,
        status: str | None = None,
        priority: str | None = None,
        parent_task_id: UUID | None = None,
        task_type: str | None = None,
        limit: int = 100,
        offset: int = 0,
        skip: int | None = None,
    ) -> list[Task]:
        """Get tasks with optional filters."""
        return self.repository.get_all_tasks(
            tenant_id=tenant_id,
            status=status,
            priority=priority,
            assigned_to_id=assigned_to_id,
            skip=skip if skip is not None else offset,
            limit=limit,
        )

    def count_tasks(
        self,
        tenant_id: UUID,
        status: str | None = None,
        priority: str | None = None,
        assigned_to_id: UUID | None = None,
    ) -> int:
        """Count tasks for a tenant with optional filters."""
        return self.repository.count_tasks(
            tenant_id=tenant_id,
            status=status,
            priority=priority,
            assigned_to_id=assigned_to_id,
        )

    async def update_task(
        self,
        task_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        **updates,
    ) -> Task:
        """Update a task."""
        task = self.get_task(task_id, tenant_id)
        if not task:
            return None  # type: ignore[return-value]

        # Handle status change
        if "status" in updates:
            # TODO: Implement state machine validation if needed
            # For now, allow all status transitions
            new_status = coerce_status(updates["status"])
            updates["status"] = new_status
            # Auto-set completed_at when task is marked as DONE
            if new_status == TaskStatusEnum.DONE and task.completed_at is None:
                from datetime import UTC, datetime

                updates.setdefault("completed_at", datetime.now(UTC))

        # Validate dates if provided
        if any(key in updates for key in ["start_at", "due_date", "end_at"]):
            start_at = updates.get("start_at", task.start_at)
            due_date = updates.get("due_date", task.due_date)
            end_at = updates.get("end_at", task.end_at)
            start_at, due_date, end_at = validate_task_dates(start_at, due_date, end_at)
            updates.update(
                {
                    "start_at": start_at,
                    "due_date": due_date,
                    "end_at": end_at,
                }
            )

        # Update task
        task = self.repository.update_task(task_id, tenant_id, updates)

        # Invalidate cache if available
        if hasattr(self, "cache"):
            await self.cache.invalidate_task(task_id)

        # Publish event using TaskEventPublisher
        await self.event_publisher.publish_task_updated(
            task_id, tenant_id, user_id, updates
        )

        return task  # type: ignore[return-value]

    async def delete_task(self, task_id: UUID, tenant_id: UUID, user_id: UUID) -> bool:
        """Delete a task."""
        task = self.get_task(task_id, tenant_id)
        if not task:
            return False

        # Delete from database
        success = self.repository.delete_task(task_id, tenant_id)

        if success:
            # Invalidate cache if available
            if hasattr(self, "cache"):
                await self.cache.invalidate_task(task_id)

            # Publish event using TaskEventPublisher
            await self.event_publisher.publish_task_deleted(task_id, tenant_id, user_id)

        return success

    def get_tasks_paginated(
        self,
        tenant_id: UUID,
        page: int = 1,
        page_size: int = 50,
        **filters,
    ) -> tuple[list[Task], int]:
        """Get tasks with pagination, returning (tasks, total)."""
        skip = (page - 1) * page_size
        tasks = self.repository.get_all_tasks(
            tenant_id=tenant_id,
            skip=skip,
            limit=page_size,
            **filters,
        )
        total = self.repository.count_tasks(tenant_id=tenant_id, **filters)
        return tasks, total

    async def complete_task(
        self, task_id: UUID, tenant_id: UUID, user_id: UUID
    ) -> Task:
        """Mark a task as completed."""
        from datetime import UTC, datetime

        return await self.update_task(
            task_id,
            tenant_id,
            user_id,
            status="done",
            completed_at=datetime.now(UTC),
        )

    async def assign_task(
        self,
        task_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        assignee_id: UUID,
    ) -> Task:
        """Assign a task to a user."""
        return await self.update_task(
            task_id,
            tenant_id,
            user_id,
            assigned_to_id=assignee_id,
        )

    async def bulk_update_tasks(
        self,
        task_ids: list[UUID],
        tenant_id: UUID,
        user_id: UUID,
        **updates,
    ) -> dict:
        """Update multiple tasks at once."""
        updated = 0
        failed = 0
        for task_id in task_ids:
            try:
                await self.update_task(task_id, tenant_id, user_id, **updates)
                updated += 1
            except Exception:
                failed += 1
        return {"updated": updated, "failed": failed, "total": len(task_ids)}

    async def bulk_delete_tasks(
        self,
        task_ids: list[UUID],
        tenant_id: UUID,
        user_id: UUID,
    ) -> dict:
        """Delete multiple tasks at once."""
        deleted = 0
        failed = 0
        for task_id in task_ids:
            try:
                await self.delete_task(task_id, tenant_id, user_id)
                deleted += 1
            except Exception:
                failed += 1
        return {"deleted": deleted, "failed": failed, "total": len(task_ids)}

    def get_task_dependencies(self, task_id: UUID, tenant_id: UUID) -> list:
        """Get all dependencies for a task."""
        if hasattr(self.repository, "get_task_dependencies"):
            return self.repository.get_task_dependencies(task_id, tenant_id)
        return []

    def add_task_dependency(
        self,
        task_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        depends_on_task_id: UUID,
        dependency_type: str = "finish_to_start",
    ):
        """Add a dependency between two tasks."""
        if hasattr(self.repository, "create_task_dependency"):
            return self.repository.create_task_dependency(
                {
                    "task_id": task_id,
                    "depends_on_id": depends_on_task_id,
                    "dependency_type": dependency_type,
                    "tenant_id": tenant_id,
                }
            )
        return None

    def get_task_stats(self, tenant_id: UUID) -> dict:
        """Get task statistics for dashboard."""
        total = self.repository.count_tasks(tenant_id=tenant_id)
        todo = self.repository.count_tasks(tenant_id=tenant_id, status="todo")
        in_progress = self.repository.count_tasks(
            tenant_id=tenant_id, status="in_progress"
        )
        done = self.repository.count_tasks(tenant_id=tenant_id, status="done")
        return {
            "total": total,
            "todo": todo,
            "in_progress": in_progress,
            "done": done,
        }

    # -------------------------------------------------------------------------
    # Checklist methods (delegates to repository)
    # -------------------------------------------------------------------------

    def add_checklist_item(
        self,
        task_id: UUID,
        tenant_id: UUID,
        title: str,
        order: int = 0,
    ):
        """Add a checklist item to a task."""
        return self.repository.create_checklist_item(
            {
                "task_id": task_id,
                "tenant_id": tenant_id,
                "title": title,
                "order": order,
                "completed": False,
            }
        )

    def get_checklist_items(self, task_id: UUID, tenant_id: UUID):
        """Get all checklist items for a task."""
        return self.repository.get_checklist_items(task_id, tenant_id)

    def update_checklist_item(self, item_id: UUID, tenant_id: UUID, update_data: dict):
        """Update a checklist item."""
        return self.repository.update_checklist_item(item_id, tenant_id, update_data)

    def delete_checklist_item(self, item_id: UUID, tenant_id: UUID) -> bool:
        """Delete a checklist item."""
        return self.repository.delete_checklist_item(item_id, tenant_id)


# FastAPI Dependencies
def get_task_service(db: Session) -> TaskService:
    """Get task service instance."""
    return TaskService(db)


def get_task_by_id(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get task by ID with permission check."""
    service = TaskService(db)

    try:
        task = service.get_task(task_id, current_user.tenant_id)
        if not task:
            raise TaskNotFound(f"Task {task_id} not found")
        return task
    except Exception as e:
        if isinstance(e, TaskAccessDenied):
            raise
        raise TaskAccessDenied(task_id=str(task_id), user_id=str(current_user.id))


def check_task_permission(
    task_id: UUID,
    permission: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if user has specific permission on a task."""
    from app.core.tasks.services.permissions import (
        check_task_permission as check_perm,
    )

    task = get_task_by_id(task_id, db, current_user)

    if not check_perm(current_user, task, permission):
        raise TaskAccessDenied(task_id=str(task_id), user_id=str(current_user.id))

    return task


def require_task_manage_permission(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Require task manage permission."""
    return check_task_permission(task_id, "tasks.manage", db, current_user)


def require_task_edit_permission(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Require task edit permission."""
    return check_task_permission(task_id, "tasks.edit", db, current_user)


def require_task_delete_permission(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Require task delete permission."""
    return check_task_permission(task_id, "tasks.delete", db, current_user)
