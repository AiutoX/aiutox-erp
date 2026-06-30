"""Add monthly_snapshots table for immutable financial period snapshots

Revision ID: 2026_03_15_monthly_snapshots
Revises: 2026_03_15_leases
Create Date: 2026-03-15 18:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "2026_03_15_monthly_snapshots"
down_revision = "2026_03_15_leases"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "monthly_snapshots",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        # Financial summary (immutable after close)
        sa.Column(
            "total_income",
            sa.Numeric(15, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "total_expenses",
            sa.Numeric(15, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "total_charges",
            sa.Numeric(15, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "total_payments",
            sa.Numeric(15, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "net_result",
            sa.Numeric(15, 2),
            nullable=False,
            server_default="0",
        ),
        # Aging at close time
        sa.Column(
            "aging_0_30",
            sa.Numeric(15, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "aging_31_60",
            sa.Numeric(15, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "aging_61_90",
            sa.Numeric(15, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "aging_over_90",
            sa.Numeric(15, 2),
            nullable=False,
            server_default="0",
        ),
        # Metadata
        sa.Column(
            "currency",
            sa.String(3),
            nullable=False,
            server_default="COP",
        ),
        sa.Column("data", postgresql.JSONB(), nullable=True),
        sa.Column(
            "closed_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # Unique constraint: one snapshot per tenant per year+month
    op.create_unique_constraint(
        "uq_monthly_snapshots_tenant_period",
        "monthly_snapshots",
        ["tenant_id", "year", "month"],
    )

    # Performance index
    op.create_index(
        "idx_snapshots_tenant_period",
        "monthly_snapshots",
        ["tenant_id", "year", "month"],
    )

    # Tenant lookup index
    op.create_index(
        "idx_monthly_snapshots_tenant",
        "monthly_snapshots",
        ["tenant_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_monthly_snapshots_tenant", table_name="monthly_snapshots")
    op.drop_index("idx_snapshots_tenant_period", table_name="monthly_snapshots")
    op.drop_constraint(
        "uq_monthly_snapshots_tenant_period",
        "monthly_snapshots",
        type_="unique",
    )
    op.drop_table("monthly_snapshots")
