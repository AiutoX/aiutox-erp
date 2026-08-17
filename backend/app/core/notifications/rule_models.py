"""Notification rule models — configurable routing for event-driven notifications."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.core.db.session import Base


class NotificationRuleTemplate(Base):
    """Tenant-level notification rule template.

    Defines default routing for an event_type with wildcard support.
    Wildcards: "module.*", "*.action", "*" (catch-all).
    """

    __tablename__ = "notification_rule_templates"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type = Column(String(200), nullable=False)
    context_type = Column(String(50), nullable=False, default="any")
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    default_notify_roles = Column(JSONB, nullable=False, default=list)
    default_notify_users = Column(JSONB, nullable=False, default=list)
    default_channels = Column(JSONB, nullable=False, default=list)
    auto_create_purchase_request = Column(Boolean, nullable=False, default=False)

    created_by = Column(PG_UUID(as_uuid=True), nullable=False)
    updated_by = Column(PG_UUID(as_uuid=True), nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_nrt_tenant", "tenant_id"),
        Index("idx_nrt_event_type", "event_type"),
        Index("idx_nrt_tenant_event", "tenant_id", "event_type"),
    )


class NotificationRuleOverride(Base):
    """Property/Building-level override of a notification rule template.

    NULL values mean "use the template default for this field".
    """

    __tablename__ = "notification_rule_overrides"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    template_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("notification_rule_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    context_type = Column(String(50), nullable=False)
    context_id = Column(PG_UUID(as_uuid=True), nullable=False)

    notify_roles = Column(JSONB, nullable=True)
    notify_users = Column(JSONB, nullable=True)
    channels = Column(JSONB, nullable=True)
    auto_create_purchase_request = Column(Boolean, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_by = Column(PG_UUID(as_uuid=True), nullable=False)
    updated_by = Column(PG_UUID(as_uuid=True), nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    __table_args__ = (
        Index("idx_nro_tenant", "tenant_id"),
        Index("idx_nro_template", "template_id"),
        Index("idx_nro_context", "context_type", "context_id"),
    )
