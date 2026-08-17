"""Add ai_digest_subscriptions table.

Revision ID: 2026_06_17_add_ai_digest_subscriptions
Revises: 2026_06_17_add_digest_capability_type
Create Date: 2026-06-17 00:01:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "2026_06_17_add_ai_digest_subscriptions"
down_revision: str | None = "2026_06_17_add_digest_capability_type"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_digest_subscriptions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("digest_name", sa.String(255), nullable=False),
        sa.Column("schedule", sa.String(20), nullable=False),
        sa.Column("channels", JSONB, nullable=False, server_default=sa.text("'[\"in-app\"]'::jsonb")),
        sa.Column("params", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("next_fire_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("last_fired_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "schedule IN ('daily','weekly','monthly')",
            name="ck_ai_digest_subscriptions_schedule",
        ),
    )

    op.create_index(
        "ix_ai_digest_subscriptions_tenant_active",
        "ai_digest_subscriptions",
        ["tenant_id", "is_active"],
    )
    op.create_index(
        "ix_ai_digest_subscriptions_next_fire_at",
        "ai_digest_subscriptions",
        ["next_fire_at"],
    )
    op.create_index(
        "uq_ai_digest_subscriptions_user_digest_active",
        "ai_digest_subscriptions",
        ["user_id", "digest_name"],
        unique=True,
        postgresql_where=sa.text("is_active = true"),
    )


def downgrade() -> None:
    op.drop_index("uq_ai_digest_subscriptions_user_digest_active", "ai_digest_subscriptions")
    op.drop_index("ix_ai_digest_subscriptions_next_fire_at", "ai_digest_subscriptions")
    op.drop_index("ix_ai_digest_subscriptions_tenant_active", "ai_digest_subscriptions")
    op.drop_table("ai_digest_subscriptions")
