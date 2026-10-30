"""Properties — add location field to property_assets table.

Revision ID: prop006
Revises: insights_001
Create Date: 2026-04-25
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "prop006"
down_revision = "insights_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add location column to property_assets table (idempotent — module branch may have already added it)."""
    op.execute("ALTER TABLE property_assets ADD COLUMN IF NOT EXISTS location VARCHAR(100)")


def downgrade() -> None:
    """Remove location column from property_assets table (idempotent)."""
    op.execute("ALTER TABLE property_assets DROP COLUMN IF EXISTS location")
