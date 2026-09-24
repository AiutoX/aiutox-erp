"""Module lifecycle events — F8-T05.

Events published during module operations:
- module.installed
- module.enabled
- module.disabled
- module.uninstall.prepared
- module.uninstall.completed
"""

from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ModuleEvent(BaseModel):
    """Base model for module lifecycle events."""

    model_config = ConfigDict(from_attributes=True)

    event_type: str
    module_id: str
    tenant_id: str
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    user_id: str | None = None


class ModuleInstalledEvent(ModuleEvent):
    """Published when module is installed."""

    event_type: str = "module.installed"
    version: str


class ModuleEnabledEvent(ModuleEvent):
    """Published when module is enabled for tenant."""

    event_type: str = "module.enabled"


class ModuleDisabledEvent(ModuleEvent):
    """Published when module is disabled for tenant."""

    event_type: str = "module.disabled"


class ModuleUninstallPreparedEvent(ModuleEvent):
    """Published when uninstall is prepared (backup created).

    F8-T05: Uninstall event publishing (preparation phase)
    """

    event_type: str = "module.uninstall.prepared"
    record_count: int
    backup_id: str


class ModuleUninstallCompletedEvent(ModuleEvent):
    """Published when uninstall is completed.

    F8-T05: Uninstall event publishing (completion phase)
    """

    event_type: str = "module.uninstall.completed"
    deleted_records: dict[str, int]  # table_name -> count
    backup_id: str | None = None


class ModuleEventPublisher:
    """Publishes module lifecycle events for audit trail."""

    def __init__(self, event_bus=None):
        """Initialize with optional event bus (Redis Streams, etc.)."""
        self.event_bus = event_bus

    async def publish_installed(
        self,
        module_id: str,
        tenant_id: UUID,
        version: str,
        user_id: UUID | None = None,
    ) -> None:
        """Publish module installed event."""
        event = ModuleInstalledEvent(
            module_id=module_id,
            tenant_id=str(tenant_id),
            version=version,
            user_id=str(user_id) if user_id else None,
        )
        await self._publish(event)

    async def publish_enabled(
        self,
        module_id: str,
        tenant_id: UUID,
        user_id: UUID | None = None,
    ) -> None:
        """Publish module enabled event."""
        event = ModuleEnabledEvent(
            module_id=module_id,
            tenant_id=str(tenant_id),
            user_id=str(user_id) if user_id else None,
        )
        await self._publish(event)

    async def publish_disabled(
        self,
        module_id: str,
        tenant_id: UUID,
        user_id: UUID | None = None,
    ) -> None:
        """Publish module disabled event."""
        event = ModuleDisabledEvent(
            module_id=module_id,
            tenant_id=str(tenant_id),
            user_id=str(user_id) if user_id else None,
        )
        await self._publish(event)

    async def publish_uninstall_prepared(
        self,
        module_id: str,
        tenant_id: UUID,
        record_count: int,
        backup_id: str,
        user_id: UUID | None = None,
    ) -> None:
        """Publish uninstall prepared event (backup created)."""
        event = ModuleUninstallPreparedEvent(
            module_id=module_id,
            tenant_id=str(tenant_id),
            record_count=record_count,
            backup_id=backup_id,
            user_id=str(user_id) if user_id else None,
        )
        await self._publish(event)

    async def publish_uninstall_completed(
        self,
        module_id: str,
        tenant_id: UUID,
        deleted_records: dict[str, int],
        backup_id: str | None = None,
        user_id: UUID | None = None,
    ) -> None:
        """Publish uninstall completed event."""
        event = ModuleUninstallCompletedEvent(
            module_id=module_id,
            tenant_id=str(tenant_id),
            deleted_records=deleted_records,
            backup_id=backup_id,
            user_id=str(user_id) if user_id else None,
        )
        await self._publish(event)

    async def _publish(self, event: ModuleEvent) -> None:
        """Internal method to publish event to event bus.

        If no event bus is configured, event is logged only.
        """
        event_dict = event.model_dump(mode="python")

        if self.event_bus:
            await self.event_bus.publish(
                channel=f"module:{event.event_type}",
                message=event_dict,
            )
        else:
            # Log event if no event bus
            import logging

            logger = logging.getLogger(__name__)
            logger.info(f"Module event: {event.event_type} - {event_dict}")
