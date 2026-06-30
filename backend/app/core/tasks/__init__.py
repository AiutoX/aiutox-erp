"""Tasks module for task and workflow management."""

from enum import StrEnum
from typing import Final

from app.core.module_interface import ModuleInterface, WidgetManifest
from app.core.tasks.service import TaskService

# ============================================================================
# Task Constants
# ============================================================================

# Default task type
DEFAULT_TASK_TYPE: Final[str] = "generic"


# Task types
class TaskType(StrEnum):
    """Standard task types in AiutoX ERP."""

    GENERIC = "generic"
    DEADLINE = "deadline"
    MEETING = "meeting"
    APPROVAL = "approval"
    REVIEW = "review"
    BUG = "bug"
    FEATURE = "feature"
    IMPROVEMENT = "improvement"
    MAINTENANCE = "maintenance"


# Task priorities
class TaskPriority(StrEnum):
    """Task priority levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


# Task statuses
class TaskStatusEnum(StrEnum):
    """Task status values."""

    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    DONE = "done"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"


# Cache keys
CACHE_KEY_TASK = "task:{task_id}"
CACHE_KEY_TENANT_TASKS = "tenant:{tenant_id}:tasks"
CACHE_KEY_USER_TASKS = "user:{user_id}:tasks"
CACHE_KEY_TASK_DEPENDENCIES = "task:{task_id}:dependencies"

# Event types
EVENT_TASK_CREATED = "task.created"
EVENT_TASK_UPDATED = "task.updated"
EVENT_TASK_DELETED = "task.deleted"
EVENT_TASK_COMPLETED = "task.completed"
EVENT_TASK_ASSIGNED = "task.assigned"
EVENT_TASK_STATUS_CHANGED = "task.status_changed"

# Pagination defaults
DEFAULT_PAGE_SIZE: Final[int] = 50
MAX_PAGE_SIZE: Final[int] = 200

# Task validation rules
MAX_TITLE_LENGTH: Final[int] = 255
MAX_DESCRIPTION_LENGTH: Final[int] = 5000
MAX_NOTES_LENGTH: Final[int] = 2000

__all__ = [
    "TaskService",
    "TaskType",
    "TaskPriority",
    "TaskStatusEnum",
    "DEFAULT_TASK_TYPE",
    "CACHE_KEY_TASK",
    "CACHE_KEY_TENANT_TASKS",
    "CACHE_KEY_USER_TASKS",
    "CACHE_KEY_TASK_DEPENDENCIES",
    "EVENT_TASK_CREATED",
    "EVENT_TASK_UPDATED",
    "EVENT_TASK_DELETED",
    "EVENT_TASK_COMPLETED",
    "EVENT_TASK_ASSIGNED",
    "EVENT_TASK_STATUS_CHANGED",
    "DEFAULT_PAGE_SIZE",
    "MAX_PAGE_SIZE",
    "MAX_TITLE_LENGTH",
    "MAX_DESCRIPTION_LENGTH",
    "MAX_NOTES_LENGTH",
    "TasksCoreModule",
]


class TasksCoreModule(ModuleInterface):
    """Core Tasks module — exposes task widgets to the dashboard."""

    @property
    def module_id(self) -> str:
        return "tasks"

    @property
    def module_type(self) -> str:
        return "core"

    @property
    def enabled(self) -> bool:
        return True

    def get_widgets(self) -> list[WidgetManifest]:
        return [
            WidgetManifest(
                widget_id="tasks.upcoming",
                label="Upcoming Tasks",
                description="Shows your next due tasks and deadlines",
                frontend_component="features/tasks/UpcomingTasksWidget",
                required_tier="basic",
                width=4,
                height=3,
            ),
        ]
