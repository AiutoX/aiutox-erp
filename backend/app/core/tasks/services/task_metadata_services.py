"""Task metadata services for file attachments, tags, and status management."""

import logging
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.tags.models import EntityTag, Tag
from app.core.tasks.models import Task, TaskStatus
from app.repositories.tag_repository import TagRepository
from app.repositories.task_repository import TaskRepository

logger = logging.getLogger(__name__)


# ============================================================================
# Task File Service
# ============================================================================


class TaskFileService:
    """Service for managing task file attachments via the File model."""

    def __init__(self, db: Session):
        from app.core.files.models import File

        self.db = db
        self._file_model = File

    def _verify_task(self, task_id: UUID, tenant_id: UUID) -> None:
        task = (
            self.db.query(Task)
            .filter(Task.id == task_id, Task.tenant_id == tenant_id)
            .first()
        )
        if not task:
            raise ValueError(f"Task {task_id} not found")

    def attach_file(
        self,
        task_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        file_id: UUID,
        file_name: str,
        file_size: int,
        file_type: str,
        file_url: str,
    ) -> dict:
        """Attach a file reference to a task."""
        self._verify_task(task_id, tenant_id)

        # Upsert: if a File record with this id already exists in this task, update it
        existing = (
            self.db.query(self._file_model)
            .filter(
                self._file_model.id == file_id, self._file_model.tenant_id == tenant_id
            )
            .first()
        )

        if existing:
            existing.entity_type = "task"
            existing.entity_id = str(task_id)
            self.db.commit()
            self.db.refresh(existing)
            record = existing
        else:
            ext = file_name.rsplit(".", 1)[-1] if "." in file_name else ""
            record = self._file_model(
                id=file_id,
                tenant_id=tenant_id,
                name=file_name,
                original_name=file_name,
                mime_type=file_type,
                size=file_size,
                storage_path=file_url,
                storage_url=file_url,
                extension=ext[:10] if ext else None,
                entity_type="task",
                entity_id=task_id,
                uploaded_by=user_id,
            )
            self.db.add(record)
            self.db.commit()
            self.db.refresh(record)

        return self._serialize(record)

    def detach_file(
        self,
        task_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        file_id: UUID,
    ) -> bool:
        """Remove a file attachment from a task."""
        self._verify_task(task_id, tenant_id)
        record = (
            self.db.query(self._file_model)
            .filter(
                self._file_model.id == file_id,
                self._file_model.entity_type == "task",
                self._file_model.entity_id == task_id,
                self._file_model.tenant_id == tenant_id,
            )
            .first()
        )
        if not record:
            return False
        self.db.delete(record)
        self.db.commit()
        return True

    def list_files(self, task_id: UUID, tenant_id: UUID) -> list[dict]:
        """List files attached to a task."""
        records = (
            self.db.query(self._file_model)
            .filter(
                self._file_model.entity_type == "task",
                self._file_model.entity_id == task_id,
                self._file_model.tenant_id == tenant_id,
            )
            .all()
        )
        return [self._serialize(r) for r in records]

    def _serialize(self, record) -> dict:
        return {
            "id": str(record.id),
            "file_id": str(record.id),
            "file_name": record.name,
            "file_size": record.size,
            "file_type": record.mime_type,
            "file_url": record.storage_url or record.storage_path,
            "uploaded_by": str(record.uploaded_by) if record.uploaded_by else None,
            "created_at": record.created_at.isoformat() if record.created_at else None,
        }


# ============================================================================
# Task Tag Service
# ============================================================================


class TaskTagService:
    """Service for managing task tags."""

    def __init__(self, db: Session):
        """Initialize tag service."""
        self.db = db
        self.tag_repository = TagRepository(db)

    def get_task_tags(self, task_id: UUID, tenant_id: UUID) -> list[Tag]:
        """Get all tags for a task."""
        stmt = (
            select(Tag)
            .join(EntityTag)  # type: ignore[arg-type]
            .where(  # type: ignore[attr-defined]
                and_(
                    EntityTag.entity_type == "task",
                    EntityTag.entity_id == task_id,
                    Tag.tenant_id == tenant_id,
                )
            )
        )
        return list(self.db.execute(stmt).scalars().all())

    def add_tag_to_task(
        self,
        task_id: UUID,
        tag_id: UUID,
        tenant_id: UUID,
        user_id: UUID | None = None,
    ) -> bool:
        """Add a tag to a task."""
        # Verify tag exists and belongs to tenant
        tag = self.tag_repository.get_tag_by_id(tag_id, tenant_id)
        if not tag:
            return False

        # Check if tag is already attached to task
        stmt = select(EntityTag).where(
            and_(
                EntityTag.entity_type == "task",
                EntityTag.entity_id == task_id,
                EntityTag.tag_id == tag_id,
            )
        )
        existing = self.db.execute(stmt).scalar_one_or_none()

        if existing:
            return True  # Already tagged

        # Create the relationship
        entity_tag = EntityTag(
            entity_type="task",
            entity_id=task_id,
            tag_id=tag_id,
            created_by_id=user_id,
        )
        self.db.add(entity_tag)
        self.db.commit()
        return True

    def remove_tag_from_task(
        self,
        task_id: UUID,
        tag_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Remove a tag from a task."""
        stmt = select(EntityTag).where(
            and_(
                EntityTag.entity_type == "task",
                EntityTag.entity_id == task_id,
                EntityTag.tag_id == tag_id,
            )
        )
        entity_tag = self.db.execute(stmt).scalar_one_or_none()

        if not entity_tag:
            return False

        self.db.delete(entity_tag)
        self.db.commit()
        return True

    def set_task_tags(
        self,
        task_id: UUID,
        tag_ids: list[UUID],
        tenant_id: UUID,
        user_id: UUID | None = None,
    ) -> list[Tag]:
        """Set all tags for a task (replaces existing tags)."""
        # Remove existing tags
        stmt = select(EntityTag).where(
            and_(
                EntityTag.entity_type == "task",
                EntityTag.entity_id == task_id,
            )
        )
        existing_tags = self.db.execute(stmt).scalars().all()
        for tag in existing_tags:
            self.db.delete(tag)

        # Add new tags
        attached_tags = []
        for tag_id in tag_ids:
            tag = self.tag_repository.get_tag_by_id(tag_id, tenant_id)
            if tag and tag.tenant_id == tenant_id:
                entity_tag = EntityTag(
                    entity_type="task",
                    entity_id=task_id,
                    tag_id=tag_id,
                    created_by_id=user_id,
                )
                self.db.add(entity_tag)
                attached_tags.append(tag)

        self.db.commit()
        return attached_tags

    def get_tasks_with_tag(
        self,
        tag_id: UUID,
        tenant_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Task]:
        """Get all tasks that have a specific tag."""
        stmt = (
            select(Task)
            .join(EntityTag)  # type: ignore[arg-type]
            .where(  # type: ignore[attr-defined]
                and_(
                    EntityTag.entity_type == "task",
                    EntityTag.tag_id == tag_id,
                    Task.tenant_id == tenant_id,
                )
            )
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars().all())


# ============================================================================
# Task Status Service
# ============================================================================


class TaskStatusService:
    """Service for managing task statuses."""

    def __init__(self, db: Session):
        """Initialize status service."""
        self.db = db
        self.task_repository = TaskRepository(db)

    def get_task_statuses(self, tenant_id: UUID) -> list[TaskStatus]:
        """Get all task statuses for a tenant."""
        stmt = select(TaskStatus).where(TaskStatus.tenant_id == tenant_id)
        return list(self.db.execute(stmt).scalars().all())

    def get_task_status(self, status_id: UUID, tenant_id: UUID) -> TaskStatus | None:
        """Get a specific task status."""
        stmt = select(TaskStatus).where(
            and_(TaskStatus.id == status_id, TaskStatus.tenant_id == tenant_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create_task_status(
        self,
        name: str,
        color: str,
        order: int,
        tenant_id: UUID,
        status_type: str = "open",
        is_system: bool = False,
    ) -> TaskStatus:
        """Create a new task status."""
        status = TaskStatus(
            name=name,
            color=color,
            order=order,
            tenant_id=tenant_id,
            type=status_type,
            is_system=is_system,
        )
        self.db.add(status)
        self.db.commit()
        self.db.refresh(status)
        return status

    # Router-compatible alias
    def create_status(
        self,
        tenant_id: UUID,
        name: str,
        status_type: str = "open",
        color: str = "#9E9E9E",
        order: int = 0,
    ) -> TaskStatus:
        """Create a task status (router interface)."""
        return self.create_task_status(
            name=name,
            color=color,
            order=order,
            tenant_id=tenant_id,
            status_type=status_type,
            is_system=False,
        )

    def get_statuses(self, tenant_id: UUID) -> list[TaskStatus]:
        """Get all task statuses for a tenant (router interface)."""
        return self.get_task_statuses(tenant_id)

    def update_task_status(
        self,
        status_id: UUID,
        name: str | None = None,
        color: str | None = None,
        order: int | None = None,
    ) -> TaskStatus | None:
        """Update a task status."""
        status = self.db.query(TaskStatus).filter(TaskStatus.id == status_id).first()

        if not status:
            return None

        if name is not None:
            status.name = name
        if color is not None:
            status.color = color
        if order is not None:
            status.order = order

        self.db.commit()
        self.db.refresh(status)
        return status

    def update_status(
        self,
        status_id: UUID,
        tenant_id: UUID,
        update_data: dict,
    ) -> TaskStatus | None:
        """Update a task status (router interface)."""
        task_status = self.get_task_status(status_id, tenant_id)
        if not task_status or task_status.is_system:
            return None
        return self.update_task_status(
            status_id=status_id,
            name=update_data.get("name"),
            color=update_data.get("color"),
            order=update_data.get("order"),
        )

    def delete_status(self, status_id: UUID, tenant_id: UUID) -> bool:
        """Delete a task status (router interface)."""
        return self.delete_task_status(status_id, tenant_id)

    def reorder_statuses(
        self,
        tenant_id: UUID,
        status_orders: dict,
    ) -> list[TaskStatus]:
        """Reorder task statuses."""
        for status_id, order in status_orders.items():
            task_status = self.get_task_status(status_id, tenant_id)
            if task_status:
                task_status.order = order
        self.db.commit()
        return self.get_task_statuses(tenant_id)

    def initialize_default_statuses(self, tenant_id: UUID) -> list[TaskStatus]:
        """Create default system statuses for a tenant if they don't exist."""
        defaults = [
            {
                "name": "todo",
                "type": "open",
                "color": "#9E9E9E",
                "order": 0,
                "is_system": True,
            },
            {
                "name": "in_progress",
                "type": "in_progress",
                "color": "#2196F3",
                "order": 1,
                "is_system": True,
            },
            {
                "name": "done",
                "type": "closed",
                "color": "#4CAF50",
                "order": 2,
                "is_system": True,
            },
        ]
        created = []
        for d in defaults:
            existing = self.db.execute(
                select(TaskStatus).where(
                    and_(
                        TaskStatus.tenant_id == tenant_id,
                        TaskStatus.name == d["name"],
                    )
                )
            ).scalar_one_or_none()
            if existing is None:
                status = TaskStatus(
                    tenant_id=tenant_id,
                    name=d["name"],
                    type=d["type"],
                    color=d["color"],
                    order=d["order"],
                    is_system=d["is_system"],
                )
                self.db.add(status)
                created.append(status)
        if created:
            self.db.commit()
            for s in created:
                self.db.refresh(s)
        return created

    def delete_task_status(self, status_id: UUID, tenant_id: UUID) -> bool:
        """Delete a task status."""
        status = self.get_task_status(status_id, tenant_id)
        if not status:
            return False

        if status.is_system:
            return False

        self.db.delete(status)
        self.db.commit()
        return True


# ============================================================================
# Factory Functions
# ============================================================================


def get_task_file_service(db: Session) -> TaskFileService:
    """Get task file service instance."""
    return TaskFileService(db)


def get_task_tag_service(db: Session) -> TaskTagService:
    """Get task tag service instance."""
    return TaskTagService(db)


def get_task_status_service(db: Session) -> TaskStatusService:
    """Get task status service instance."""
    return TaskStatusService(db)


# ============================================================================
# Task Related Services (Comments, Dependencies, Workflows) - Placeholders
# ============================================================================


class TaskCommentServiceAdapter:
    """Adapter bridging the task comments API to CommentService."""

    def __init__(self, db: Session):
        import html

        from app.core.comments.service import CommentService

        self._service = CommentService(db)
        self._db = db
        self._html = html

    def _sanitize(self, content: str) -> str:
        return self._html.escape(content)

    def _serialize(self, comment, mentions: list | None = None) -> dict:
        return {
            "id": str(comment.id),
            "content": comment.content,
            "user_id": str(comment.created_by),
            "created_by": str(comment.created_by),
            "entity_type": comment.entity_type,
            "entity_id": str(comment.entity_id),
            "is_edited": comment.is_edited,
            "mentions": [str(m) for m in (mentions or [])],
            "created_at": (
                comment.created_at.isoformat() if comment.created_at else None
            ),
            "updated_at": (
                comment.updated_at.isoformat()
                if getattr(comment, "updated_at", None)
                else None
            ),
        }

    def _verify_task_belongs_to_tenant(self, task_id: UUID, tenant_id: UUID) -> None:
        """Raise ValueError if task doesn't exist or doesn't belong to the tenant."""
        task = (
            self._db.query(Task)
            .filter(Task.id == task_id, Task.tenant_id == tenant_id)
            .first()
        )
        if not task:
            raise ValueError(f"Task {task_id} not found")

    def list_comments(self, task_id: UUID, tenant_id: UUID) -> list[dict]:
        """List comments for a task."""
        comments = self._service.get_comments_by_entity(
            entity_type="task", entity_id=task_id, tenant_id=tenant_id
        )
        return [self._serialize(c) for c in comments]

    def add_comment(
        self,
        task_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        content: str,
        mentions: list | None = None,
    ) -> dict:
        """Add a comment to a task."""
        self._verify_task_belongs_to_tenant(task_id, tenant_id)
        sanitized = self._sanitize(content)
        comment_data = {
            "content": sanitized,
            "entity_type": "task",
            "entity_id": task_id,
        }
        comment = self._service.create_comment(comment_data, tenant_id, user_id)
        return self._serialize(comment, mentions)

    def update_comment(
        self,
        task_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        comment_id: str,
        content: str,
    ) -> dict | None:
        """Update a task comment."""
        from uuid import UUID as _UUID

        cid = _UUID(comment_id) if isinstance(comment_id, str) else comment_id
        comment = self._service.update_comment(cid, tenant_id, {"content": content})
        if not comment:
            return None
        return self._serialize(comment)

    def delete_comment(
        self,
        task_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        comment_id: str,
    ) -> bool:
        """Delete a task comment."""
        from uuid import UUID as _UUID

        cid = _UUID(comment_id) if isinstance(comment_id, str) else comment_id
        return self._service.delete_comment(cid, tenant_id)


def get_task_comment_service(
    db: Session | None = None,
) -> "TaskCommentServiceAdapter | None":
    """Get task comment service instance."""
    if db is None:
        return None
    return TaskCommentServiceAdapter(db)


class TaskDependencyService:
    """Service for managing task dependencies."""

    def __init__(self, db: Session):
        from app.core.tasks.models.task_dependency import TaskDependency

        self.db = db
        self._model = TaskDependency

    def get_dependencies(self, task_id: UUID, tenant_id: UUID):
        """Get all tasks that task_id depends on."""
        from sqlalchemy import and_

        return (
            self.db.query(self._model)
            .filter(
                and_(
                    self._model.task_id == task_id,
                    self._model.tenant_id == tenant_id,
                )
            )
            .all()
        )

    def get_dependents(self, task_id: UUID, tenant_id: UUID):
        """Get all tasks that depend on task_id."""
        from sqlalchemy import and_

        return (
            self.db.query(self._model)
            .filter(
                and_(
                    self._model.depends_on_id == task_id,
                    self._model.tenant_id == tenant_id,
                )
            )
            .all()
        )

    def add_dependency(
        self,
        task_id: UUID,
        depends_on_id: UUID,
        tenant_id: UUID,
        dependency_type: str = "finish_to_start",
    ):
        """Add a dependency, raising ValueError if a cycle would be created."""
        if self._would_create_cycle(task_id, depends_on_id, tenant_id):
            raise ValueError(
                "Añadir esta dependencia crearía un ciclo entre las tareas"
            )
        dep = self._model(
            task_id=task_id,
            depends_on_id=depends_on_id,
            tenant_id=tenant_id,
            dependency_type=dependency_type,
        )
        self.db.add(dep)
        self.db.commit()
        self.db.refresh(dep)
        return dep

    def remove_dependency(self, dependency_id: UUID, tenant_id: UUID) -> bool:
        """Remove a dependency by id."""
        dep = (
            self.db.query(self._model)
            .filter(
                self._model.id == dependency_id,
                self._model.tenant_id == tenant_id,
            )
            .first()
        )
        if not dep:
            return False
        self.db.delete(dep)
        self.db.commit()
        return True

    def _would_create_cycle(
        self, task_id: UUID, depends_on_id: UUID, tenant_id: UUID
    ) -> bool:
        """Check if adding task_id→depends_on_id would create a cycle via BFS."""
        # If depends_on_id already depends (directly or transitively) on task_id → cycle
        visited = set()
        queue = [depends_on_id]
        while queue:
            current = queue.pop()
            if current == task_id:
                return True
            if current in visited:
                continue
            visited.add(current)
            children = (
                self.db.query(self._model.depends_on_id)
                .filter(
                    self._model.task_id == current,
                    self._model.tenant_id == tenant_id,
                )
                .all()
            )
            queue.extend(UUID(str(row[0])) for row in children)
        return False


def get_task_dependency_service(
    db: Session | None = None,
) -> "TaskDependencyService | None":
    """Get task dependency service instance."""
    if db is None:
        return None
    return TaskDependencyService(db)


class WorkflowService:
    """Service for managing workflows."""

    def __init__(self, db: Session):
        from app.core.tasks.models import Workflow, WorkflowExecution, WorkflowStep

        self.db = db
        self._workflow = Workflow
        self._step = WorkflowStep
        self._execution = WorkflowExecution

    def create_workflow(
        self,
        name,
        tenant_id,
        description=None,
        definition=None,
        enabled=True,
        metadata=None,
    ):
        from datetime import UTC, datetime

        w = self._workflow(
            name=name,
            tenant_id=tenant_id,
            description=description,
            definition=definition or {},
            enabled=enabled,
            workflow_metadata=metadata,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        self.db.add(w)
        self.db.commit()
        self.db.refresh(w)
        return w

    def get_workflows(self, tenant_id, enabled_only=False, skip=0, limit=20):

        q = self.db.query(self._workflow).filter(self._workflow.tenant_id == tenant_id)
        if enabled_only:
            q = q.filter(self._workflow.enabled.is_(True))
        return q.offset(skip).limit(limit).all()

    def get_workflow(self, workflow_id, tenant_id):
        return (
            self.db.query(self._workflow)
            .filter(
                self._workflow.id == workflow_id, self._workflow.tenant_id == tenant_id
            )
            .first()
        )

    def update_workflow(self, workflow_id, tenant_id, update_dict):
        from datetime import UTC, datetime

        w = self.get_workflow(workflow_id, tenant_id)
        if not w:
            return None
        for k, v in update_dict.items():
            if k == "metadata":
                setattr(w, "workflow_metadata", v)
            else:
                setattr(w, k, v)
        w.updated_at = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(w)
        return w

    def delete_workflow(self, workflow_id, tenant_id):
        w = self.get_workflow(workflow_id, tenant_id)
        if not w:
            return False
        self.db.delete(w)
        self.db.commit()
        return True

    def create_workflow_step(
        self,
        workflow_id,
        tenant_id,
        name,
        step_type,
        order,
        config=None,
        transitions=None,
    ):
        from datetime import UTC, datetime

        s = self._step(
            workflow_id=workflow_id,
            tenant_id=tenant_id,
            name=name,
            step_type=step_type,
            order=order,
            config=config,
            transitions=transitions,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        self.db.add(s)
        self.db.commit()
        self.db.refresh(s)
        return s

    def get_workflow_steps(self, workflow_id, tenant_id):
        return (
            self.db.query(self._step)
            .filter(
                self._step.workflow_id == workflow_id, self._step.tenant_id == tenant_id
            )
            .order_by(self._step.order)
            .all()
        )

    def start_workflow_execution(
        self,
        workflow_id,
        tenant_id,
        entity_type=None,
        entity_id=None,
        execution_data=None,
    ):
        from datetime import UTC, datetime

        e = self._execution(
            workflow_id=workflow_id,
            tenant_id=tenant_id,
            entity_type=entity_type,
            entity_id=entity_id,
            execution_data=execution_data,
            status="running",
            started_at=datetime.now(UTC),
        )
        self.db.add(e)
        self.db.commit()
        self.db.refresh(e)
        return e

    def get_executions(
        self,
        tenant_id,
        workflow_id=None,
        status=None,
        entity_type=None,
        entity_id=None,
        skip=0,
        limit=20,
    ):
        q = self.db.query(self._execution).filter(
            self._execution.tenant_id == tenant_id
        )
        if workflow_id:
            q = q.filter(self._execution.workflow_id == workflow_id)
        if status:
            q = q.filter(self._execution.status == status)
        if entity_type:
            q = q.filter(self._execution.entity_type == entity_type)
        if entity_id:
            q = q.filter(self._execution.entity_id == entity_id)
        return q.offset(skip).limit(limit).all()

    def count_executions(
        self, tenant_id, workflow_id=None, status=None, entity_type=None, entity_id=None
    ):
        return len(
            self.get_executions(
                tenant_id,
                workflow_id,
                status,
                entity_type,
                entity_id,
                skip=0,
                limit=10000,
            )
        )

    def get_execution(self, execution_id, tenant_id):
        return (
            self.db.query(self._execution)
            .filter(
                self._execution.id == execution_id,
                self._execution.tenant_id == tenant_id,
            )
            .first()
        )

    def advance_execution(self, execution_id, tenant_id, action=None):
        from datetime import UTC, datetime

        e = self.get_execution(execution_id, tenant_id)
        if not e:
            return None
        e.status = "completed"
        e.completed_at = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(e)
        return e
