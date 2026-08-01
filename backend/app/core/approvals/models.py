"""Approval models for approval workflows."""

from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.core.db.session import Base


class ApprovalFlow(Base):
    """Approval flow definition (template for reusable approval workflows)."""

    __tablename__ = "approval_flows"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    flow_type = Column(String(20), nullable=False, default="sequential")
    module = Column(String(50), nullable=False, default="generic")
    conditions = Column(JSONB, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)
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

    steps = relationship(
        "ApprovalStep", back_populates="flow", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_approval_flows_tenant", "tenant_id"),
        Index("idx_approval_flows_tenant_module", "tenant_id", "module"),
    )

    def __repr__(self) -> str:
        return f"<ApprovalFlow(id={self.id}, name={self.name})>"


class ApprovalStep(Base):
    """A step in an approval flow."""

    __tablename__ = "approval_steps"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    flow_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("approval_flows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    step_order = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    approver_type = Column(String(20), nullable=False)
    approver_id = Column(PG_UUID(as_uuid=True), nullable=True)
    approver_role = Column(String(50), nullable=True)
    approver_rule = Column(JSONB, nullable=True)
    require_all = Column(Boolean, nullable=False, default=False)
    min_approvals = Column(Integer, nullable=True)
    form_schema = Column(JSONB, nullable=True)
    print_config = Column(JSONB, nullable=True)
    rejection_required = Column(Boolean, nullable=False, default=False)
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

    flow = relationship("ApprovalFlow", back_populates="steps")

    __table_args__ = (Index("idx_approval_steps_flow_order", "flow_id", "step_order"),)

    def __repr__(self) -> str:
        return (
            f"<ApprovalStep(id={self.id}, flow_id={self.flow_id}, "
            f"order={self.step_order})>"
        )


class ApprovalRequest(Base):
    """An approval request for a specific entity."""

    __tablename__ = "approval_requests"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    flow_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("approval_flows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(PG_UUID(as_uuid=True), nullable=False)
    status = Column(String(20), nullable=False, default="pending", index=True)
    current_step = Column(Integer, nullable=False, default=1)
    requested_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    request_metadata = Column("metadata", JSONB, nullable=True)
    requested_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)
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

    actions = relationship(
        "ApprovalAction", back_populates="request", cascade="all, delete-orphan"
    )
    delegations = relationship(
        "ApprovalDelegation", back_populates="request", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_approval_requests_entity", "entity_type", "entity_id"),
        Index("idx_approval_requests_status", "tenant_id", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<ApprovalRequest(id={self.id}, title={self.title}, status={self.status})>"
        )


class ApprovalAction(Base):
    """An action taken on an approval request."""

    __tablename__ = "approval_actions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    request_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("approval_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action_type = Column(String(20), nullable=False)
    step_order = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    form_data = Column(JSONB, nullable=True)
    request_metadata = Column(JSONB, nullable=True)
    acted_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    acted_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )

    request = relationship("ApprovalRequest", back_populates="actions")

    def __repr__(self) -> str:
        return f"<ApprovalAction(id={self.id}, type={self.action_type})>"


class ApprovalDelegation(Base):
    """Delegation of approval authority."""

    __tablename__ = "approval_delegations"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    request_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("approval_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    to_user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reason = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=True)
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

    request = relationship("ApprovalRequest", back_populates="delegations")

    def __repr__(self) -> str:
        return f"<ApprovalDelegation(id={self.id})>"


class ApprovalStatus(StrEnum):
    """Approval status enumeration."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class Approval(Base):
    """Simple approval model (legacy / backward compat)."""

    __tablename__ = "approvals"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        String(20),
        nullable=False,
        default=ApprovalStatus.PENDING,
        index=True,
    )
    requested_by_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    requested_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    approver_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    approved_at = Column(TIMESTAMP(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    amount = Column(Numeric(15, 2), nullable=True)
    currency = Column(String(3), nullable=True, default="USD")
    due_date = Column(Date, nullable=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(PG_UUID(as_uuid=True), nullable=True)
    context = Column(JSONB, nullable=True)
    approval_metadata = Column(JSONB, nullable=True)
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

    def __repr__(self) -> str:
        return f"<Approval(id={self.id}, title={self.title}, status={self.status})>"
