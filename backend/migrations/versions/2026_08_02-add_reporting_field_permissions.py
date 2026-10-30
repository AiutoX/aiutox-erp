"""Add reporting_field_permissions table (REP-002 FR-7 column-level RBAC)

Revision ID: add_reporting_field_permissions
Revises: e0a347ce83be
Create Date: 2026-08-02 00:00:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "add_reporting_field_permissions"
down_revision: str | None = "e0a347ce83be"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reporting_field_permissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dataset_type", sa.String(length=100), nullable=False),
        sa.Column("column_name", sa.String(length=100), nullable=False),
        sa.Column("required_permission", sa.String(length=255), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "tenant_id",
            "dataset_type",
            "column_name",
            name="uq_reporting_field_permissions_tenant_dataset_column",
        ),
    )
    op.create_index(
        "idx_reporting_field_permissions_tenant",
        "reporting_field_permissions",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        "idx_reporting_field_permissions_dataset",
        "reporting_field_permissions",
        ["tenant_id", "dataset_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "idx_reporting_field_permissions_dataset",
        table_name="reporting_field_permissions",
    )
    op.drop_index(
        "idx_reporting_field_permissions_tenant",
        table_name="reporting_field_permissions",
    )
    op.drop_table("reporting_field_permissions")
