"""Add index_rates table for billing mora and reajuste calculations

Revision ID: 2026_03_14_index_rates
Revises: 2026_03_14_gin_index
Create Date: 2026-03-14 13:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "2026_03_14_index_rates"
down_revision = "2026_03_14_gin_index"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "index_rates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("month", sa.Integer, nullable=False),
        sa.Column("index_type", sa.String(20), nullable=False, server_default="ipc"),
        sa.Column("rate", sa.Numeric(10, 6), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index(
        "idx_index_rates_tenant_period",
        "index_rates",
        ["tenant_id", "year", "month"],
    )

    op.create_unique_constraint(
        "uq_index_rate_period",
        "index_rates",
        ["tenant_id", "year", "month", "index_type"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_index_rate_period", "index_rates")
    op.drop_index("idx_index_rates_tenant_period", table_name="index_rates")
    op.drop_table("index_rates")
