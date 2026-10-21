"""Canonical automation2 AI models — conversations, messages, memories, capabilities, LLM configs, and digest subscriptions."""

from datetime import UTC, datetime
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from app.core.db.session import Base


class AIConversation(Base):
    __tablename__ = "ai_conversations"

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
    channel = Column(String(30), nullable=False, default="embedded_chat")
    status = Column(String(20), nullable=False, default="active")

    VALID_TRANSITIONS: dict[str, set[str]] = {
        "active": {"archived", "deleted"},
        "archived": {"active", "deleted"},
        "deleted": set(),
    }

    def can_transition_to(self, new_status: str) -> bool:
        return new_status in self.VALID_TRANSITIONS.get(self.status, set())

    title = Column(String(255), nullable=True)
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
    archived_at = Column(TIMESTAMP(timezone=True), nullable=True)
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)

    messages = relationship(
        "AIConversationMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )
    memory = relationship(
        "AIConversationMemory",
        back_populates="conversation",
        uselist=False,
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('active','archived','deleted')",
            name="ck_ai_conversations_status",
        ),
        Index(
            "ix_ai_conversations_tenant_user_status", "tenant_id", "user_id", "status"
        ),
        Index("ix_ai_conversations_tenant_updated", "tenant_id", "updated_at"),
    )


class AIConversationMessage(Base):
    __tablename__ = "ai_conversation_messages"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    conversation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("ai_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    message_metadata = Column("metadata", JSONB, nullable=False, default=dict)
    status = Column(String(20), nullable=False, default="complete")
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )

    conversation = relationship("AIConversation", back_populates="messages")

    __table_args__ = (
        CheckConstraint(
            "role IN ('user','assistant','system','tool')",
            name="ck_ai_conversation_messages_role",
        ),
        Index(
            "ix_ai_conversation_messages_conv_created", "conversation_id", "created_at"
        ),
        Index("ix_ai_conversation_messages_tenant", "tenant_id"),
    )


class AIConversationMemory(Base):
    __tablename__ = "ai_conversation_memories"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    conversation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("ai_conversations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    summary = Column(Text, nullable=True)
    goals = Column(JSONB, nullable=False, default=list)
    entities = Column(JSONB, nullable=False, default=list)
    message_count_at_compaction = Column(Integer, nullable=False, default=0)
    last_compacted_at = Column(TIMESTAMP(timezone=True), nullable=True)
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

    conversation = relationship("AIConversation", back_populates="memory")


class AICapabilityRegistration(Base):
    __tablename__ = "ai_capability_registrations"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    module_name = Column(String(100), nullable=False)
    capability_name = Column(String(150), nullable=False)
    qualified_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    permission_required = Column(String(150), nullable=False)
    capability_type = Column(String(30), nullable=False, default="conversational")
    parameters_schema = Column(JSONB, nullable=False, default=dict)
    aliases = Column(JSONB, nullable=False, default=list)
    examples = Column(JSONB, nullable=False, default=list)
    embedding = Column(Vector(1536), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    registered_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "capability_type IN ('conversational','operational','automation','digest')",
            name="ck_ai_capability_registrations_capability_type",
        ),
        UniqueConstraint(
            "qualified_name", name="uq_ai_capability_registrations_qualified_name"
        ),
        Index("ix_ai_capability_registrations_is_active", "is_active"),
    )


class AILLMProviderConfig(Base):
    __tablename__ = "ai_llm_provider_configs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider_type = Column(String(30), nullable=False)
    api_key_encrypted = Column(Text, nullable=False)
    base_url = Column(String(255), nullable=True)
    model_conversation = Column(String(100), nullable=False)
    model_classifier = Column(String(100), nullable=False)
    model_embeddings = Column(String(100), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
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
            "tenant_id",
            "provider_type",
            name="uq_ai_llm_provider_configs_tenant_provider",
        ),
        Index("ix_ai_llm_provider_configs_tenant", "tenant_id"),
    )


class AIConfig(Base):
    """Per-tenant AI configuration settings."""

    __tablename__ = "ai_configs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    cache_ttl_seconds = Column(Integer, nullable=False, default=300)
    rate_limit_max = Column(Integer, nullable=False, default=100)
    rate_limit_window_seconds = Column(Integer, nullable=False, default=3600)
    classification_stages = Column(JSONB, nullable=False, default=list)
    token_budgets = Column(JSONB, nullable=False, default=dict)
    supported_channels = Column(JSONB, nullable=False, default=list)
    pubsub_enabled = Column(Boolean, nullable=False, default=True)
    # SR-008: hard cap on tokens returned by a single capability response
    max_capability_response_tokens = Column(Integer, nullable=False, default=8000)
    # FR-010: message count threshold that triggers memory compaction
    compaction_threshold = Column(Integer, nullable=False, default=20)
    auto_archive_after_days = Column(Integer, nullable=False, default=0)
    hard_delete_after_days = Column(Integer, nullable=False, default=0)
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


class AIDigestSubscription(Base):
    __tablename__ = "ai_digest_subscriptions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    digest_name = Column(String(255), nullable=False)
    schedule = Column(String(20), nullable=False)
    channels = Column(JSONB, nullable=False, default=lambda: ["in-app"])
    params = Column(JSONB, nullable=False, default=dict)
    is_active = Column(Boolean, nullable=False, default=True)
    next_fire_at = Column(TIMESTAMP(timezone=True), nullable=False)
    last_fired_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "schedule IN ('daily','weekly','monthly')",
            name="ck_ai_digest_subscriptions_schedule",
        ),
        Index("ix_ai_digest_subscriptions_tenant_active", "tenant_id", "is_active"),
        Index("ix_ai_digest_subscriptions_next_fire_at", "next_fire_at"),
        Index(
            "uq_ai_digest_subscriptions_user_digest_active",
            "user_id",
            "digest_name",
            unique=True,
            postgresql_where=text("is_active = true"),
        ),
    )


class AIAgentRun(Base):
    __tablename__ = "ai_agent_runs"

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
    conversation_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("ai_conversations.id", ondelete="SET NULL"),
        nullable=True,
    )
    goal = Column(Text, nullable=False)
    plan = Column(JSONB, nullable=True)
    status = Column(String(30), nullable=False, default="planning")
    current_step = Column(Integer, nullable=False, default=0)
    result_summary = Column(Text, nullable=True)
    started_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    token_count = Column(Integer, nullable=False, default=0)
    cost_usd = Column(Numeric(10, 6), nullable=False, default=0)

    steps = relationship(
        "AIAgentPlanStep",
        back_populates="agent_run",
        cascade="all, delete-orphan",
    )
    conversation = relationship("AIConversation")

    __table_args__ = (
        CheckConstraint(
            "status IN ('planning','awaiting_confirmation','executing','completed','failed','cancelled')",
            name="ck_ai_agent_runs_status",
        ),
        Index("ix_ai_agent_runs_tenant_user_status", "tenant_id", "user_id", "status"),
        Index("ix_ai_agent_runs_tenant_started", "tenant_id", "started_at"),
    )


class AIAgentPlanStep(Base):
    __tablename__ = "ai_agent_plan_steps"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    agent_run_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("ai_agent_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    step_index = Column(Integer, nullable=False)
    capability = Column(String(255), nullable=False)
    params = Column(JSONB, nullable=False, default=dict)
    requires_confirmation = Column(Boolean, nullable=False, default=False)
    status = Column(String(20), nullable=False, default="pending")
    result = Column(JSONB, nullable=True)
    error = Column(Text, nullable=True)
    confirmed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)

    agent_run = relationship("AIAgentRun", back_populates="steps")

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','awaiting','confirmed','rejected','completed','failed')",
            name="ck_ai_agent_plan_steps_status",
        ),
        UniqueConstraint(
            "agent_run_id", "step_index", name="uq_ai_agent_plan_steps_run_step"
        ),
    )
