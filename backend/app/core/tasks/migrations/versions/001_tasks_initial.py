"""Tasks module initial schema — branch base.

Revision ID: tasks_001_initial
Revises: 20260408_rename_metadata
Create Date: 2026-04-17 14:05:00.000000

This is the base revision for the tasks module migration branch.
All subsequent tasks migrations depend on this revision.
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "tasks_001_initial"
down_revision = "20260408_rename_metadata"
branch_labels = ("tasks",)
depends_on = None


def upgrade() -> None:
    """No-op — tasks models already exist in the database."""
    pass


def downgrade() -> None:
    """No-op — tasks models are not removed."""
    pass
