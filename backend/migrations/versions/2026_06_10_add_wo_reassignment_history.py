"""add_maintenance_work_order_reassignment_history

Revision ID: 2026_06_10_add_wo_reassignment_history
Revises: 2026_05_06_add_role_permissions
Create Date: 2026-06-10 00:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "2026_06_10_add_wo_reassignment_history"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "maintenance_work_order_reassignment_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("work_order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("to_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("reassigned_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_wo_reassign_tenant", "maintenance_work_order_reassignment_history", ["tenant_id"]
    )
    op.create_index(
        "ix_wo_reassign_wo", "maintenance_work_order_reassignment_history", ["work_order_id"]
    )
    op.create_index(
        "ix_wo_reassign_created",
        "maintenance_work_order_reassignment_history",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_wo_reassign_created", table_name="maintenance_work_order_reassignment_history")
    op.drop_index("ix_wo_reassign_wo", table_name="maintenance_work_order_reassignment_history")
    op.drop_index("ix_wo_reassign_tenant", table_name="maintenance_work_order_reassignment_history")
    op.drop_table("maintenance_work_order_reassignment_history")
