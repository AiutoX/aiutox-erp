"""Import/Export module PubSub event publisher."""

from uuid import UUID

from app.core.integrations.event_registry import (
    EventCategory,
    ModuleEventRegistry,
    WebhookEvent,
)
from app.core.pubsub.event_helpers import safe_publish_event
from app.core.pubsub.publisher import EventPublisher

# Event type constants
IMPORT_STARTED = "import.started"
IMPORT_COMPLETED = "import.completed"
IMPORT_FAILED = "import.failed"
EXPORT_STARTED = "export.started"
EXPORT_COMPLETED = "export.completed"
EXPORT_FAILED = "export.failed"

ALL_IMPORT_EXPORT_EVENTS = [
    IMPORT_STARTED,
    IMPORT_COMPLETED,
    IMPORT_FAILED,
    EXPORT_STARTED,
    EXPORT_COMPLETED,
    EXPORT_FAILED,
]


def get_import_export_events() -> ModuleEventRegistry:
    """Get import/export module webhook events."""
    return ModuleEventRegistry(
        module_name="import_export",
        display_name="Importación/Exportación",
        description="Eventos del módulo de importación y exportación de datos",
        events=[
            WebhookEvent(
                type=IMPORT_STARTED,
                description="Importación iniciada",
                category=EventCategory.LIFECYCLE,
            ),
            WebhookEvent(
                type=IMPORT_COMPLETED,
                description="Importación completada",
                category=EventCategory.STATUS,
            ),
            WebhookEvent(
                type=IMPORT_FAILED,
                description="Importación fallida",
                category=EventCategory.STATUS,
            ),
            WebhookEvent(
                type=EXPORT_STARTED,
                description="Exportación iniciada",
                category=EventCategory.LIFECYCLE,
            ),
            WebhookEvent(
                type=EXPORT_COMPLETED,
                description="Exportación completada",
                category=EventCategory.STATUS,
            ),
            WebhookEvent(
                type=EXPORT_FAILED,
                description="Exportación fallida",
                category=EventCategory.STATUS,
            ),
        ],
    )


class ImportExportEventPublisher:
    """Publishes import/export-related domain events to PubSub."""

    def __init__(self, event_publisher: EventPublisher):
        self.event_publisher = event_publisher

    def publish_import_started(
        self,
        import_job_id: UUID,
        module: str,
        file_name: str,
        tenant_id: UUID,
        user_id: UUID,
    ) -> None:
        """Publish import.started event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=IMPORT_STARTED,
            entity_type="import_job",
            entity_id=import_job_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata={
                "module": module,
                "file_name": file_name,
            },
        )

    def publish_import_completed(
        self,
        import_job_id: UUID,
        module: str,
        total_rows: int,
        successful_rows: int,
        failed_rows: int,
        tenant_id: UUID,
        user_id: UUID,
    ) -> None:
        """Publish import.completed event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=IMPORT_COMPLETED,
            entity_type="import_job",
            entity_id=import_job_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata={
                "module": module,
                "total_rows": total_rows,
                "successful_rows": successful_rows,
                "failed_rows": failed_rows,
            },
        )

    def publish_import_failed(
        self,
        import_job_id: UUID,
        module: str,
        error: str,
        tenant_id: UUID,
        user_id: UUID,
    ) -> None:
        """Publish import.failed event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=IMPORT_FAILED,
            entity_type="import_job",
            entity_id=import_job_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata={
                "module": module,
                "error": error,
            },
        )

    def publish_export_started(
        self,
        export_job_id: UUID,
        module: str,
        export_format: str,
        tenant_id: UUID,
        user_id: UUID,
    ) -> None:
        """Publish export.started event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=EXPORT_STARTED,
            entity_type="export_job",
            entity_id=export_job_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata={
                "module": module,
                "export_format": export_format,
            },
        )

    def publish_export_completed(
        self,
        export_job_id: UUID,
        module: str,
        export_format: str,
        total_rows: int,
        file_size: int | None,
        tenant_id: UUID,
        user_id: UUID,
    ) -> None:
        """Publish export.completed event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=EXPORT_COMPLETED,
            entity_type="export_job",
            entity_id=export_job_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata={
                "module": module,
                "export_format": export_format,
                "total_rows": total_rows,
                "file_size": file_size,
            },
        )

    def publish_export_failed(
        self,
        export_job_id: UUID,
        module: str,
        error: str,
        tenant_id: UUID,
        user_id: UUID,
    ) -> None:
        """Publish export.failed event."""
        safe_publish_event(
            event_publisher=self.event_publisher,
            event_type=EXPORT_FAILED,
            entity_type="export_job",
            entity_id=export_job_id,
            tenant_id=tenant_id,
            user_id=user_id,
            metadata={
                "module": module,
                "error": error,
            },
        )
