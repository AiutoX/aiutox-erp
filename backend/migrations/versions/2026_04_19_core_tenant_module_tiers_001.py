"""Core: add tenant_module_tiers table for commercial tier gating

Revision ID: core_tenant_module_tiers_001
Revises: core_user_widget_preferences_001
Create Date: 2026-04-19 00:00:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "core_tenant_module_tiers_001"
down_revision: str | None = "core_user_widget_preferences_001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tenant_module_tiers",
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("module_id", sa.String(100), nullable=False),
        sa.Column("tier", sa.String(20), nullable=False, server_default="basic"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("license_token_jti", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("tenant_id", "module_id"),
        sa.UniqueConstraint("tenant_id", "module_id", name="uq_tenant_module_tiers"),
    )
    op.create_index(
        "ix_tenant_module_tiers_license_jti",
        "tenant_module_tiers",
        ["license_token_jti"],
        unique=False,
    )
    op.create_index(
        "ix_tenant_module_tiers_expires_at",
        "tenant_module_tiers",
        ["expires_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_tenant_module_tiers_expires_at", table_name="tenant_module_tiers")
    op.drop_index("ix_tenant_module_tiers_license_jti", table_name="tenant_module_tiers")
    op.drop_table("tenant_module_tiers")
