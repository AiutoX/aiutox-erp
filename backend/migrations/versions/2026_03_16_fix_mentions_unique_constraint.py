"""Fix mentions unique constraint to include tenant_id

Revision ID: 2026_03_16_fix_mentions
Revises: 2026_03_16_update_templates
Create Date: 2026-03-16 01:00:00.000000+00:00

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2026_03_16_fix_mentions"
down_revision = "2026_03_16_update_templates"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Drop old unique constraint (user_id, mencionable_type, mencionable_id)
    op.drop_index("idx_mentions_user_entity", table_name="mentions")
    # Create new unique constraint that includes tenant_id
    op.create_index(
        "idx_mentions_user_entity",
        "mentions",
        ["tenant_id", "user_id", "mencionable_type", "mencionable_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("idx_mentions_user_entity", table_name="mentions")
    op.create_index(
        "idx_mentions_user_entity",
        "mentions",
        ["user_id", "mencionable_type", "mencionable_id"],
        unique=True,
    )
