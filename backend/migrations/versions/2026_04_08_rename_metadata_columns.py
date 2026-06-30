"""Rename metadata columns to avoid SQLAlchemy Declarative API conflict.

Revision ID: 20260408_rename_metadata
Revises: add_geolocation_table
Create Date: 2026-04-08 23:45:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260408_rename_metadata"
down_revision = "add_geolocation_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Rename metadata column to avoid SQLAlchemy reserved attribute conflict."""
    op.execute("ALTER TABLE dc_media_captures RENAME COLUMN metadata TO media_metadata")
    op.execute(
        "ALTER TABLE dc_geolocation_captures RENAME COLUMN metadata TO location_metadata"
    )


def downgrade() -> None:
    """Rename columns back to metadata (rollback)."""
    op.execute("ALTER TABLE dc_media_captures RENAME COLUMN media_metadata TO metadata")
    op.execute(
        "ALTER TABLE dc_geolocation_captures RENAME COLUMN location_metadata TO metadata"
    )
