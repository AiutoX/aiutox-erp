"""Add gamification tables: gamification_events, user_points, badges, user_badges, leaderboard_entries

Revision ID: 2026_07_02_add_gamification_tables
Revises: 2026_06_29_add_retention_policy
Create Date: 2026-07-02 00:00:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "2026_07_02_add_gamification_tables"
down_revision: str | None = "2026_06_29_add_retention_policy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create gamification_events table
    op.create_table(
        "gamification_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("source_module", sa.String(length=50), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("points_earned", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_gam_events_user",
        "gamification_events",
        ["tenant_id", "user_id"],
        unique=False,
    )
    op.create_index(
        "idx_gam_events_type",
        "gamification_events",
        ["tenant_id", "event_type"],
        unique=False,
    )

    # Create user_points table
    op.create_table(
        "user_points",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("total_points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_activity_date", sa.Date(), nullable=True),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_user_points_unique",
        "user_points",
        ["tenant_id", "user_id"],
        unique=True,
    )

    # Create badges table
    op.create_table(
        "badges",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "icon", sa.String(length=50), nullable=False, server_default="trophy"
        ),
        sa.Column("criteria", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("points_value", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_badges_tenant", "badges", ["tenant_id", "is_active"], unique=False
    )

    # Create user_badges table
    op.create_table(
        "user_badges",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("badge_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_event_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "earned_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["badge_id"], ["badges.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_user_badges_user",
        "user_badges",
        ["tenant_id", "user_id"],
        unique=False,
    )
    op.create_index(
        "idx_user_badges_unique",
        "user_badges",
        ["tenant_id", "user_id", "badge_id"],
        unique=True,
    )

    # Create leaderboard_entries table
    op.create_table(
        "leaderboard_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("period", sa.String(length=20), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_leaderboard_period",
        "leaderboard_entries",
        ["tenant_id", "period", "points"],
        unique=False,
    )
    op.create_index(
        "idx_leaderboard_unique",
        "leaderboard_entries",
        ["tenant_id", "user_id", "period"],
        unique=True,
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("idx_leaderboard_unique", table_name="leaderboard_entries")
    op.drop_index("idx_leaderboard_period", table_name="leaderboard_entries")
    op.drop_index("idx_user_badges_unique", table_name="user_badges")
    op.drop_index("idx_user_badges_user", table_name="user_badges")
    op.drop_index("idx_badges_tenant", table_name="badges")
    op.drop_index("idx_user_points_unique", table_name="user_points")
    op.drop_index("idx_gam_events_type", table_name="gamification_events")
    op.drop_index("idx_gam_events_user", table_name="gamification_events")

    # Drop tables
    op.drop_table("leaderboard_entries")
    op.drop_table("user_badges")
    op.drop_table("badges")
    op.drop_table("user_points")
    op.drop_table("gamification_events")
