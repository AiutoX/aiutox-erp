"""add_retention_policy_to_ai_configs

Revision ID: 2026_06_29_add_retention_policy
Revises: 2026_06_17_add_digest_capability_type
Create Date: 2026-06-29 00:00:00.000000+00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "2026_06_29_add_retention_policy"
down_revision: Union[str, None] = "2026_06_17_add_digest_capability_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ai_configs",
        sa.Column(
            "auto_archive_after_days",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "ai_configs",
        sa.Column(
            "hard_delete_after_days",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("ai_configs", "hard_delete_after_days")
    op.drop_column("ai_configs", "auto_archive_after_days")
