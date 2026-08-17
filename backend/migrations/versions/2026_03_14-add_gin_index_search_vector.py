"""Add GIN index on search_indices.search_vector for PostgreSQL FTS

Revision ID: 2026_03_14_gin_index
Revises: 2026_03_11_billing_finances
Create Date: 2026-03-14 12:00:00.000000
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "2026_03_14_gin_index"
down_revision = "2026_03_11_billing_finances"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create GIN index on search_vector TSVECTOR column for fast full-text search.
    # Note: CONCURRENTLY removed because it cannot run inside Alembic transaction
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_search_indices_vector "
        "ON search_indices USING gin(search_vector)"
    )


def downgrade() -> None:
    # Drop the GIN index
    op.execute("DROP INDEX IF EXISTS idx_search_indices_vector")
