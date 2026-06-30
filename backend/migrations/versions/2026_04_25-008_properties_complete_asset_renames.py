"""Properties — complete renaming of asset fields (nombre, marca, modelo).

Revision ID: prop008
Revises: prop007
Create Date: 2026-04-25
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "prop008"
down_revision = "prop007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Rename remaining PropertyAsset fields from Spanish to English (idempotent — module branch may have already renamed them)."""
    for old, new in [("nombre", "name"), ("marca", "brand"), ("modelo", "model")]:
        op.execute(
            f"DO $$ BEGIN "
            f"IF EXISTS (SELECT 1 FROM information_schema.columns "
            f"WHERE table_name='property_assets' AND column_name='{old}') "
            f"THEN ALTER TABLE property_assets RENAME COLUMN {old} TO {new}; "
            f"END IF; END $$;"
        )


def downgrade() -> None:
    """Rename PropertyAsset fields back to Spanish (idempotent)."""
    for old, new in [("model", "modelo"), ("brand", "marca"), ("name", "nombre")]:
        op.execute(
            f"DO $$ BEGIN "
            f"IF EXISTS (SELECT 1 FROM information_schema.columns "
            f"WHERE table_name='property_assets' AND column_name='{old}') "
            f"THEN ALTER TABLE property_assets RENAME COLUMN {old} TO {new}; "
            f"END IF; END $$;"
        )
