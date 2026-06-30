"""FastAPI router for core.tasks module."""

from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.core.auth import get_current_user
from app.core.responses import StandardResponse
from app.core.tasks.exceptions import TaskException
from app.core.tasks.models import Task
from app.core.tasks.schemas import (
    TaskBulkDelete,
    TaskBulkResponse,
    TaskBulkUpdate,
    TaskCreate,
    TaskDependencyCreate,
    TaskDependencyResponse,
    TaskListParams,
    TaskListResponse,
    TaskResponse,
    TaskUpdate,
)
from app.core.tasks.service import (
    TaskService,
    get_task_by_id,
    get_task_service,
    require_task_delete_permission,
    require_task_edit_permission,
    require_task_manage_permission,
)
from app.core.users.models import User

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/", response_model=StandardResponse[TaskListResponse])
async def list_tasks(
    params: TaskListParams = Depends(),
    service: TaskService = Depends(get_task_service),
    current_user: User = Depends(get_current_user),
):
    """List tasks with filtering and pagination."""
    try:
        tasks, total = service.get_tasks_paginated(
            tenant_id=current_user.tenant_id,  # type: ignore[arg-type]
            page=params.page,
            page_size=params.page_size,
            **params.model_dump(exclude={"page", "page_size"}),
        )

        response_data = TaskListResponse(
            tasks=[TaskResponse.model_validate(task) for task in tasks],
            total=total,
            page=params.page,
            page_size=params.page_size,
            total_pages=(total + params.page_size - 1) // params.page_size,
        )

        return StandardResponse(data=response_data)
    except TaskException as e:
        raise e


@router.get("/{task_id}", response_model=StandardResponse[TaskResponse])
async def get_task(task: Task = Depends(get_task_by_id)):
    """Get a specific task by ID."""
    return StandardResponse(data=TaskResponse.model_validate(task))


@router.post(
    "/",
    response_model=StandardResponse[TaskResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_task(
    task_data: TaskCreate,
    service: TaskService = Depends(get_task_service),
    current_user: User = Depends(get_current_user),
):
    """Create a new task."""
    try:
        # Ensure tenant_id matches current user's tenant
        if task_data.tenant_id != current_user.tenant_id:
            raise TaskException("Cannot create task for different tenant")

        task = await service.create_task(
            **task_data.model_dump(exclude={"tenant_id"}),
            tenant_id=current_user.tenant_id,
            created_by_id=current_user.id,
        )

        return StandardResponse(data=TaskResponse.model_validate(task))
    except TaskException as e:
        raise e


@router.put("/{task_id}", response_model=StandardResponse[TaskResponse])
async def update_task(
    task_data: TaskUpdate,
    task: Task = Depends(require_task_edit_permission),
    service: TaskService = Depends(get_task_service),
    current_user: User = Depends(get_current_user),
):
    """Update an existing task."""
    try:
        updated_task = await service.update_task(
            task.id,  # type: ignore[arg-type]
            task.tenant_id,  # type: ignore[arg-type]
            current_user.id,  # type: ignore[arg-type]
            **task_data.model_dump(exclude_unset=True),
        )

        return StandardResponse(data=TaskResponse.model_validate(updated_task))
    except TaskException as e:
        raise e


@router.delete("/{task_id}", response_model=StandardResponse[bool])
async def delete_task(
    task: Task = Depends(require_task_delete_permission),
    service: TaskService = Depends(get_task_service),
    current_user: User = Depends(get_current_user),
):
    """Delete a task."""
    try:
        result = await service.delete_task(
            task.id,  # type: ignore[arg-type]
            task.tenant_id,  # type: ignore[arg-type]
            current_user.id,  # type: ignore[arg-type]
        )

        return StandardResponse(data=result)
    except TaskException as e:
        raise e


@router.post("/bulk-update", response_model=StandardResponse[TaskBulkResponse])
async def bulk_update_tasks(
    bulk_data: TaskBulkUpdate,
    service: TaskService = Depends(get_task_service),
    current_user: User = Depends(get_current_user),
):
    """Update multiple tasks at once."""
    try:
        # Verify all tasks belong to user's tenant
        for task_id in bulk_data.task_ids:
            task = service.get_task(task_id, current_user.tenant_id)  # type: ignore[arg-type]
            if not task:
                raise TaskException(f"Task {task_id} not found")

        result = await service.bulk_update_tasks(
            bulk_data.task_ids,
            current_user.tenant_id,  # type: ignore[arg-type]
            current_user.id,  # type: ignore[arg-type]
            **bulk_data.updates.model_dump(exclude_unset=True),
        )

        return StandardResponse(data=TaskBulkResponse.model_validate(result))
    except TaskException as e:
        raise e


@router.post("/bulk-delete", response_model=StandardResponse[TaskBulkResponse])
async def bulk_delete_tasks(
    bulk_data: TaskBulkDelete,
    service: TaskService = Depends(get_task_service),
    current_user: User = Depends(get_current_user),
):
    """Delete multiple tasks at once."""
    try:
        # Verify all tasks belong to user's tenant
        for task_id in bulk_data.task_ids:
            task = service.get_task(task_id, current_user.tenant_id)  # type: ignore[arg-type]
            if not task:
                raise TaskException(f"Task {task_id} not found")

        result = await service.bulk_delete_tasks(
            bulk_data.task_ids,
            current_user.tenant_id,  # type: ignore[arg-type]
            current_user.id,  # type: ignore[arg-type]
        )

        return StandardResponse(data=TaskBulkResponse.model_validate(result))
    except TaskException as e:
        raise e


@router.post("/{task_id}/complete", response_model=StandardResponse[TaskResponse])
async def complete_task(
    task: Task = Depends(get_task_by_id),
    service: TaskService = Depends(get_task_service),
    current_user: User = Depends(get_current_user),
):
    """Mark a task as completed."""
    try:
        updated_task = await service.complete_task(
            task.id,  # type: ignore[arg-type]
            task.tenant_id,  # type: ignore[arg-type]
            current_user.id,  # type: ignore[arg-type]
        )

        return StandardResponse(data=TaskResponse.model_validate(updated_task))
    except TaskException as e:
        raise e


@router.post("/{task_id}/assign", response_model=StandardResponse[TaskResponse])
async def assign_task(
    task_id: UUID,
    assignee_id: UUID,
    task: Task = Depends(require_task_manage_permission),
    service: TaskService = Depends(get_task_service),
    current_user: User = Depends(get_current_user),
):
    """Assign a task to a user."""
    try:
        updated_task = await service.assign_task(
            task.id,  # type: ignore[arg-type]
            task.tenant_id,  # type: ignore[arg-type]
            current_user.id,  # type: ignore[arg-type]
            assignee_id,
        )

        return StandardResponse(data=TaskResponse.model_validate(updated_task))
    except TaskException as e:
        raise e


@router.get(
    "/{task_id}/dependencies",
    response_model=StandardResponse[list[TaskDependencyResponse]],
)
async def get_task_dependencies(
    task: Task = Depends(get_task_by_id),
    service: TaskService = Depends(get_task_service),
):
    """Get dependencies for a task."""
    try:
        dependencies = service.get_task_dependencies(
            task.id,  # type: ignore[arg-type]
            task.tenant_id,  # type: ignore[arg-type]
        )
        return StandardResponse(
            data=[TaskDependencyResponse.model_validate(dep) for dep in dependencies]
        )
    except TaskException as e:
        raise e


@router.post(
    "/{task_id}/dependencies", response_model=StandardResponse[TaskDependencyResponse]
)
async def add_task_dependency(
    task_id: UUID,
    dependency_data: TaskDependencyCreate,
    task: Task = Depends(require_task_manage_permission),
    service: TaskService = Depends(get_task_service),
    current_user: User = Depends(get_current_user),
):
    """Add a dependency to a task."""
    try:
        dependency = service.add_task_dependency(
            task_id,
            task.tenant_id,  # type: ignore[arg-type]
            current_user.id,  # type: ignore[arg-type]
            dependency_data.depends_on_task_id,
            dependency_data.dependency_type,
        )

        return StandardResponse(data=TaskDependencyResponse.model_validate(dependency))
    except TaskException as e:
        raise e


@router.get("/stats/dashboard", response_model=StandardResponse[dict])
async def get_task_stats(
    service: TaskService = Depends(get_task_service),
    current_user: User = Depends(get_current_user),
):
    """Get task statistics for dashboard."""
    try:
        stats = service.get_task_stats(current_user.tenant_id)  # type: ignore[arg-type]
        return StandardResponse(data=stats)
    except TaskException as e:
        raise e


@router.get(
    "/types",
    response_model=StandardResponse[list],
    summary="List registered task types",
    description="Returns all task types registered via the TaskTypeRegistry. "
    "Used by the frontend to render dynamic task forms.",
)
def get_task_types(
    current_user: User = Depends(get_current_user),
) -> StandardResponse[list]:
    """List all registered task types from the TaskTypeRegistry."""
    from app.core.task_registry import get_task_type_registry

    registry = get_task_type_registry()
    return StandardResponse(data=registry.list_types())
