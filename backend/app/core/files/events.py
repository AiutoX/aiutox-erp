"""Files module PubSub event publisher."""

from dataclasses import dataclass
from dataclasses import field as dc_field
from uuid import UUID

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


@dataclass
class _FileEventDef:
    type: str
    description: str
    category: str


@dataclass
class _FileEventRegistry:
    module_name: str
    events: list[_FileEventDef] = dc_field(default_factory=list)


def get_file_events() -> _FileEventRegistry:
    """Return the event registry for the files module."""
    return _FileEventRegistry(
        module_name="files",
        events=[
            _FileEventDef(FILE_UPLOADED, "A file was uploaded", "storage"),
            _FileEventDef(FILE_DELETED, "A file was soft-deleted", "storage"),
            _FileEventDef(
                FILE_PERMANENTLY_DELETED, "A file was permanently deleted", "storage"
            ),
            _FileEventDef(FILE_RESTORED, "A deleted file was restored", "storage"),
            _FileEventDef(FILE_ACCESSED, "A file was accessed/downloaded", "access"),
        ],
    )
