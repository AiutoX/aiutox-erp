"""Task module events - PubSub integration and webhook registry."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from app.core.integrations.event_registry import (
    EventCategory,
    ModuleEventRegistry,
    WebhookEvent,
)
from app.core.logging import get_logger
from app.core.pubsub.client import RedisStreamsClient
from app.core.pubsub.errors import PubSubError

logger = get_logger(__name__)


class TaskEventPublisher:
    """Task event publisher using Redis streams."""

    def __init__(self, redis_client: RedisStreamsClient | None = None):
        """Initialize event publisher."""
        if redis_client is None:
            import os

            redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
            redis_password = os.getenv("REDIS_PASSWORD", "")
            redis_client = RedisStreamsClient(
                redis_url=redis_url, password=redis_password
            )
        self.redis_client = redis_client

    async def publish_task_event(
        self,
        event_type: str,
        task_id: UUID,
        tenant_id: UUID,
        user_id: UUID | None = None,
        data: dict[str, Any] | None = None,
    ) -> bool:
        """Publish a task event to Redis streams.

        Args:
            event_type: Type of event (e.g., 'task.created', 'task.updated')
            task_id: Task ID
            tenant_id: Tenant ID
            user_id: User ID who triggered the event
            data: Additional event data

        Returns:
            True if published successfully, False otherwise
        """
        try:
            event_data = {
                "event_type": event_type,
                "task_id": str(task_id),
                "tenant_id": str(tenant_id),
                "timestamp": datetime.now(UTC).isoformat(),
                "source": "tasks",
            }

            if user_id:
                event_data["user_id"] = str(user_id)

            if data:
                event_data.update(data)

            # Publish to task events stream
            await self.redis_client.publish("task_events", event_type, event_data)

            # Also publish to tenant-specific stream for filtering
            await self.redis_client.publish(
                f"tenant_{tenant_id}_tasks", event_type, event_data
            )

            logger.info(f"Published task event: {event_type} for task {task_id}")
            return True

        except PubSubError as e:
            logger.error(f"Failed to publish task event {event_type}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error publishing task event {event_type}: {e}")
            return False

    async def publish_task_created(
        self,
        task_id: UUID,
        tenant_id: UUID,
        created_by_id: UUID,
        task_data: dict[str, Any],
    ) -> bool:
        """Publish task created event."""
        return await self.publish_task_event(
            "task.created",
            task_id,
            tenant_id,
            created_by_id,
            {"task_data": task_data},
        )

    async def publish_task_updated(
        self,
        task_id: UUID,
        tenant_id: UUID,
        updated_by_id: UUID,
        changes: dict[str, Any],
    ) -> bool:
        """Publish task updated event."""
        return await self.publish_task_event(
            "task.updated",
            task_id,
            tenant_id,
            updated_by_id,
            {"changes": changes},
        )

    async def publish_task_deleted(
        self, task_id: UUID, tenant_id: UUID, deleted_by_id: UUID
    ) -> bool:
        """Publish task deleted event."""
        return await self.publish_task_event(
            "task.deleted",
            task_id,
            tenant_id,
            deleted_by_id,
        )

    async def publish_task_status_changed(
        self,
        task_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
        old_status: str,
        new_status: str,
    ) -> bool:
        """Publish task status changed event."""
        return await self.publish_task_event(
            "task.status_changed",
            task_id,
            tenant_id,
            user_id,
            {"old_status": old_status, "new_status": new_status},
        )

    async def publish_task_assigned(
        self, task_id: UUID, tenant_id: UUID, assigned_by_id: UUID, assigned_to_id: UUID
    ) -> bool:
        """Publish task assigned event."""
        return await self.publish_task_event(
            "task.assigned",
            task_id,
            tenant_id,
            assigned_by_id,
            {"assigned_to_id": str(assigned_to_id)},
        )

    async def publish_task_completed(
        self, task_id: UUID, tenant_id: UUID, completed_by_id: UUID
    ) -> bool:
        """Publish task completed event."""
        return await self.publish_task_event(
            "task.completed",
            task_id,
            tenant_id,
            completed_by_id,
        )


# Global event publisher instance
_task_event_publisher: TaskEventPublisher | None = None


def get_task_event_publisher() -> TaskEventPublisher:
    """Get global task event publisher instance."""
    global _task_event_publisher
    if _task_event_publisher is None:
        _task_event_publisher = TaskEventPublisher()
    return _task_event_publisher


def get_task_events() -> ModuleEventRegistry:
    """Get task module webhook events.

    Returns:
        ModuleEventRegistry with all task events
    """
    return ModuleEventRegistry(
        module_name="tasks",
        display_name="Tareas",
        description="Eventos del módulo de gestión de tareas",
        events=[
            # Lifecycle events
            WebhookEvent(
                type="task.created",
                description="Tarea creada",
                category=EventCategory.LIFECYCLE,
            ),
            WebhookEvent(
                type="task.updated",
                description="Tarea actualizada",
                category=EventCategory.LIFECYCLE,
            ),
            WebhookEvent(
                type="task.deleted",
                description="Tarea eliminada",
                category=EventCategory.LIFECYCLE,
            ),
            # Status events
            WebhookEvent(
                type="task.status_changed",
                description="Estado de tarea cambiado",
                category=EventCategory.STATUS,
            ),
            WebhookEvent(
                type="task.completed",
                description="Tarea completada",
                category=EventCategory.STATUS,
            ),
            WebhookEvent(
                type="task.cancelled",
                description="Tarea cancelada",
                category=EventCategory.STATUS,
            ),
            # Interaction events
            WebhookEvent(
                type="task.assigned",
                description="Tarea asignada a usuario",
                category=EventCategory.INTERACTION,
            ),
            WebhookEvent(
                type="task.unassigned",
                description="Tarea desasignada",
                category=EventCategory.INTERACTION,
            ),
            WebhookEvent(
                type="task.comment_added",
                description="Comentario agregado a tarea",
                category=EventCategory.INTERACTION,
            ),
            WebhookEvent(
                type="task.comment_updated",
                description="Comentario actualizado",
                category=EventCategory.INTERACTION,
            ),
            WebhookEvent(
                type="task.comment_deleted",
                description="Comentario eliminado",
                category=EventCategory.INTERACTION,
            ),
            WebhookEvent(
                type="task.user_mentioned",
                description="Usuario mencionado en comentario",
                category=EventCategory.INTERACTION,
            ),
            WebhookEvent(
                type="task.file_attached",
                description="Archivo adjuntado a tarea",
                category=EventCategory.INTERACTION,
            ),
            WebhookEvent(
                type="task.file_removed",
                description="Archivo removido de tarea",
                category=EventCategory.INTERACTION,
            ),
            # System events
            WebhookEvent(
                type="task.due_soon",
                description="Tarea próxima a vencer",
                category=EventCategory.SYSTEM,
            ),
            WebhookEvent(
                type="task.overdue",
                description="Tarea vencida",
                category=EventCategory.SYSTEM,
            ),
            WebhookEvent(
                type="task.calendar_synced",
                description="Tarea sincronizada con calendario",
                category=EventCategory.SYSTEM,
            ),
            WebhookEvent(
                type="task.calendar_unsynced",
                description="Tarea desincronizada de calendario",
                category=EventCategory.SYSTEM,
            ),
            WebhookEvent(
                type="task.calendar_updated",
                description="Evento de calendario actualizado",
                category=EventCategory.SYSTEM,
            ),
        ],
    )


def get_task_event_sync_service():
    """Get task event sync service - placeholder."""
    return None
