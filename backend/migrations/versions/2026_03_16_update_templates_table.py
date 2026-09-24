"""Update templates table to match current model

Revision ID: 2026_03_16_update_templates
Revises: 2026_03_16_approvals
Create Date: 2026-03-16 00:00:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "2026_03_16_update_templates"
down_revision = "2026_03_16_approvals"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add 'body' column (rename from 'content')
    op.add_column("templates", sa.Column("body", sa.Text(), nullable=True))
    # Copy content to body
    op.execute("UPDATE templates SET body = content WHERE body IS NULL")
    # Make body NOT NULL after copying
    op.alter_column("templates", "body", nullable=False)

    # Add 'version' column with default 1
    op.add_column(
        "templates",
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )

    # Rename 'metadata' column to 'template_metadata' (model uses template_metadata)
    op.alter_column("templates", "metadata", new_column_name="template_metadata")

    # Drop incompatible columns that model no longer has
    # (template_type, template_format, is_system, created_by are no longer in model)
    # NOTE: We drop indexes first
    try:
        op.drop_index("ix_templates_template_type", table_name="templates")
    except Exception:
        pass
    try:
        op.drop_index("idx_templates_tenant_type", table_name="templates")
    except Exception:
        pass
    try:
        op.drop_index("ix_templates_created_by", table_name="templates")
    except Exception:
        pass

    op.drop_column("templates", "template_type")
    op.drop_column("templates", "template_format")
    op.drop_column("templates", "is_system")
    op.drop_column("templates", "created_by")
    op.drop_column("templates", "content")

    # Create rendered_templates table (new in current model)
    op.create_table(
        "rendered_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rendered_content", sa.Text(), nullable=False),
        sa.Column(
            "context",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("entity_type", sa.String(length=50), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["template_id"], ["templates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_rendered_templates_template_id", "rendered_templates", ["template_id"]
    )
    op.create_index(
        "ix_rendered_templates_tenant_id", "rendered_templates", ["tenant_id"]
    )


def downgrade() -> None:
    # Reverse: add back old columns
    op.add_column("templates", sa.Column("content", sa.Text(), nullable=True))
    op.execute("UPDATE templates SET content = body WHERE content IS NULL")
    op.alter_column("templates", "content", nullable=False)

    op.add_column(
        "templates",
        sa.Column("template_type", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "templates",
        sa.Column("template_format", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "templates",
        sa.Column(
            "is_system",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.add_column(
        "templates",
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )

    op.alter_column("templates", "template_metadata", new_column_name="metadata")
    op.drop_column("templates", "body")
    op.drop_column("templates", "version")
    op.drop_index("ix_rendered_templates_tenant_id", table_name="rendered_templates")
    op.drop_index("ix_rendered_templates_template_id", table_name="rendered_templates")
    op.drop_table("rendered_templates")
