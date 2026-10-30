"""notification_rule_schema — add notification_rule_templates and notification_rule_overrides

Revision ID: notifications_rule_schema_001
Revises: prop008
Create Date: 2026-05-02

Creates:
  - notification_rule_templates (tenant-level event routing templates with wildcard support)
  - notification_rule_overrides (property/building-level overrides of templates)
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "notifications_rule_schema_001"
down_revision = "prop008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_rule_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(200), nullable=False),
        sa.Column("context_type", sa.String(50), nullable=False, server_default="any"),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("default_notify_roles", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("default_notify_users", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("default_channels", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("auto_create_purchase_request", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column("deleted_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
    )

    op.create_index("idx_nrt_tenant", "notification_rule_templates", ["tenant_id"])
    op.create_index("idx_nrt_event_type", "notification_rule_templates", ["event_type"])
    op.create_index(
        "idx_nrt_tenant_event",
        "notification_rule_templates",
        ["tenant_id", "event_type"],
    )

    op.create_table(
        "notification_rule_overrides",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("notification_rule_templates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("context_type", sa.String(50), nullable=False),
        sa.Column("context_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("notify_roles", postgresql.JSONB, nullable=True),
        sa.Column("notify_users", postgresql.JSONB, nullable=True),
        sa.Column("channels", postgresql.JSONB, nullable=True),
        sa.Column("auto_create_purchase_request", sa.Boolean, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )

    op.create_index("idx_nro_tenant", "notification_rule_overrides", ["tenant_id"])
    op.create_index("idx_nro_template", "notification_rule_overrides", ["template_id"])
    op.create_index(
        "idx_nro_context",
        "notification_rule_overrides",
        ["context_type", "context_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_nro_context", "notification_rule_overrides")
    op.drop_index("idx_nro_template", "notification_rule_overrides")
    op.drop_index("idx_nro_tenant", "notification_rule_overrides")
    op.drop_table("notification_rule_overrides")

    op.drop_index("idx_nrt_tenant_event", "notification_rule_templates")
    op.drop_index("idx_nrt_event_type", "notification_rule_templates")
    op.drop_index("idx_nrt_tenant", "notification_rule_templates")
    op.drop_table("notification_rule_templates")
