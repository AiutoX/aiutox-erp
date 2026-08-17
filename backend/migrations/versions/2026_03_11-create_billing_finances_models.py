"""Create billing and finances tables

Revision ID: 2026_03_11_billing_finances
Revises: 2026_03_10_add_tenant_is_active
Create Date: 2026-03-11 12:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "2026_03_11_billing_finances"
down_revision = "2026_03_10_add_tenant_is_active"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create charges table
    op.create_table(
        "charges",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "tenant_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column(
            "entity_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column(
            "currency",
            sa.String(3),
            nullable=False,
            server_default=sa.text("'COP'::text"),
        ),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'pending'::text"),
        ),
        sa.Column(
            "due_date",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column("fiscal_status", sa.String(20), nullable=True),
        sa.Column("dian_cufe", sa.String(200), nullable=True),
        sa.Column("dian_qr", sa.Text(), nullable=True),
        sa.Column("dian_xml", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("metadata", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for charges
    op.create_index("ix_charges_tenant_id", "charges", ["tenant_id"], unique=False)
    op.create_index(
        "ix_charges_tenant_status", "charges", ["tenant_id", "status"], unique=False
    )
    op.create_index(
        "ix_charges_entity", "charges", ["entity_type", "entity_id"], unique=False
    )
    op.create_index(
        "ix_charges_due_date", "charges", ["tenant_id", "due_date"], unique=False
    )

    # Create payments table
    op.create_table(
        "payments",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "tenant_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "charge_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column(
            "currency",
            sa.String(3),
            nullable=False,
            server_default=sa.text("'COP'::text"),
        ),
        sa.Column(
            "method",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'transfer'::text"),
        ),
        sa.Column("reference", sa.String(200), nullable=True),
        sa.Column(
            "paid_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "recorded_by",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("metadata", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["charge_id"], ["charges.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recorded_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for payments
    op.create_index("ix_payments_tenant_id", "payments", ["tenant_id"], unique=False)
    op.create_index(
        "ix_payments_tenant_charge",
        "payments",
        ["tenant_id", "charge_id"],
        unique=False,
    )

    # Create payment_plans table
    op.create_table(
        "payment_plans",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "tenant_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "charge_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "installments",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'1'::text"),
        ),
        sa.Column(
            "start_date",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "end_date",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'active'::text"),
        ),
        sa.Column("metadata", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["charge_id"], ["charges.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for payment_plans
    op.create_index(
        "ix_payment_plans_tenant_id", "payment_plans", ["tenant_id"], unique=False
    )

    # Create owner_liquidations table
    op.create_table(
        "owner_liquidations",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "tenant_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "owner_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "period_start",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "period_end",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "total_income",
            sa.Numeric(15, 2),
            nullable=True,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "total_expenses",
            sa.Numeric(15, 2),
            nullable=True,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "net_amount", sa.Numeric(15, 2), nullable=True, server_default=sa.text("0")
        ),
        sa.Column(
            "currency",
            sa.String(3),
            nullable=False,
            server_default=sa.text("'COP'::text"),
        ),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'draft'::text"),
        ),
        sa.Column("details", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for owner_liquidations
    op.create_index(
        "ix_owner_liquidations_tenant_id",
        "owner_liquidations",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        "ix_owner_liquidations_tenant_owner",
        "owner_liquidations",
        ["tenant_id", "owner_id"],
        unique=False,
    )

    # Create financial_periods table (must be before financial_documents due to FK)
    op.create_table(
        "financial_periods",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "tenant_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column(
            "start_date",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "end_date",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'open'::text"),
        ),
        sa.Column(
            "total_income",
            sa.Numeric(15, 2),
            nullable=True,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "total_expenses",
            sa.Numeric(15, 2),
            nullable=True,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "closed_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for financial_periods
    op.create_index(
        "ix_financial_periods_tenant_id",
        "financial_periods",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        "ix_fin_periods_tenant_status",
        "financial_periods",
        ["tenant_id", "status"],
        unique=False,
    )

    # Create financial_documents table
    op.create_table(
        "financial_documents",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "tenant_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("doc_type", sa.String(50), nullable=False),
        sa.Column(
            "period_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("amount", sa.Numeric(15, 2), nullable=True),
        sa.Column(
            "currency",
            sa.String(3),
            nullable=False,
            server_default=sa.text("'COP'::text"),
        ),
        sa.Column("data", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["period_id"], ["financial_periods.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for financial_documents
    op.create_index(
        "ix_financial_documents_tenant_id",
        "financial_documents",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        "ix_fin_docs_tenant_type",
        "financial_documents",
        ["tenant_id", "doc_type"],
        unique=False,
    )

    # Create owner_accounts table
    op.create_table(
        "owner_accounts",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "tenant_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "owner_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "balance", sa.Numeric(15, 2), nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "currency",
            sa.String(3),
            nullable=False,
            server_default=sa.text("'COP'::text"),
        ),
        sa.Column(
            "last_updated",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("metadata", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.dialects.postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for owner_accounts
    op.create_index(
        "ix_owner_accounts_tenant_id", "owner_accounts", ["tenant_id"], unique=False
    )
    op.create_index(
        "ix_owner_accounts_tenant_owner",
        "owner_accounts",
        ["tenant_id", "owner_id"],
        unique=True,
    )


def downgrade() -> None:
    # Drop owner_accounts
    op.drop_index("ix_owner_accounts_tenant_owner", table_name="owner_accounts")
    op.drop_index("ix_owner_accounts_tenant_id", table_name="owner_accounts")
    op.drop_table("owner_accounts")

    # Drop financial_periods
    op.drop_index("ix_fin_periods_tenant_status", table_name="financial_periods")
    op.drop_index("ix_financial_periods_tenant_id", table_name="financial_periods")
    op.drop_table("financial_periods")

    # Drop financial_documents
    op.drop_index("ix_fin_docs_tenant_type", table_name="financial_documents")
    op.drop_index("ix_financial_documents_tenant_id", table_name="financial_documents")
    op.drop_table("financial_documents")

    # Drop owner_liquidations
    op.drop_index("ix_owner_liquidations_tenant_owner", table_name="owner_liquidations")
    op.drop_index("ix_owner_liquidations_tenant_id", table_name="owner_liquidations")
    op.drop_table("owner_liquidations")

    # Drop payment_plans
    op.drop_index("ix_payment_plans_tenant_id", table_name="payment_plans")
    op.drop_table("payment_plans")

    # Drop payments
    op.drop_index("ix_payments_tenant_charge", table_name="payments")
    op.drop_index("ix_payments_tenant_id", table_name="payments")
    op.drop_table("payments")

    # Drop charges
    op.drop_index("ix_charges_due_date", table_name="charges")
    op.drop_index("ix_charges_entity", table_name="charges")
    op.drop_index("ix_charges_tenant_status", table_name="charges")
    op.drop_index("ix_charges_tenant_id", table_name="charges")
    op.drop_table("charges")
