"""dc_signature_captures — Digital signature storage for form submissions.

New table:
  - dc_signature_captures  (Sprint 6: immutable signature data with audit trail)

Revision ID: dc_signature_captures
Revises: dc_advanced_schema
Create Date: 2026-04-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "dc_signature_captures"
down_revision: str | None = "dc_advanced_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create dc_signature_captures table."""
    op.create_table(
        "dc_signature_captures",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "submission_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("field_id", sa.Text(), nullable=False),
        sa.Column("signature_base64", sa.LargeBinary(), nullable=False),
        sa.Column(
            "format", sa.String(length=20), nullable=False, server_default="image/png"
        ),
        sa.Column("signer_ip", sa.Text(), nullable=True),
        sa.Column("signer_user_agent", sa.Text(), nullable=True),
        sa.Column(
            "signed_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.ForeignKeyConstraint(
            ["submission_id"],
            ["dc_form_submissions.id"],
            name="fk_dc_signature_captures_submission_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_dc_signature_captures"),
        sa.UniqueConstraint(
            "submission_id",
            "field_id",
            name="uq_signature_per_field",
        ),
    )

    # Index for fast lookups by submission
    op.create_index(
        "ix_dc_signature_captures_submission_id",
        "dc_signature_captures",
        ["submission_id"],
    )


def downgrade() -> None:
    """Drop dc_signature_captures table."""
    op.drop_index("ix_dc_signature_captures_submission_id")
    op.drop_table("dc_signature_captures")
