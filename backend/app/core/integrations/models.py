"""Canonical Integration models — integrations, webhooks, and deliveries."""

from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as POSTGRES_UUID
from sqlalchemy.orm import relationship

from app.core.db.session import Base


class IntegrationType(StrEnum):
    STRIPE = "stripe"
    TWILIO = "twilio"
    GOOGLE_CALENDAR = "google_calendar"
    SLACK = "slack"
    ZAPIER = "zapier"
    WEBHOOK = "webhook"
    CUSTOM = "custom"


class IntegrationStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    PENDING = "pending"


class WebhookStatus(StrEnum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(POSTGRES_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(POSTGRES_UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    status = Column(
        String(20), nullable=False, default=IntegrationStatus.INACTIVE.value
    )
    config = Column(JSON, nullable=False, default=dict)
    credentials = Column(Text, nullable=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Integration(id={self.id}, name={self.name}, type={self.type}, status={self.status})>"


class Webhook(Base):
    __tablename__ = "webhooks"

    id = Column(POSTGRES_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(POSTGRES_UUID(as_uuid=True), nullable=False, index=True)
    integration_id = Column(
        POSTGRES_UUID(as_uuid=True),
        ForeignKey("integrations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name = Column(String(255), nullable=False)
    url = Column(String(1000), nullable=False)
    event_type = Column(String(100), nullable=False, index=True)
    enabled = Column(Boolean, nullable=False, default=True, index=True)
    method = Column(String(10), nullable=False, default="POST")
    headers = Column(JSON, nullable=True)
    secret = Column(String(255), nullable=True)
    max_retries = Column(Integer, nullable=False, default=3)
    retry_delay = Column(Integer, nullable=False, default=60)
    extra_data = Column("metadata", JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
    integration = relationship("Integration", backref="webhooks")
    deliveries = relationship(
        "WebhookDelivery", back_populates="webhook", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Webhook(id={self.id}, name={self.name}, event_type={self.event_type}, enabled={self.enabled})>"


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"

    id = Column(POSTGRES_UUID(as_uuid=True), primary_key=True, default=uuid4)
    webhook_id = Column(
        POSTGRES_UUID(as_uuid=True),
        ForeignKey("webhooks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = Column(POSTGRES_UUID(as_uuid=True), nullable=False, index=True)
    status = Column(
        String(20), nullable=False, default=WebhookStatus.PENDING.value, index=True
    )
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    response_status = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    sent_at = Column(DateTime(timezone=True), nullable=True)
    webhook = relationship("Webhook", back_populates="deliveries")

    def __repr__(self) -> str:
        return f"<WebhookDelivery(id={self.id}, webhook_id={self.webhook_id}, status={self.status})>"


class ChannelIdentity(Base):
    __tablename__ = "channel_identities"

    id = Column(POSTGRES_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        POSTGRES_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    channel = Column(String(30), nullable=False)
    channel_user_id = Column(String(255), nullable=False)
    user_id = Column(
        POSTGRES_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "channel",
            "channel_user_id",
            name="uq_channel_identities_tenant_channel_user",
        ),
        Index(
            "ix_channel_identities_tenant_channel_user",
            "tenant_id",
            "channel",
            "channel_user_id",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<ChannelIdentity(id={self.id}, channel={self.channel}, "
            f"channel_user_id={self.channel_user_id})>"
        )
