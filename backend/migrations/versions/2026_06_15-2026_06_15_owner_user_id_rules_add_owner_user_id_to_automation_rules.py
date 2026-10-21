"""add owner_user_id to automation rules

Revision ID: 2026_06_15_owner_user_id_rules
Revises: 2026_06_13_add_sr008_fr010
Create Date: 2026-06-15 14:24:57.891578+00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "2026_06_15_owner_user_id_rules"
down_revision: Union[str, None] = "2026_06_13_add_sr008_fr010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "rules",
        sa.Column(
            "owner_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_rules_owner_user_id", "rules", ["owner_user_id"])


def downgrade() -> None:
    op.drop_index("ix_rules_owner_user_id", table_name="rules")
    op.drop_column("rules", "owner_user_id")
