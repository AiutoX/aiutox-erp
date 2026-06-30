"""Query filters for core.tasks module."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import and_, asc, desc, func, or_
from sqlalchemy.orm import Query

from app.core.tasks import TaskType
from app.core.tasks.models import Task, TaskAssignment
from app.core.tasks.models.task import TaskPriority, TaskStatusEnum
from app.core.tasks.models.task_dependency import TaskDependency


class TaskFilters:
    """Utility class for applying filters to task queries."""

    @staticmethod
    def apply_filters(
        query: Query,
        status: TaskStatusEnum | None = None,
        priority: TaskPriority | None = None,
        task_type: TaskType | None = None,
        assigned_to_id: UUID | None = None,
        created_by_id: UUID | None = None,
        parent_task_id: UUID | None = None,
        tags: list[str] | None = None,
        search: str | None = None,
        due_before: datetime | None = None,
        due_after: datetime | None = None,
        created_before: datetime | None = None,
        created_after: datetime | None = None,
        is_overdue: bool | None = None,
        tenant_id: UUID | None = None,
    ) -> Query:
        """Apply filters to a task query."""

        # Always filter by tenant_id if provided
        if tenant_id:
            query = query.filter(
                func.json_extract(Task.model_dump(), "$.tenant_id") == str(tenant_id)
            )

        # Status filter
        if status:
            query = query.filter(Task.status == status)

        # Priority filter
        if priority:
            query = query.filter(Task.priority == priority)

        # Task type filter
        if task_type:
            query = query.filter(Task.task_type == task_type)

        # Assignee filter
        if assigned_to_id:
            query = query.filter(Task.assigned_to_id == assigned_to_id)

        # Creator filter
        if created_by_id:
            query = query.filter(Task.created_by_id == created_by_id)

        # Parent task filter
        if parent_task_id:
            query = query.filter(Task.parent_task_id == parent_task_id)

        # Tags filter (any tag in the list)
        if tags:
            tag_conditions = []
            for tag in tags:
                tag_conditions.append(func.json_contains(Task.tags, f'["{tag}"]'))
            if tag_conditions:
                query = query.filter(or_(*tag_conditions))

        # Search filter (title and description)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Task.title.ilike(search_term),
                    Task.description.ilike(search_term),
                    Task.notes.ilike(search_term),
                )
            )

        # Due date range filter
        if due_before:
            query = query.filter(Task.due_date <= due_before)
        if due_after:
            query = query.filter(Task.due_date >= due_after)

        # Created date range filter
        if created_before:
            query = query.filter(Task.created_at <= created_before)
        if created_after:
            query = query.filter(Task.created_at >= created_after)

        # Overdue filter
        if is_overdue is not None:
            now = datetime.now(UTC)
            if is_overdue:
                query = query.filter(
                    and_(
                        Task.due_date < now,
                        Task.status.in_(
                            [TaskStatusEnum.TODO, TaskStatusEnum.IN_PROGRESS]
                        ),
                    )
                )
            else:
                query = query.filter(
                    or_(
                        Task.due_date >= now,
                        Task.status.in_(
                            [TaskStatusEnum.DONE, TaskStatusEnum.CANCELLED]
                        ),
                    )
                )

        return query

    @staticmethod
    def apply_sorting(
        query: Query, sort_by: str = "created_at", sort_order: str = "desc"
    ) -> Query:
        """Apply sorting to a task query."""

        # Valid sort fields
        valid_fields = {
            "created_at": Task.created_at,
            "updated_at": Task.updated_at,
            "due_date": Task.due_date,
            "title": Task.title,
            "priority": Task.priority,
            "status": Task.status,
            "task_type": Task.task_type,
        }

        # Get the column to sort by
        sort_column = valid_fields.get(sort_by, Task.created_at)

        # Apply sort order
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))  # type: ignore[arg-type]
        else:
            query = query.order_by(desc(sort_column))  # type: ignore[arg-type]

        return query

    @staticmethod
    def apply_pagination(
        query: Query, page: int = 1, page_size: int = 50
    ) -> tuple[Query, int]:
        """Apply pagination to a task query."""

        # Count total records
        total = query.count()

        # Calculate offset
        offset = (page - 1) * page_size

        # Apply pagination
        query = query.offset(offset).limit(page_size)

        return query, total


class TaskDependencyFilters:
    """Utility class for filtering task dependencies."""

    @staticmethod
    def apply_filters(
        query: Query,
        depends_on_task_id: UUID | None = None,
        dependency_type: str | None = None,
        created_before: datetime | None = None,
        created_after: datetime | None = None,
        tenant_id: UUID | None = None,
    ) -> Query:
        """Apply filters to task dependency query."""

        if depends_on_task_id:
            query = query.filter(TaskDependency.depends_on_id == depends_on_task_id)

        if dependency_type:
            query = query.filter(TaskDependency.dependency_type == dependency_type)

        if tenant_id:
            query = query.filter(TaskDependency.tenant_id == tenant_id)

        return query


class TaskAssignmentFilters:
    """Utility class for filtering task assignments."""

    @staticmethod
    def apply_filters(
        query: Query,
        assigned_to_id: UUID | None = None,
        assigned_to_group_id: UUID | None = None,
        assigned_by_id: UUID | None = None,
        assigned_before: datetime | None = None,
        assigned_after: datetime | None = None,
        tenant_id: UUID | None = None,
    ) -> Query:
        """Apply filters to task assignment query."""

        if assigned_to_id:
            query = query.filter(TaskAssignment.assigned_to_id == assigned_to_id)

        if assigned_to_group_id:
            query = query.filter(
                TaskAssignment.assigned_to_group_id == assigned_to_group_id
            )

        if assigned_by_id:
            query = query.filter(TaskAssignment.assigned_by_id == assigned_by_id)

        if tenant_id:
            query = query.filter(TaskAssignment.tenant_id == tenant_id)

        return query
