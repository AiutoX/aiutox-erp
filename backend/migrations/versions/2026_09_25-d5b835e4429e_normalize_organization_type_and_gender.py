"""normalize organization_type and gender

Revision ID: d5b835e4429e
Revises: d64b9136c90d
Create Date: 2026-09-25 22:25:51.767993+00:00

Normalizes `organizations.organization_type` and `users.gender` to the
lower-case English catalog codes ISSUE-039 declares
(`customer`/`supplier`/`partner`/`other` and
`male`/`female`/`other`/`prefer_not_to_say`), reusing the
`catalog_migration_backup` table ISSUE-040 creates (not recreated here).

`trim(lower(...))` is the lookup key for EVERY non-null value, so a pure
case/whitespace variant of a known code or word (e.g. `'Customer'` ->
`customer`, `' supplier '` -> `supplier`) is still a change, is backed up, and
is rewritten. A value whose trim+lower result is not one of the known
codes/words is left byte-identical (the `ELSE` branch of each `CASE` returns
the original column) and is not backed up, because nothing changed; the
report below flags it `UNMAPPED`. This is the MODULE-SPEC Section 5 step 2 /
AC-MIG-04 / AC-MIG-05 contract "unmapped values are reported, not changed",
restored by the phase 220 review (P1-13, gate 238): an earlier version of
this migration trimmed and lower-cased unmapped values too.

`gender`'s empty string (after trim) maps to `NULL` -- the backed-up
`original_value` for those rows is the empty string itself (backed up before
the change), so `downgrade()`'s `SET gender = b.original_value` correctly
restores `''`, not `NULL`, matching AC-MIG-08's byte-identical requirement.

Raw SQL / `op.execute` only -- no import of
`app.core.users.models.OrganizationType` or any other application code, same
`e0a347ce83be` precedent ISSUE-040 followed.

Neither column's DB type changes here: `organizations.organization_type`
stays `sa.String(50)` NOT NULL (verified `app/core/users/models.py:182`) and
`users.gender` stays `sa.String(20)` (verified `app/core/users/models.py:51`)
-- this is a pure data rewrite.

`downgrade()` restores every backed-up value for both columns from
`catalog_migration_backup`, keyed by `(table_name, column_name, row_id)`, then
deletes the rows it restored so a later upgrade backs each row up once
(P2-16), but does NOT drop that table -- it is created by ISSUE-040, whose own
downgrade (which runs after this one in a full rollback sequence) restores its
own `document_type` rows then drops the table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5b835e4429e'
down_revision: Union[str, None] = 'd64b9136c90d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# The mapped value of each column, as one SQL CASE expression. Known codes map
# to themselves so a case/whitespace variant of a code is rewritten; anything
# else falls to ELSE and keeps the original column value (reported, not
# changed).
ORGANIZATION_TYPE_MAPPED = """
    CASE trim(lower(organization_type))
        WHEN 'cliente' THEN 'customer'
        WHEN 'proveedor' THEN 'supplier'
        WHEN 'socio' THEN 'partner'
        WHEN 'otro' THEN 'other'
        WHEN 'customer' THEN 'customer'
        WHEN 'supplier' THEN 'supplier'
        WHEN 'partner' THEN 'partner'
        WHEN 'other' THEN 'other'
        ELSE organization_type
    END
"""
ORGANIZATION_TYPE_CODES = ("customer", "supplier", "partner", "other")

GENDER_MAPPED = """
    CASE
        WHEN trim(gender) = '' THEN NULL
        WHEN trim(lower(gender)) IN ('masculino','hombre','m','male') THEN 'male'
        WHEN trim(lower(gender)) IN ('femenino','mujer','f','female') THEN 'female'
        WHEN trim(lower(gender)) IN ('otro','other') THEN 'other'
        WHEN trim(lower(gender)) IN ('prefiero no decirlo','prefer_not_to_say','no especifica') THEN 'prefer_not_to_say'
        ELSE gender
    END
"""
GENDER_CODES = ("male", "female", "other", "prefer_not_to_say")


def _normalize(table: str, column: str, mapped: str) -> None:
    """Back up, then rewrite, every row whose mapped value differs."""
    op.execute(
        f"""
        INSERT INTO catalog_migration_backup (table_name, column_name, row_id, original_value)
        SELECT '{table}', '{column}', id, {column}
        FROM {table}
        WHERE {column} IS NOT NULL
          AND ({mapped}) IS DISTINCT FROM {column}
        """
    )
    op.execute(
        f"""
        UPDATE {table}
        SET {column} = {mapped}
        WHERE {column} IS NOT NULL
          AND ({mapped}) IS DISTINCT FROM {column}
        """
    )


def _report(table: str, column: str, codes: tuple[str, ...]) -> None:
    """Distinct value + count only (SEC-05 / Ley 1581 / AC-MIG-07); a value
    outside the catalog codes is flagged UNMAPPED (AC-MIG-04/05, P2-16)."""
    rows = op.get_bind().execute(sa.text(
        f"SELECT {column}, count(*) FROM {table} GROUP BY {column} ORDER BY {column}"
    )).fetchall()
    for value, count in rows:
        flag = "" if value is None or value in codes else "  UNMAPPED (left unchanged)"
        print(f"{table}.{column} = {value!r}: {count} rows{flag}")


def upgrade() -> None:
    # organizations.organization_type: Spanish words and case/whitespace
    # variants of the four codes are rewritten (and backed up first); any
    # other value is left byte-identical and flagged in the report.
    _normalize("organizations", "organization_type", ORGANIZATION_TYPE_MAPPED)
    # users.gender: same rule, plus '' (after trim) -> NULL.
    _normalize("users", "gender", GENDER_MAPPED)

    _report("organizations", "organization_type", ORGANIZATION_TYPE_CODES)
    _report("users", "gender", GENDER_CODES)


def downgrade() -> None:
    op.execute(
        """
        UPDATE organizations o
        SET organization_type = b.original_value
        FROM catalog_migration_backup b
        WHERE b.table_name = 'organizations'
          AND b.column_name = 'organization_type'
          AND b.row_id = o.id
        """
    )
    op.execute(
        """
        UPDATE users u
        SET gender = b.original_value
        FROM catalog_migration_backup b
        WHERE b.table_name = 'users'
          AND b.column_name = 'gender'
          AND b.row_id = u.id
        """
    )
    # The restored rows leave the backup table, so a later upgrade backs each
    # row up once instead of matching duplicates (P2-16).
    op.execute(
        """
        DELETE FROM catalog_migration_backup
        WHERE (table_name, column_name) IN (('organizations', 'organization_type'), ('users', 'gender'))
        """
    )
    # catalog_migration_backup is NOT dropped here -- ISSUE-040 created it and
    # its downgrade (which runs after this one) restores then drops it.
