"""FastAPI dependencies for core.tasks module."""

from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.db.deps import get_db
from app.core.tasks.exceptions import TaskAccessDenied, TaskNotFound
from app.core.tasks.service import TaskService
from app.core.users.models import User


def get_task_service(db: Session = Depends(get_db)) -> TaskService:
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
            raise TaskNotFound(str(task_id), str(current_user.tenant_id))

        # Check permission (simplified - in real implementation, check RBAC)
        if task.tenant_id != current_user.tenant_id:
            raise TaskAccessDenied(str(task_id), str(current_user.id))

        return task
    except TaskNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found"
        )
    except TaskAccessDenied:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this task"
        )


def check_task_permission(
    task_id: UUID,
    permission: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if user has specific permission on a task."""
    from app.core.tasks.permissions import check_task_permission as check_perm

    task = get_task_by_id(task_id, db, current_user)

    if not check_perm(current_user, task, permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission '{permission}' required for this operation",
        )

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
    return check_task_permission(task_id, "tasks.update", db, current_user)


def require_task_delete_permission(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Require task delete permission."""
    return check_task_permission(task_id, "tasks.delete", db, current_user)


def require_task_assign_permission(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Require task assign permission."""
    return check_task_permission(task_id, "tasks.assign", db, current_user)


def require_task_complete_permission(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Require task complete permission."""
    return check_task_permission(task_id, "tasks.complete", db, current_user)


class TenantFilterMixin:
    """Mixin to add tenant filtering to dependencies."""

    def __init__(self, tenant_id: UUID):
        self.tenant_id = tenant_id

    def filter_by_tenant(self, query):
        """Filter query by tenant_id."""
        return query.filter(tenant_id=self.tenant_id)


def get_tenant_tasks(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get all tasks for current user's tenant."""
    service = TaskService(db)
    return service.get_tasks(tenant_id=current_user.tenant_id)


def get_user_tasks(
    assigned_only: bool = False,
    created_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get tasks for current user."""
    service = TaskService(db)

    if assigned_only:
        return service.get_tasks(
            tenant_id=current_user.tenant_id, assigned_to_id=current_user.id
        )
    elif created_only:
        return service.get_tasks(tenant_id=current_user.tenant_id)
    else:
        # Get all tasks user has access to
        return service.get_tasks(tenant_id=current_user.tenant_id)


# Pagination dependency
def get_pagination_params(page: int = 1, page_size: int = 50) -> dict:
    """Get pagination parameters with validation."""
    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Page must be >= 1"
        )

    if page_size < 1 or page_size > 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page size must be between 1 and 200",
        )

    return {"page": page, "page_size": page_size}
