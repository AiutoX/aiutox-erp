"""Add work_items and work_items_archive tables.

Revision ID: work_items_001
Revises: marketplace_001
Create Date: 2026-04-19
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "work_items_001"
down_revision = "marketplace_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "work_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assignee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_module", sa.String(64), nullable=False),
        sa.Column("source_type", sa.String(64), nullable=False),
        sa.Column("source_id", sa.String(255), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("category", sa.String(32), nullable=False, server_default="work"),
        sa.Column("priority", sa.String(32), nullable=False, server_default="medium"),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("deep_link", sa.String(512), nullable=True),
        sa.Column("source_snapshot", postgresql.JSONB, nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("snoozed_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "tenant_id", "source_module", "source_type", "source_id",
            name="uq_work_item_source",
        ),
    )

    op.create_index(
        "ix_work_items_today",
        "work_items",
        ["tenant_id", "assignee_id", "status", "due_date"],
    )
    op.create_index(
        "ix_work_items_tenant_status",
        "work_items",
        ["tenant_id", "status", "due_date"],
    )

    op.create_table(
        "work_items_archive",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assignee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_module", sa.String(64), nullable=False),
        sa.Column("source_type", sa.String(64), nullable=False),
        sa.Column("source_id", sa.String(255), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("priority", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("deep_link", sa.String(512), nullable=True),
        sa.Column("source_snapshot", postgresql.JSONB, nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "archived_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_work_items_archive_tenant",
        "work_items_archive",
        ["tenant_id", "archived_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_work_items_archive_tenant", table_name="work_items_archive")
    op.drop_table("work_items_archive")
    op.drop_index("ix_work_items_tenant_status", table_name="work_items")
    op.drop_index("ix_work_items_today", table_name="work_items")
    op.drop_table("work_items")
