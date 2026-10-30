"""widen catalog code columns to VARCHAR(64)

Revision ID: 2026_10_19_widen_catalog_code_columns
Revises: d5b835e4429e
Create Date: 2026-10-19

A column that stores a catalog code must hold the longest code a catalog item
can have: ``catalog_items.code`` is ``VARCHAR(64)``, and a tenant item's
generated code reaches 64 characters (``"x_" + slug[:59] + "_99"``,
app/core/catalogs/codes.py). ``users.gender`` was ``VARCHAR(20)``, so a
selectable tenant item with a longer code passed ``require()`` and then failed
on INSERT/UPDATE with ``StringDataRightTruncation`` (a 500).
``organizations.organization_type`` and
``person_identifications.document_type`` were ``VARCHAR(50)``.

Widening a VARCHAR is a catalog-only change in Postgres: no table rewrite and
no index rebuild (``ix_organizations_tenant_type`` stays valid).

The downgrade narrows the columns back only when every stored value still
fits; otherwise it stops with the offending column instead of truncating data.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "2026_10_19_widen_catalog_code_columns"
down_revision: str | None = "d5b835e4429e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CATALOG_CODE_LENGTH = 64

# (table, column, previous length, nullable)
COLUMNS = (
    ("users", "gender", 20, True),
    ("organizations", "organization_type", 50, False),
    ("person_identifications", "document_type", 50, True),
)


def upgrade() -> None:
    for table, column, previous_length, nullable in COLUMNS:
        op.alter_column(
            table,
            column,
            existing_type=sa.String(previous_length),
            type_=sa.String(CATALOG_CODE_LENGTH),
            existing_nullable=nullable,
        )


def downgrade() -> None:
    bind = op.get_bind()
    for table, column, previous_length, nullable in COLUMNS:
        too_long = bind.execute(
            sa.text(
                f"SELECT count(*) FROM {table} "  # noqa: S608 - constant identifiers
                f"WHERE length({column}) > :limit"
            ),
            {"limit": previous_length},
        ).scalar_one()
        if too_long:
            raise RuntimeError(
                f"Cannot narrow {table}.{column} to VARCHAR({previous_length}): "
                f"{too_long} row(s) hold a longer catalog code. Remap those "
                "values first; refusing to truncate data."
            )
        op.alter_column(
            table,
            column,
            existing_type=sa.String(CATALOG_CODE_LENGTH),
            type_=sa.String(previous_length),
            existing_nullable=nullable,
        )
