"""crm: drop contacts.organization_id — M2M fully in place via organization_contacts

Revision ID: crm_002_drop_contacts_org_id
Revises: crm_001_org_contacts_m2m
Create Date: 2026-05-05

Slice 2 of 2 for the Contact-Organization M:M refactor.
- Drops the index ix_contacts_tenant_organization
- Drops the FK constraint and organization_id column from contacts
- Data was migrated to organization_contacts in crm_001
"""

from alembic import op
import sqlalchemy as sa

revision = "crm_002_drop_contacts_org_id"
down_revision = "crm_001_org_contacts_m2m"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_contacts_tenant_organization", table_name="contacts")
    op.drop_constraint(
        "contacts_organization_id_fkey",
        "contacts",
        type_="foreignkey",
    )
    op.drop_column("contacts", "organization_id")


def downgrade() -> None:
    op.add_column(
        "contacts",
        sa.Column(
            "organization_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "contacts_organization_id_fkey",
        "contacts",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_contacts_tenant_organization",
        "contacts",
        ["tenant_id", "organization_id"],
    )
