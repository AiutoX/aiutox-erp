"""Create dc_approval_audit_logs table for approval workflow audit trail.

Revision ID: dc_approval_audit_logs
Revises: dc_signature_captures
Create Date: 2026-04-08

Tables:
- dc_approval_audit_logs: Immutable audit trail for all approval actions
  - Tracks: approve, reject, timeout, workflow_created, workflow_updated, workflow_deleted
  - Indexed on: tenant_id, submission_id, workflow_id, action, created_at
  - JSON metadata for flexible event storage
  - Retention: Permanent (never deleted, only archived after 7 years)
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "dc_approval_audit_logs"
down_revision = "dc_approval_workflows"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create approval audit log table."""
    op.create_table(
        "dc_approval_audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("workflow_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("level_id", sa.String(100), nullable=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_email", sa.String(255), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["submission_id"], ["dc_form_submissions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["workflow_id"], ["dc_approval_workflows.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for efficient querying
    op.create_index(
        "ix_dc_approval_audit_logs_tenant_id",
        "dc_approval_audit_logs",
        ["tenant_id"],
    )
    op.create_index(
        "ix_dc_approval_audit_logs_submission_id",
        "dc_approval_audit_logs",
        ["submission_id"],
    )
    op.create_index(
        "ix_dc_approval_audit_logs_workflow_id",
        "dc_approval_audit_logs",
        ["workflow_id"],
    )
    op.create_index(
        "ix_dc_approval_audit_logs_action",
        "dc_approval_audit_logs",
        ["action"],
    )
    op.create_index(
        "ix_dc_approval_audit_logs_created_at",
        "dc_approval_audit_logs",
        ["created_at"],
    )
    op.create_index(
        "ix_dc_approval_audit_logs_tenant_created",
        "dc_approval_audit_logs",
        ["tenant_id", "created_at"],
    )


def downgrade() -> None:
    """Drop approval audit log table."""
    op.drop_index(
        "ix_dc_approval_audit_logs_tenant_created",
        table_name="dc_approval_audit_logs",
    )
    op.drop_index(
        "ix_dc_approval_audit_logs_created_at",
        table_name="dc_approval_audit_logs",
    )
    op.drop_index(
        "ix_dc_approval_audit_logs_action",
        table_name="dc_approval_audit_logs",
    )
    op.drop_index(
        "ix_dc_approval_audit_logs_workflow_id",
        table_name="dc_approval_audit_logs",
    )
    op.drop_index(
        "ix_dc_approval_audit_logs_submission_id",
        table_name="dc_approval_audit_logs",
    )
    op.drop_index(
        "ix_dc_approval_audit_logs_tenant_id",
        table_name="dc_approval_audit_logs",
    )
    op.drop_table("dc_approval_audit_logs")
