"""Add ai_agent_runs and ai_agent_plan_steps tables.

Revision ID: 2026_06_17_add_ai_agent_runs_and_steps
Revises: 2026_06_17_add_ai_digest_subscriptions
Create Date: 2026-06-17 00:02:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "2026_06_17_add_ai_agent_runs_and_steps"
down_revision: str | None = "2026_06_17_add_ai_digest_subscriptions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_agent_runs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("ai_conversations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("goal", sa.Text, nullable=False),
        sa.Column("plan", JSONB, nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default=sa.text("'planning'")),
        sa.Column("current_step", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("result_summary", sa.Text, nullable=True),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("token_count", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("cost_usd", sa.Numeric(10, 6), nullable=False, server_default=sa.text("0")),
        sa.CheckConstraint(
            "status IN ('planning','awaiting_confirmation','executing','completed','failed','cancelled')",
            name="ck_ai_agent_runs_status",
        ),
    )

    op.create_index(
        "ix_ai_agent_runs_tenant_user_status",
        "ai_agent_runs",
        ["tenant_id", "user_id", "status"],
    )
    op.create_index(
        "ix_ai_agent_runs_tenant_started",
        "ai_agent_runs",
        [sa.text("tenant_id"), sa.text("started_at DESC")],
    )

    op.create_table(
        "ai_agent_plan_steps",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("agent_run_id", UUID(as_uuid=True), sa.ForeignKey("ai_agent_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_index", sa.Integer, nullable=False),
        sa.Column("capability", sa.String(255), nullable=False),
        sa.Column("params", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("requires_confirmation", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("result", JSONB, nullable=True),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("confirmed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('pending','awaiting','confirmed','rejected','completed','failed')",
            name="ck_ai_agent_plan_steps_status",
        ),
    )

    op.create_index(
        "uq_ai_agent_plan_steps_run_step",
        "ai_agent_plan_steps",
        ["agent_run_id", "step_index"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_ai_agent_plan_steps_run_step", "ai_agent_plan_steps")
    op.drop_table("ai_agent_plan_steps")
    op.drop_index("ix_ai_agent_runs_tenant_started", "ai_agent_runs")
    op.drop_index("ix_ai_agent_runs_tenant_user_status", "ai_agent_runs")
    op.drop_table("ai_agent_runs")
