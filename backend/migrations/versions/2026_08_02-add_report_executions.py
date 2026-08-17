"""Add report_executions table (REP-005 execution history and audit tab)

Revision ID: add_report_executions
Revises: add_reporting_field_permissions
Create Date: 2026-08-02 00:00:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "add_report_executions"
down_revision: str | None = "add_reporting_field_permissions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "report_executions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("report_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("row_count", sa.Integer(), nullable=True),
        sa.Column("execution_time_ms", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("filters_used", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["report_id"], ["report_definitions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_report_executions_tenant_created",
        "report_executions",
        ["tenant_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "idx_report_executions_report",
        "report_executions",
        ["report_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_report_executions_report", table_name="report_executions")
    op.drop_index(
        "idx_report_executions_tenant_created", table_name="report_executions"
    )
    op.drop_table("report_executions")
