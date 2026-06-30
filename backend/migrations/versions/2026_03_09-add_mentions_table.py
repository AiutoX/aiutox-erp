"""Add mentions table for polymorphic user mentions

Revision ID: add_mentions_table
Revises: 4d08f620a382
Create Date: 2026-03-09 00:00:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "add_mentions_table"
down_revision: str | None = "4d08f620a382"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create mentions table
    op.create_table(
        "mentions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mencionable_type", sa.String(length=50), nullable=False),
        sa.Column("mencionable_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "resolved", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column(
            "notification_sent",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("resolved_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
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

    # Create indexes
    op.create_index("ix_mentions_tenant_id", "mentions", ["tenant_id"], unique=False)
    op.create_index("ix_mentions_user_id", "mentions", ["user_id"], unique=False)
    op.create_index(
        "ix_mentions_mencionable_type", "mentions", ["mencionable_type"], unique=False
    )
    op.create_index(
        "ix_mentions_mencionable_id", "mentions", ["mencionable_id"], unique=False
    )
    op.create_index("ix_mentions_resolved", "mentions", ["resolved"], unique=False)
    op.create_index("ix_mentions_created_at", "mentions", ["created_at"], unique=False)

    # Composite indexes for performance
    op.create_index(
        "idx_mentions_entity",
        "mentions",
        ["mencionable_type", "mencionable_id"],
        unique=False,
    )
    op.create_index(
        "idx_mentions_user_entity",
        "mentions",
        ["user_id", "mencionable_type", "mencionable_id"],
        unique=True,
    )
    op.create_index(
        "idx_mentions_tenant_entity",
        "mentions",
        ["tenant_id", "mencionable_type", "mencionable_id"],
        unique=False,
    )
    op.create_index(
        "idx_mentions_user_resolved", "mentions", ["user_id", "resolved"], unique=False
    )


def downgrade() -> None:
    # Drop indexes (in reverse order)
    op.drop_index("idx_mentions_user_resolved", table_name="mentions")
    op.drop_index("idx_mentions_tenant_entity", table_name="mentions")
    op.drop_index("idx_mentions_user_entity", table_name="mentions")
    op.drop_index("idx_mentions_entity", table_name="mentions")
    op.drop_index("ix_mentions_created_at", table_name="mentions")
    op.drop_index("ix_mentions_resolved", table_name="mentions")
    op.drop_index("ix_mentions_mencionable_id", table_name="mentions")
    op.drop_index("ix_mentions_mencionable_type", table_name="mentions")
    op.drop_index("ix_mentions_user_id", table_name="mentions")
    op.drop_index("ix_mentions_tenant_id", table_name="mentions")

    # Drop table
    op.drop_table("mentions")
