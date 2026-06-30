"""Rename dc_approval_audit_logs.metadata to audit_metadata.

Revision ID: 20260409_rename_audit_metadata
Revises: 2026_04_09_merge_heads
Create Date: 2026-04-09 01:00:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260409_rename_audit_metadata"
down_revision = "2026_04_09_merge_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE dc_approval_audit_logs RENAME COLUMN metadata TO audit_metadata"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE dc_approval_audit_logs RENAME COLUMN audit_metadata TO metadata"
    )
