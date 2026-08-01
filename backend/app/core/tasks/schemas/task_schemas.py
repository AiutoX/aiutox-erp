"""Pydantic schemas for core.tasks module."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.tasks import TaskPriority, TaskStatusEnum, TaskType


# Base schemas
class TaskBase(BaseModel):
    """Base schema for Task with common fields."""

    title: str = Field(..., max_length=255, description="Task title")
    description: str | None = Field(
        None, max_length=5000, description="Task description"
    )
    notes: str | None = Field(None, max_length=2000, description="Additional notes")
    priority: TaskPriority = Field(TaskPriority.MEDIUM, description="Task priority")
    status: TaskStatusEnum = Field(TaskStatusEnum.TODO, description="Task status")
    task_type: TaskType = Field(TaskType.GENERIC, description="Type of task")
    assigned_to_id: UUID | None = Field(None, description="Assigned user ID")
    start_at: datetime | None = Field(None, description="Task start date")
    due_date: datetime | None = Field(None, description="Task due date")
    end_at: datetime | None = Field(None, description="Task end date")
    all_day: bool = Field(False, description="All day event")
    location: str | None = Field(None, max_length=255, description="Task location")
    is_recurring: bool = Field(False, description="Is a recurring task")
    parent_task_id: UUID | None = Field(None, description="Parent task ID")
    tags: list[str] = Field(default_factory=list, description="Task tags")
    metadata: dict[str, Any] = Field(
        default_factory=dict, description="Additional metadata"
    )

    model_config = ConfigDict(from_attributes=True)


class TaskCreate(TaskBase):
    """Schema for creating a new task."""

    tenant_id: UUID = Field(..., description="Tenant ID")
    created_by_id: UUID = Field(..., description="Creator user ID")

    # Workflow fields
    workflow_id: UUID | None = Field(None, description="Workflow ID")

    # Recurrence fields
    recurrence_rule: dict[str, Any] | None = Field(None, description="Recurrence rule")

    # Checklist items
    checklist_items: list[dict[str, Any]] = Field(
        default_factory=list, description="Checklist items"
    )


class TaskUpdate(BaseModel):
    """Schema for updating an existing task."""

    title: str | None = Field(None, max_length=255, description="Task title")
    description: str | None = Field(
        None, max_length=5000, description="Task description"
    )
    notes: str | None = Field(None, max_length=2000, description="Additional notes")
    priority: TaskPriority | None = Field(None, description="Task priority")
    status: TaskStatusEnum | None = Field(None, description="Task status")
    task_type: TaskType | None = Field(None, description="Type of task")
    assigned_to_id: UUID | None = Field(None, description="Assigned user ID")
    start_at: datetime | None = Field(None, description="Task start date")
    due_date: datetime | None = Field(None, description="Task due date")
    end_at: datetime | None = Field(None, description="Task end date")
    all_day: bool | None = Field(None, description="All day event")
    location: str | None = Field(None, max_length=255, description="Task location")
    is_recurring: bool | None = Field(None, description="Is a recurring task")
    parent_task_id: UUID | None = Field(None, description="Parent task ID")
    tags: list[str] | None = Field(None, description="Task tags")
    metadata: dict[str, Any] | None = Field(None, description="Additional metadata")

    model_config = ConfigDict(from_attributes=True)


class TaskResponse(TaskBase):
    """Schema for task response with all fields."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="Task ID")
    tenant_id: UUID = Field(..., description="Tenant ID")
    created_by_id: UUID = Field(..., description="Creator user ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    completed_at: datetime | None = Field(None, description="Completion timestamp")
    completed_by_id: UUID | None = Field(
        None, description="User who completed the task"
    )

    # Additional fields
    workflow_id: UUID | None = Field(None, description="Workflow ID")
    source_module: str | None = Field(None, description="Source module")
    source_entity_id: UUID | None = Field(None, description="Source entity ID")

    # Computed fields
    is_overdue: bool = Field(False, description="Is task overdue")
    days_until_due: int | None = Field(None, description="Days until due")
    completion_percentage: float = Field(0.0, description="Completion percentage")

    # Relations (simplified)
    assignee_name: str | None = Field(None, description="Assignee name")
    creator_name: str | None = Field(None, description="Creator name")
    parent_task_title: str | None = Field(None, description="Parent task title")
    subtasks_count: int = Field(0, description="Number of subtasks")
    attachments_count: int = Field(0, description="Number of attachments")
    comments_count: int = Field(0, description="Number of comments")


# Task list schemas
class TaskListParams(BaseModel):
    """Schema for task list query parameters."""

    status: TaskStatusEnum | None = Field(None, description="Filter by status")
    priority: TaskPriority | None = Field(None, description="Filter by priority")
    task_type: TaskType | None = Field(None, description="Filter by task type")
    assigned_to_id: UUID | None = Field(None, description="Filter by assignee")
    created_by_id: UUID | None = Field(None, description="Filter by creator")
    parent_task_id: UUID | None = Field(None, description="Filter by parent task")
    tags: list[str] | None = Field(None, description="Filter by tags")
    search: str | None = Field(None, description="Search in title and description")
    due_before: datetime | None = Field(None, description="Due date before")
    due_after: datetime | None = Field(None, description="Due date after")
    created_before: datetime | None = Field(None, description="Created before")
    created_after: datetime | None = Field(None, description="Created after")
    is_overdue: bool | None = Field(None, description="Filter overdue tasks")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(50, ge=1, le=200, description="Items per page")
    sort_by: str = Field("created_at", description="Sort field")
    sort_order: str = Field("desc", pattern="^(asc|desc)$", description="Sort order")


class TaskListResponse(BaseModel):
    """Schema for task list response."""

    tasks: list[TaskResponse] = Field(..., description="List of tasks")
    total: int = Field(..., description="Total number of tasks")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


# Bulk operations schemas
class TaskBulkUpdate(BaseModel):
    """Schema for bulk updating tasks."""

    task_ids: list[UUID] = Field(..., min_length=1, description="List of task IDs")
    updates: TaskUpdate = Field(..., description="Updates to apply")

    model_config = ConfigDict(from_attributes=True)


class TaskBulkDelete(BaseModel):
    """Schema for bulk deleting tasks."""

    task_ids: list[UUID] = Field(..., min_length=1, description="List of task IDs")

    model_config = ConfigDict(from_attributes=True)


class TaskBulkResponse(BaseModel):
    """Schema for bulk operation response."""

    success_count: int = Field(..., description="Number of successful operations")
    failed_count: int = Field(..., description="Number of failed operations")
    errors: list[dict[str, Any]] = Field(
        default_factory=list, description="Error details"
    )

    model_config = ConfigDict(from_attributes=True)


# Task dependency schemas
class TaskDependencyCreate(BaseModel):
    """Schema for creating a task dependency."""

    depends_on_task_id: UUID = Field(
        ..., description="Task ID that this task depends on"
    )
    dependency_type: str = Field("finish_to_start", description="Type of dependency")

    model_config = ConfigDict(from_attributes=True)


class TaskDependencyResponse(BaseModel):
    """Schema for task dependency response."""

    id: UUID = Field(..., description="Dependency ID")
    task_id: UUID = Field(..., description="Task ID")
    depends_on_task_id: UUID = Field(..., description="Depends on task ID")
    dependency_type: str = Field(..., description="Type of dependency")
    created_at: datetime = Field(..., description="Creation timestamp")

    # Related task info
    depends_on_task_title: str = Field(..., description="Depends on task title")
    depends_on_task_status: TaskStatusEnum = Field(
        ..., description="Depends on task status"
    )

    model_config = ConfigDict(from_attributes=True)


# Task assignment schemas
class TaskAssignmentCreate(BaseModel):
    """Schema for creating a task assignment."""

    assigned_to_id: UUID | None = Field(None, description="User ID to assign to")
    assigned_to_group_id: UUID | None = Field(None, description="Group ID to assign to")

    model_config = ConfigDict(from_attributes=True)


class TaskAssignmentResponse(BaseModel):
    """Schema for task assignment response."""

    id: UUID = Field(..., description="Assignment ID")
    task_id: UUID = Field(..., description="Task ID")
    assigned_to_id: UUID | None = Field(None, description="Assigned user ID")
    assigned_to_group_id: UUID | None = Field(None, description="Assigned group ID")
    assigned_by_id: UUID | None = Field(None, description="Who made the assignment")
    assigned_at: datetime = Field(..., description="Assignment timestamp")

    # Related info
    assignee_name: str | None = Field(None, description="Assignee name")
    group_name: str | None = Field(None, description="Group name")

    model_config = ConfigDict(from_attributes=True)
