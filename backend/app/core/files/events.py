"""Files module PubSub event publisher."""

from uuid import UUID

from app.core.integrations.event_registry import (
    EventCategory,
    ModuleEventRegistry,
    WebhookEvent,
)
from app.core.pubsub.event_helpers import safe_publish_event
from app.core.pubsub.publisher import EventPublisher

# Event type constants
FILE_UPLOADED = "file.uploaded"
FILE_DELETED = "file.deleted"
FILE_PERMANENTLY_DELETED = "file.permanently_deleted"
FILE_RESTORED = "file.restored"
FILE_ACCESSED = "file.accessed"

ALL_FILE_EVENTS = [
    FILE_UPLOADED,
    FILE_DELETED,
    FILE_PERMANENTLY_DELETED,
    FILE_RESTORED,
    FILE_ACCESSED,
]


class FileEventPublisher:
    """Publishes file-related domain events to PubSub."""

    def __init__(self, event_publisher: EventPublisher):
        self.event_publisher = event_publisher

    def publish_file_uploaded(
        self,
        file_id: UUID,
        filename: str,
        file_size: int,
        tenant_id: UUID,
        user_id: UUID,
        entity_type: str | None = None,
        entity_id: UUID | None = None,
    ) -> None:
        """Publish file.uploaded event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=FILE_UPLOADED,
            entity_type="file",
            entity_id=file_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata={
                "filename": filename,
                "file_size": file_size,
                "entity_type": entity_type,
                "entity_id": str(entity_id) if entity_id else None,
            },
        )

    def publish_file_deleted(
        self,
        file_id: UUID,
        filename: str,
        tenant_id: UUID,
        user_id: UUID,
    ) -> None:
        """Publish file.deleted event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=FILE_DELETED,
            entity_type="file",
            entity_id=file_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata={"filename": filename},
        )

    def publish_file_permanently_deleted(
        self,
        file_id: UUID,
        filename: str,
        tenant_id: UUID,
    ) -> None:
        """Publish file.permanently_deleted event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=FILE_PERMANENTLY_DELETED,
            entity_type="file",
            entity_id=file_id,
            tenant_id=tenant_id,
            metadata={"filename": filename},
        )

    def publish_file_restored(
        self,
        file_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
    ) -> None:
        """Publish file.restored event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=FILE_RESTORED,
            entity_type="file",
            entity_id=file_id,
            tenant_id=tenant_id,
            user_id=user_id,
        )

    def publish_file_accessed(
        self,
        file_id: UUID,
        filename: str,
        tenant_id: UUID,
        user_id: UUID,
    ) -> None:
        """Publish file.accessed event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=FILE_ACCESSED,
            entity_type="file",
            entity_id=file_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata={"filename": filename},
        )


# ─── Event registry helper ────────────────────────────────────────────────────


def get_file_events() -> ModuleEventRegistry:
    """Return the event registry for the files module."""
    return ModuleEventRegistry(
        module_name="files",
        display_name="Archivos",
        description="Eventos del módulo de gestión de archivos",
        events=[
            WebhookEvent(
                type=FILE_UPLOADED,
                description="Se subió un archivo",
                category=EventCategory.LIFECYCLE,
            ),
            WebhookEvent(
                type=FILE_DELETED,
                description="Se eliminó (soft-delete) un archivo",
                category=EventCategory.LIFECYCLE,
            ),
            WebhookEvent(
                type=FILE_PERMANENTLY_DELETED,
                description="Se eliminó permanentemente un archivo",
                category=EventCategory.LIFECYCLE,
            ),
            WebhookEvent(
                type=FILE_RESTORED,
                description="Se restauró un archivo eliminado",
                category=EventCategory.LIFECYCLE,
            ),
            WebhookEvent(
                type=FILE_ACCESSED,
                description="Se accedió/descargó un archivo",
                category=EventCategory.INTERACTION,
            ),
        ],
    )
