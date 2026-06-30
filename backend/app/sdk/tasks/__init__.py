"""aiutox_sdk.tasks — public tasks surface for cross-module access.

Provides business modules with access to task metadata services and models.
"""

from app.core.calendar.models import UserCalendarPreferences
from app.core.tasks.models import (
    Task,
    TaskChecklistItem,
    TaskPriority,
    TaskStatusEnum,
)
from app.core.tasks.models.task_status import TaskStatus  # noqa: F401
from app.core.tasks.services import (
    TaskCommentServiceAdapter,
    TaskDependencyService,
    TaskEventPublisher,
    TaskFileService,
    TaskService,
    TaskStatusService,
    TaskTagService,
    get_task_comment_service,
    get_task_dependency_service,
    get_task_event_publisher,
    get_task_event_sync_service,
    get_task_events,
    get_task_file_service,
    get_task_status_service,
    get_task_tag_service,
)

__all__ = [
    "TaskService",
    "TaskFileService",
    "TaskTagService",
    "TaskStatusService",
    "TaskCommentServiceAdapter",
    "TaskDependencyService",
    "get_task_file_service",
    "get_task_tag_service",
    "get_task_status_service",
    "get_task_comment_service",
    "get_task_dependency_service",
    "TaskEventPublisher",
    "get_task_event_publisher",
    "get_task_events",
    "get_task_event_sync_service",
    "Task",
    "TaskChecklistItem",
    "TaskPriority",
    "TaskStatus",
    "TaskStatusEnum",
    "UserCalendarPreferences",
]
