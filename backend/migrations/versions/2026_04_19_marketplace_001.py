"""core: create marketplace_purchases table — P13-T08.

Revision ID: marketplace_001
Revises: core_tenant_licenses_001
Create Date: 2026-04-19
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "marketplace_001"
down_revision = "core_tenant_licenses_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "marketplace_purchases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("module_id", sa.String(64), nullable=False),
        sa.Column("tier", sa.String(32), nullable=False),
        sa.Column("plan_type", sa.String(32), nullable=False),
        sa.Column("license_jti", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "tenant_id", "module_id", "plan_type", name="uq_marketplace_trial"
        ),
    )
    op.create_index(
        "ix_marketplace_purchases_tenant_id",
        "marketplace_purchases",
        ["tenant_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_marketplace_purchases_tenant_id", "marketplace_purchases")
    op.drop_table("marketplace_purchases")
