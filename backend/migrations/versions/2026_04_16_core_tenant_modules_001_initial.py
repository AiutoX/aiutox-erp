"""Core: add tenant_modules table for plugin architecture lifecycle

Revision ID: core_tenant_modules_001_initial
Revises: 20260409_rename_audit_metadata
Create Date: 2026-04-16 18:30:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "core_tenant_modules_001_initial"
down_revision: str | None = "20260409_rename_audit_metadata"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create tenant_modules table for tracking module installation state per tenant."""
    op.create_table(
        "tenant_modules",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("module", sa.String(length=100), nullable=False),
        sa.Column(
            "version", sa.String(length=20), nullable=False, server_default="1.0.0"
        ),
        sa.Column("tier", sa.String(length=50), nullable=False, server_default="basic"),
        sa.Column(
            "state",
            sa.Enum(
                "not_installed",
                "installing",
                "active",
                "disabled",
                "grace_period",
                "exported",
                "uninstalled",
                name="tenantmodulestate",
            ),
            nullable=False,
            server_default="not_installed",
        ),
        sa.Column("installed_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("disabled_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("grace_deadline", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("exported_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("uninstalled_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "metadata_json", postgresql.JSON(astext_type=sa.Text()), nullable=True
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "module", name="uq_tenant_modules"),
    )
    op.create_index(
        "ix_tenant_modules_tenant_id", "tenant_modules", ["tenant_id"], unique=False
    )
    op.create_index(
        "ix_tenant_modules_module", "tenant_modules", ["module"], unique=False
    )


def downgrade() -> None:
    """Drop tenant_modules table."""
    op.drop_index("ix_tenant_modules_module", table_name="tenant_modules")
    op.drop_index("ix_tenant_modules_tenant_id", table_name="tenant_modules")
    op.drop_table("tenant_modules")
