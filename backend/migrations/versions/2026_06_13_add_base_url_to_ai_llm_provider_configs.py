"""add_base_url_to_ai_llm_provider_configs

Revision ID: 2026_06_13_add_base_url_to_ai
Revises: 2026_06_13_add_ai_configs_table
Create Date: 2026-06-13 18:00:00.000000+00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "2026_06_13_add_base_url_to_ai"
down_revision: Union[str, None] = "2026_06_13_add_ai_configs_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ai_llm_provider_configs",
        sa.Column("base_url", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ai_llm_provider_configs", "base_url")
