"""add_ai_configs_table

Revision ID: 2026_06_13_add_ai_configs_table
Revises: 2026_06_13_add_automation2_ai_tables
Create Date: 2026-06-13 12:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "2026_06_13_add_ai_configs_table"
down_revision: Union[str, None] = "2026_06_13_add_automation2_ai_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("cache_ttl_seconds", sa.Integer(), nullable=False, server_default="300"),
        sa.Column("rate_limit_max", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("rate_limit_window_seconds", sa.Integer(), nullable=False, server_default="3600"),
        sa.Column("classification_stages", postgresql.JSONB(), nullable=False, server_default='["context_router", "rules_engine", "small_llm"]'),
        sa.Column("token_budgets", postgresql.JSONB(), nullable=False, server_default='{"small_query": 2048, "standard": 4096, "complex": 8192, "advanced": 16384}'),
        sa.Column("supported_channels", postgresql.JSONB(), nullable=False, server_default='["embedded_chat"]'),
        sa.Column("pubsub_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_ai_configs_tenant_id", "ai_configs", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_configs_tenant_id", table_name="ai_configs")
    op.drop_table("ai_configs")
