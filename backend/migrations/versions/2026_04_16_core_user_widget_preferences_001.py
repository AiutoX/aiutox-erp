"""Core: add user_widget_preferences table for dashboard customization

Revision ID: core_user_widget_preferences_001
Revises: core_tenant_modules_001_initial
Create Date: 2026-04-16 19:00:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "core_user_widget_preferences_001"
down_revision: str | None = "core_tenant_modules_001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create user_widget_preferences table for dashboard customization."""
    op.create_table(
        "user_widget_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("widget_id", sa.String(length=255), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("visible", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("config_json", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "widget_id", name="uq_user_widget_preferences"),
    )
    op.create_index(
        "ix_user_widget_preferences_tenant_id",
        "user_widget_preferences",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        "ix_user_widget_preferences_user_id",
        "user_widget_preferences",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Drop user_widget_preferences table."""
    op.drop_index(
        "ix_user_widget_preferences_user_id", table_name="user_widget_preferences"
    )
    op.drop_index(
        "ix_user_widget_preferences_tenant_id", table_name="user_widget_preferences"
    )
    op.drop_table("user_widget_preferences")
