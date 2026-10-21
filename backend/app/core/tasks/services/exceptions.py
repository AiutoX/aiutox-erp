"""Exception classes for core.tasks module."""

from typing import Any

from app.core.exceptions import APIException


class TaskException(APIException):
    """Base exception for task-related errors."""

    def __init__(
        self,
        message: str,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(code=code or "TASK_ERROR", message=message, details=details)


class TaskNotFound(TaskException):
    """Raised when a task is not found."""

    def __init__(self, task_id: str, tenant_id: str | None = None):
        message = f"Task {task_id} not found"
        if tenant_id:
            message += f" in tenant {tenant_id}"
        super().__init__(message=message, code="TASK_NOT_FOUND")


class TaskAccessDenied(TaskException):
    """Raised when user doesn't have permission to access a task."""

    def __init__(self, task_id: str, user_id: str):
        super().__init__(
            message=f"User {user_id} does not have permission to access task {task_id}",
            code="TASK_ACCESS_DENIED",
        )


class TaskValidationError(TaskException):
    """Raised when task data validation fails."""

    def __init__(self, message: str, field: str | None = None):
        details = {"field": field} if field else None
        super().__init__(message=message, code="TASK_VALIDATION_ERROR", details=details)


class TaskStatusTransitionError(TaskException):
    """Raised when an invalid task status transition is attempted."""

    def __init__(self, current_status: str, new_status: str):
        super().__init__(
            message=f"Invalid status transition from {current_status} to {new_status}",
            code="INVALID_STATUS_TRANSITION",
            details={"current_status": current_status, "new_status": new_status},
        )


class TaskDependencyError(TaskException):
    """Raised when task dependency operations fail."""

    def __init__(
        self, message: str, task_id: str | None = None, dependency_id: str | None = None
    ):
        details = {}
        if task_id:
            details["task_id"] = task_id
        if dependency_id:
            details["dependency_id"] = dependency_id
        super().__init__(message=message, code="TASK_DEPENDENCY_ERROR", details=details)


class TaskAssignmentError(TaskException):
    """Raised when task assignment operations fail."""

    def __init__(
        self, message: str, task_id: str | None = None, assignee_id: str | None = None
    ):
        details = {}
        if task_id:
            details["task_id"] = task_id
        if assignee_id:
            details["assignee_id"] = assignee_id
        super().__init__(message=message, code="TASK_ASSIGNMENT_ERROR", details=details)


class TaskBulkOperationError(TaskException):
    """Raised when bulk task operations fail."""

    def __init__(
        self,
        message: str,
        operation: str | None = None,
        failed_count: int | None = None,
    ):
        details: dict[str, Any] = {}
        if operation:
            details["operation"] = operation
        if failed_count is not None:
            details["failed_count"] = failed_count
        super().__init__(
            message=message, code="TASK_BULK_OPERATION_ERROR", details=details
        )
