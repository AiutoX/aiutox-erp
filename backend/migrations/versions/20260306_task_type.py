"""add task_type to tasks

Revision ID: 20260306_task_type
Revises: 2026_03_05_optimize_task_indexes
Create Date: 2026-03-06 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260306_task_type"
down_revision = "2026_03_05_optimize_task_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add task_type column to tasks table."""

    # Add task_type column with default value
    op.add_column(
        "tasks",
        sa.Column(
            "task_type",
            sa.String(50),
            nullable=False,
            server_default="generic",
            comment="Type of task (generic, deadline, recurring, etc.)",
        ),
    )

    # Create index for task_type
    op.create_index("idx_tasks_task_type", "tasks", ["task_type"])


def downgrade() -> None:
    """Remove task_type column from tasks table."""

    # Drop index
    op.drop_index("idx_tasks_task_type", table_name="tasks")

    # Drop column
    op.drop_column("tasks", "task_type")
