"""add_sr008_fr010_to_ai_configs

Revision ID: 2026_06_13_add_sr008_fr010
Revises: 2026_06_13_add_base_url_to_ai
Create Date: 2026-06-13 22:00:00.000000+00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "2026_06_13_add_sr008_fr010"
down_revision: Union[str, None] = "2026_06_13_add_base_url_to_ai"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ai_configs",
        sa.Column(
            "max_capability_response_tokens",
            sa.Integer(),
            nullable=False,
            server_default="8000",
        ),
    )
    op.add_column(
        "ai_configs",
        sa.Column(
            "compaction_threshold",
            sa.Integer(),
            nullable=False,
            server_default="20",
        ),
    )


def downgrade() -> None:
    op.drop_column("ai_configs", "compaction_threshold")
    op.drop_column("ai_configs", "max_capability_response_tokens")
