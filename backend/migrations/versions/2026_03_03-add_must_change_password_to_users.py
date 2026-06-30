"""add must_change_password to users

Revision ID: 2026_03_03_must_change_pwd
Revises: 2026_02_21_time_entries
Create Date: 2026-03-03

"""

import sqlalchemy as sa
from alembic import op

revision = "2026_03_03_must_change_pwd"
down_revision = "2026_02_21_time_entries"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "must_change_password",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "must_change_password")
