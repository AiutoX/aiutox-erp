"""core_organizations_001 — add tipo_doc/num_doc to organizations + organization_bank_accounts table

Revision ID: core_organizations_001
Revises: notifications_rule_schema_001
Create Date: 2026-05-03

Changes:
  - organizations: ADD COLUMN tipo_doc VARCHAR(10)
  - organizations: ADD COLUMN num_doc  VARCHAR(50)
  - CREATE TABLE organization_bank_accounts (1:M with organizations)
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "core_organizations_001"
down_revision = "notifications_rule_schema_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add document fields to organizations
    op.add_column("organizations", sa.Column("tipo_doc", sa.String(10), nullable=True))
    op.add_column("organizations", sa.Column("num_doc", sa.String(50), nullable=True))

    # Create organization_bank_accounts table
    op.create_table(
        "organization_bank_accounts",
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
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("bank_name", sa.String(100), nullable=False),
        sa.Column("account_type", sa.String(30), nullable=False),
        sa.Column("account_number", sa.String(50), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint(
            "organization_id",
            "account_number",
            name="uq_org_bank_accounts_org_account",
        ),
    )

    op.create_index(
        "ix_org_bank_accounts_tenant_org",
        "organization_bank_accounts",
        ["tenant_id", "organization_id"],
    )
    op.create_index(
        "ix_org_bank_accounts_tenant_id",
        "organization_bank_accounts",
        ["tenant_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_org_bank_accounts_tenant_id", "organization_bank_accounts")
    op.drop_index("ix_org_bank_accounts_tenant_org", "organization_bank_accounts")
    op.drop_table("organization_bank_accounts")
    op.drop_column("organizations", "num_doc")
    op.drop_column("organizations", "tipo_doc")
