"""TenantModule model for plugin architecture lifecycle management."""

from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db.session import Base


class TenantModuleState(StrEnum):
    """7-state lifecycle for tenant module installation."""

    NOT_INSTALLED = "not_installed"
    INSTALLING = "installing"
    ACTIVE = "active"
    DISABLED = "disabled"
    GRACE_PERIOD = "grace_period"
    EXPORTED = "exported"
    UNINSTALLED = "uninstalled"


class TenantModule(Base):
    """Tracks module installation state and metadata per tenant.

    Represents a module's lifecycle within a specific tenant, including
    installation state, version, tier level, and grace period deadlines.
    """

    __tablename__ = "tenant_modules"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    module: Mapped[str] = mapped_column(String(100), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0.0")
    tier: Mapped[str] = mapped_column(
        String(50), nullable=False, default="basic"
    )  # "basic", "pro", "enterprise"
    state: Mapped[TenantModuleState] = mapped_column(
        Enum(TenantModuleState, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=TenantModuleState.NOT_INSTALLED,
    )

    # Lifecycle timestamps
    installed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    disabled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    grace_deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    exported_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    uninstalled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Custom module data (JSON for extensibility)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSON, nullable=True, default=None
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint("tenant_id", "module", name="uq_tenant_modules"),
    )

    def __repr__(self) -> str:
        return (
            f"<TenantModule(tenant={self.tenant_id}, module={self.module}, "
            f"state={self.state}, version={self.version})>"
        )
