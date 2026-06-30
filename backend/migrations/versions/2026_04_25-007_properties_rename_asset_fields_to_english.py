"""Properties — rename PropertyAsset fields to English.

Revision ID: prop007
Revises: prop006
Create Date: 2026-04-25
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "prop007"
down_revision = "prop006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Rename PropertyAsset fields from Spanish to English (idempotent — module branch may have already renamed them)."""
    renames = [
        ("nombre", "name"),
        ("marca", "brand"),
        ("modelo", "model"),
        ("garantia_hasta", "warranty_until"),
        ("proveedor", "supplier"),
        ("vida_util_anos", "useful_life_years"),
        ("notas", "notes"),
    ]
    for old, new in renames:
        op.execute(
            f"DO $$ BEGIN "
            f"IF EXISTS (SELECT 1 FROM information_schema.columns "
            f"WHERE table_name='property_assets' AND column_name='{old}') "
            f"THEN ALTER TABLE property_assets RENAME COLUMN {old} TO {new}; "
            f"END IF; END $$;"
        )


def downgrade() -> None:
    """Rename PropertyAsset fields back to Spanish."""
    op.alter_column(
        "property_assets",
        "notes",
        new_column_name="notas",
    )
    op.alter_column(
        "property_assets",
        "useful_life_years",
        new_column_name="vida_util_anos",
    )
    op.alter_column(
        "property_assets",
        "supplier",
        new_column_name="proveedor",
    )
    op.alter_column(
        "property_assets",
        "warranty_until",
        new_column_name="garantia_hasta",
    )
    op.alter_column(
        "property_assets",
        "model",
        new_column_name="modelo",
    )
    op.alter_column(
        "property_assets",
        "brand",
        new_column_name="marca",
    )
    op.alter_column(
        "property_assets",
        "name",
        new_column_name="nombre",
    )
    # location column removal is handled by migration 006 downgrade
