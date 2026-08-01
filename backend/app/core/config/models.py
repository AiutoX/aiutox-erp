"""Canonical config models — theme presets, system configs, config versions."""

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.core.db.session import Base


class ThemePreset(Base):
    """ThemePreset model for storing theme presets per tenant."""

    __tablename__ = "theme_presets"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Tenant ID for multi-tenancy isolation",
    )
    name = Column(String(255), nullable=False, comment="Preset name")
    description = Column(Text, nullable=True, comment="Optional description")
    config = Column(JSONB, nullable=False, comment="Theme configuration dictionary")
    is_default = Column(Boolean, default=False, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)
    created_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_theme_presets_system", "is_system", "name"),
        Index("idx_theme_presets_tenant", "tenant_id", "is_default"),
    )

    def __repr__(self) -> str:
        return (
            f"<ThemePreset(id={self.id}, tenant_id={self.tenant_id}, "
            f"name={self.name}, is_default={self.is_default})>"
        )


class SystemConfig(Base):
    """SystemConfig model for storing module-specific configuration per tenant."""

    __tablename__ = "system_configs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    module = Column(String(100), nullable=False, index=True)
    key = Column(String(255), nullable=False)
    value = Column(JSONB, nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "module", "key", name="uq_system_configs_tenant_module_key"
        ),
        Index("idx_system_configs_tenant_module", "tenant_id", "module"),
    )

    def __repr__(self) -> str:
        return (
            f"<SystemConfig(id={self.id}, tenant_id={self.tenant_id}, "
            f"module={self.module}, key={self.key})>"
        )


class ConfigVersion(Base):
    """ConfigVersion model for tracking configuration changes over time."""

    __tablename__ = "config_versions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    config_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("system_configs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    module = Column(String(100), nullable=False, index=True)
    key = Column(String(200), nullable=False, index=True)
    value = Column(JSONB, nullable=False)
    version_number = Column(Integer, nullable=False)
    change_type = Column(String(20), nullable=False)
    changed_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    change_reason = Column(Text, nullable=True)
    change_metadata = Column(JSONB, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )

    config = relationship("SystemConfig", foreign_keys=[config_id])

    __table_args__ = (
        Index("ix_config_versions_tenant_module", "tenant_id", "module"),
        Index("ix_config_versions_config_version", "config_id", "version_number"),
        Index("ix_config_versions_tenant_module_key", "tenant_id", "module", "key"),
    )

    def __repr__(self) -> str:
        return (
            f"<ConfigVersion(id={self.id}, module={self.module}, "
            f"key={self.key}, version={self.version_number})>"
        )


__all__ = ["ConfigVersion", "SystemConfig", "ThemePreset"]
