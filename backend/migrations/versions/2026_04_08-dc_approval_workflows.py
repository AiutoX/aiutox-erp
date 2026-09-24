"""dc_approval_workflows — Multi-level approval chains for submissions.

New table:
  - dc_approval_workflows  (Sprint 8: workflow definitions per form)

Revision ID: dc_approval_workflows
Revises: dc_signature_captures
Create Date: 2026-04-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "dc_approval_workflows"
down_revision: str | None = "dc_signature_captures"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create dc_approval_workflows table."""
    op.create_table(
        "dc_approval_workflows",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "form_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "workflow_definition",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "is_active", sa.String(length=20), nullable=False, server_default="active"
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            name="fk_dc_approval_workflows_tenant_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["form_id"],
            ["dc_forms.id"],
            name="fk_dc_approval_workflows_form_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
            name="fk_dc_approval_workflows_created_by",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_dc_approval_workflows"),
        sa.UniqueConstraint("form_id", name="uq_approval_workflow_per_form"),
    )

    # Indexes for common queries
    op.create_index(
        "ix_dc_approval_workflows_form_id",
        "dc_approval_workflows",
        ["form_id"],
    )
    op.create_index(
        "ix_dc_approval_workflows_tenant_id",
        "dc_approval_workflows",
        ["tenant_id"],
    )


def downgrade() -> None:
    """Drop dc_approval_workflows table."""
    op.drop_index("ix_dc_approval_workflows_tenant_id")
    op.drop_index("ix_dc_approval_workflows_form_id")
    op.drop_table("dc_approval_workflows")
