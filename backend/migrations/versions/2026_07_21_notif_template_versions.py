"""Add notification_template_versions table

Revision ID: notif_template_versions_001
Revises: src007_reindex_jobs
Create Date: 2026-07-21

Adds version history for NotificationTemplate, ported from core/templates'
TemplateVersion pattern as part of unifying the two template systems into
notifications (see docs/superpowers/specs/2026-07-21-templates-notifications-
unification-design.md). No columns added to notification_templates itself —
that surface stays free for the Comunicacion Inteligente epic's future
recipient_type work (CI-400).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "notif_template_versions_001"
down_revision: str | None = "src007_reindex_jobs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notification_template_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("subject", sa.String(length=500), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("changelog", sa.Text(), nullable=True),
        sa.Column(
            "is_current", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["template_id"], ["notification_templates.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_notification_template_versions_template",
        "notification_template_versions",
        ["template_id", "version_number"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "idx_notification_template_versions_template",
        table_name="notification_template_versions",
    )
    op.drop_table("notification_template_versions")
