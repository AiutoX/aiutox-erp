"""Merge dc_approval_workflows branch with rename_metadata branch.

Revision ID: 2026_04_09_merge_heads
Revises: dc_approval_workflows, 20260408_rename_metadata
Create Date: 2026-04-09 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "2026_04_09_merge_heads"
down_revision = ("dc_approval_workflows", "20260408_rename_metadata")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
