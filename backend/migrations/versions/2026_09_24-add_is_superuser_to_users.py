"""add is_superuser to users

Revision ID: 2026_09_24_add_is_superuser
Revises: add_report_executions
Create Date: 2026-09-24

"""

import sqlalchemy as sa
from alembic import op

revision = "2026_09_24_add_is_superuser"
down_revision = "add_report_executions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_superuser",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "is_superuser")
