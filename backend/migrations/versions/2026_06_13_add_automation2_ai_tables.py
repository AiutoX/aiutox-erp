"""add_automation2_ai_tables

Revision ID: 2026_06_13_add_automation2_ai_tables
Revises: 2026_06_10_add_wo_reassignment_history
Create Date: 2026-06-13 00:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "2026_06_13_add_automation2_ai_tables"
down_revision: Union[str, None] = "2026_06_10_add_wo_reassignment_history"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension — graceful fallback if not installed on this server
    op.execute(
        """
        DO $$
        BEGIN
            CREATE EXTENSION IF NOT EXISTS vector;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'pgvector extension not available on this server: %', SQLERRM;
        END;
        $$
        """
    )

    # 1. ai_conversations
    op.create_table(
        "ai_conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel", sa.String(30), nullable=False, server_default="embedded_chat"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("archived_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('active','archived','deleted')", name="ck_ai_conversations_status"),
    )
    op.create_index("ix_ai_conversations_tenant_id", "ai_conversations", ["tenant_id"])
    op.create_index("ix_ai_conversations_user_id", "ai_conversations", ["user_id"])
    op.create_index("ix_ai_conversations_tenant_user_status", "ai_conversations", ["tenant_id", "user_id", "status"])
    op.create_index("ix_ai_conversations_tenant_updated", "ai_conversations", ["tenant_id", "updated_at"])

    # 2. ai_conversation_messages
    op.create_table(
        "ai_conversation_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(20), nullable=False, server_default="complete"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("role IN ('user','assistant','system','tool')", name="ck_ai_conversation_messages_role"),
    )
    op.create_index("ix_ai_conversation_messages_tenant", "ai_conversation_messages", ["tenant_id"])
    op.create_index("ix_ai_conversation_messages_conversation_id", "ai_conversation_messages", ["conversation_id"])
    op.create_index("ix_ai_conversation_messages_conv_created", "ai_conversation_messages", ["conversation_id", "created_at"])
    op.create_index("ix_ai_conversation_messages_created_at", "ai_conversation_messages", ["created_at"])

    # 3. ai_conversation_memories
    op.create_table(
        "ai_conversation_memories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("goals", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("entities", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("message_count_at_compaction", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_compacted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("conversation_id", name="uq_ai_conversation_memories_conversation_id"),
    )
    op.create_index("ix_ai_conversation_memories_tenant", "ai_conversation_memories", ["tenant_id"])
    op.create_index("ix_ai_conversation_memories_conversation_id", "ai_conversation_memories", ["conversation_id"])

    # 4. ai_capability_registrations (global — no tenant_id)
    op.create_table(
        "ai_capability_registrations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("module_name", sa.String(100), nullable=False),
        sa.Column("capability_name", sa.String(150), nullable=False),
        sa.Column("qualified_name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("permission_required", sa.String(150), nullable=False),
        sa.Column("capability_type", sa.String(30), nullable=False, server_default="conversational"),
        sa.Column("parameters_schema", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("aliases", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("examples", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("embedding", sa.Text(), nullable=True),  # placeholder; real type set via raw SQL below
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("registered_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("capability_type IN ('conversational','operational','automation')", name="ck_ai_capability_registrations_capability_type"),
        sa.UniqueConstraint("qualified_name", name="uq_ai_capability_registrations_qualified_name"),
    )
    op.create_index("ix_ai_capability_registrations_is_active", "ai_capability_registrations", ["is_active"])

    # Replace placeholder embedding column with vector type if pgvector is available
    op.execute(
        """
        DO $$
        BEGIN
            ALTER TABLE ai_capability_registrations DROP COLUMN embedding;
            ALTER TABLE ai_capability_registrations ADD COLUMN embedding vector(1536);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'pgvector not available; embedding column remains TEXT (nullable): %', SQLERRM;
        END;
        $$
        """
    )

    # 5. ai_llm_provider_configs
    op.create_table(
        "ai_llm_provider_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider_type", sa.String(30), nullable=False),
        sa.Column("api_key_encrypted", sa.Text(), nullable=False),
        sa.Column("model_conversation", sa.String(100), nullable=False),
        sa.Column("model_classifier", sa.String(100), nullable=False),
        sa.Column("model_embeddings", sa.String(100), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("tenant_id", "provider_type", name="uq_ai_llm_provider_configs_tenant_provider"),
    )
    op.create_index("ix_ai_llm_provider_configs_tenant", "ai_llm_provider_configs", ["tenant_id"])

    # Vector index — only created if pgvector is available (embedding column is vector type)
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_extension WHERE extname = 'vector'
            ) THEN
                CREATE INDEX IF NOT EXISTS ix_ai_capability_registrations_embedding
                    ON ai_capability_registrations USING ivfflat (embedding vector_cosine_ops) WITH (lists=100);
            END IF;
        END;
        $$
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_ai_capability_registrations_embedding")
    op.drop_table("ai_llm_provider_configs")
    op.drop_table("ai_capability_registrations")
    op.drop_table("ai_conversation_memories")
    op.drop_table("ai_conversation_messages")
    op.drop_table("ai_conversations")
    # No DROP EXTENSION vector — it may be used by other tables
