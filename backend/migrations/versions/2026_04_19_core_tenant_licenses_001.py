"""core: create tenant_licenses table for License JWT activation — P10-T05.

Revision ID: core_tenant_licenses_001
Revises: core_tenant_module_tiers_001
Create Date: 2026-04-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "core_tenant_licenses_001"
down_revision = "core_tenant_module_tiers_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenant_licenses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("license_jti", sa.String(255), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("modules_json", sa.String(4096), nullable=False, server_default="{}"),
        sa.Column(
            "activated_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "license_jti", name="uq_tenant_license_jti"),
    )
    op.create_index("ix_tenant_licenses_tenant_id", "tenant_licenses", ["tenant_id"])
    op.create_index("ix_tenant_licenses_license_jti", "tenant_licenses", ["license_jti"])
    op.create_index("ix_tenant_licenses_expires_at", "tenant_licenses", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_tenant_licenses_expires_at", table_name="tenant_licenses")
    op.drop_index("ix_tenant_licenses_license_jti", table_name="tenant_licenses")
    op.drop_index("ix_tenant_licenses_tenant_id", table_name="tenant_licenses")
    op.drop_table("tenant_licenses")
