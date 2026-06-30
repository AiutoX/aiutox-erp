"""Canonical Mention models."""

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.core.db.session import Base


class Mention(Base):
    """Mention model for @user mentions in polymorphic entities."""

    __tablename__ = "mentions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mencionable_type = Column(String(50), nullable=False, index=True)
    mencionable_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    resolved = Column(Boolean, default=False, nullable=False, index=True)
    notification_sent = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    resolved_at = Column(TIMESTAMP(timezone=True), nullable=True)
    updated_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_mentions_entity", "mencionable_type", "mencionable_id"),
        Index(
            "idx_mentions_user_entity",
            "tenant_id",
            "user_id",
            "mencionable_type",
            "mencionable_id",
            unique=True,
        ),
        Index(
            "idx_mentions_tenant_entity",
            "tenant_id",
            "mencionable_type",
            "mencionable_id",
        ),
        Index("idx_mentions_user_resolved", "user_id", "resolved"),
    )

    def __repr__(self) -> str:
        return (
            f"<Mention(id={self.id}, user_id={self.user_id}, "
            f"entity={self.mencionable_type}:{self.mencionable_id}, "
            f"resolved={self.resolved})>"
        )


__all__ = ["Mention"]
