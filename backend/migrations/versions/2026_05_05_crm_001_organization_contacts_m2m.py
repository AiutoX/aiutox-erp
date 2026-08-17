"""crm: create organization_contacts M2M table and migrate from contacts.organization_id

Revision ID: crm_001_org_contacts_m2m
Revises: 2026_05_03_core_organizations_001
Create Date: 2026-05-05

Slice 1 of 2 for the Contact-Organization M:M refactor.
- Creates organization_contacts junction table
- Migrates existing contacts.organization_id data into it
- Does NOT drop contacts.organization_id (that is Slice 2)
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "crm_001_org_contacts_m2m"
down_revision = "core_organizations_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_contacts",
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
        sa.Column(
            "contact_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("contacts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("job_title", sa.String(150), nullable=True),
        sa.Column("department", sa.String(150), nullable=True),
        sa.Column("role_tag", sa.String(20), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default="false"),
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
    )

    op.create_index(
        "ix_org_contacts_tenant_org",
        "organization_contacts",
        ["tenant_id", "organization_id"],
    )
    op.create_index(
        "ix_org_contacts_tenant_contact",
        "organization_contacts",
        ["tenant_id", "contact_id"],
    )
    op.create_unique_constraint(
        "uq_organization_contacts_org_contact",
        "organization_contacts",
        ["organization_id", "contact_id"],
    )

    # Data migration: copy existing 1:N relationships into the new table.
    # Uses contact.job_title and contact.department for the initial role context.
    # is_primary_contact on contact maps to is_primary on the membership.
    op.execute(
        """
        INSERT INTO organization_contacts (
            id, tenant_id, organization_id, contact_id,
            job_title, department, is_primary, created_at, updated_at
        )
        SELECT
            gen_random_uuid(),
            c.tenant_id,
            c.organization_id,
            c.id,
            c.job_title,
            c.department,
            c.is_primary_contact,
            now(),
            now()
        FROM contacts c
        WHERE c.organization_id IS NOT NULL
        ON CONFLICT (organization_id, contact_id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_table("organization_contacts")
