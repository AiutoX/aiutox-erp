"""Add approvals table (simple approval model).

Revision ID: 2026_03_16_approvals
Revises: 2026_03_15_spare_parts, 20260306_task_type, 2026_03_03_must_change_pwd, add_mentions_table, 2026_03_14_fin_doc_fields
Create Date: 2026-03-16

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "2026_03_16_approvals"
down_revision = (
    "2026_03_15_spare_parts",
    "20260306_task_type",
    "2026_03_03_must_change_pwd",
    "add_mentions_table",
    "2026_03_14_fin_doc_fields",
)
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "approvals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("requested_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "requested_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("approver_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("approved_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("amount", sa.Numeric(15, 2), nullable=True),
        sa.Column("currency", sa.String(3), nullable=True, server_default="USD"),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("context", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "approval_metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
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
        sa.ForeignKeyConstraint(["requested_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["approver_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_approvals_tenant", "approvals", ["tenant_id"])
    op.create_index("idx_approvals_status", "approvals", ["status"])
    op.create_index("idx_approvals_tenant_status", "approvals", ["tenant_id", "status"])
    op.create_index(
        "idx_approvals_tenant_approver", "approvals", ["tenant_id", "approver_id"]
    )
    op.create_index(
        "idx_approvals_tenant_requester",
        "approvals",
        ["tenant_id", "requested_by_id"],
    )
    op.create_index("idx_approvals_entity", "approvals", ["entity_type", "entity_id"])
    op.create_index("idx_approvals_due_date", "approvals", ["tenant_id", "due_date"])
    op.create_index("idx_approvals_requested_at", "approvals", ["requested_at"])


def downgrade() -> None:
    op.drop_table("approvals")
