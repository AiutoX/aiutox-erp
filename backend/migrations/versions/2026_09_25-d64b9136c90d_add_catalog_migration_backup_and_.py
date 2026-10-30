"""add catalog_migration_backup and normalize document_type

Revision ID: d64b9136c90d
Revises: 2026_09_25_add_reference_data_tables
Create Date: 2026-09-25 20:53:40.291899+00:00

Creates `catalog_migration_backup` (MODULE-SPEC Section 9 shape) and
normalizes `person_identifications.document_type` to lower-case, backing up
every row whose value is about to change before rewriting it. The column's
DB type never changes here -- it was already `sa.String(50)` since
`2025_12_08-002_add_business_models_and_extend_user.py` (verified at line
216: `sa.Column("document_type", sa.String(50), nullable=True)`); only
`app/core/users/models.py`'s ORM annotation changes, in code, not via this
migration. `native_enum=False` on the old `Enum(...)` column type meant
SQLAlchemy already stored a plain VARCHAR with a client-side Python
constraint -- never a Postgres native enum or CHECK -- so there is nothing
for `op.alter_column` to do here.

Raw SQL / `op.execute` only for the data migration -- no import of
`app.core.users.models.DocumentType` or any other application code, per the
`e0a347ce83be` roles-migration precedent
(2026_07_26-e0a347ce83be_grant_users_view_to_manager_and_staff_.py).

`organization_type` (organizations) and `gender` (users) are NOT normalized
or backed up here -- that is ISSUE-041's own migration, in the next
revision. `downgrade()` below restores their backed-up values idempotently
(these UPDATE statements match zero rows until ISSUE-041 lands and writes
its own backup rows) only because this revision is the one that drops
`catalog_migration_backup`, and every backed-up value must be restored
before the table is dropped (AC-MIG-08).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd64b9136c90d'
down_revision: Union[str, None] = '2026_09_25_add_reference_data_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The six codes of core.identity_document_type (app/core/users/catalogs.yaml),
# copied verbatim: no application import in a migration.
DOCUMENT_TYPE_CODES = ("national_id", "dni", "passport", "drivers_license", "tax_id", "other")
DOCUMENT_TYPE_CODES_SQL = "(" + ", ".join(f"'{code}'" for code in DOCUMENT_TYPE_CODES) + ")"


def upgrade() -> None:
    op.create_table(
        "catalog_migration_backup",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("table_name", sa.String(100), nullable=False),
        sa.Column("column_name", sa.String(100), nullable=False),
        sa.Column("row_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("original_value", sa.Text(), nullable=True),
        sa.Column(
            "migrated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_catalog_migration_backup_table_row",
        "catalog_migration_backup",
        ["table_name", "row_id"],
    )

    # Backup rows whose value will change, then normalize. Verbatim SQL only
    # -- no import of app.core.users.models.DocumentType (roles-migration
    # precedent, e0a347ce83be: raw op.execute, no app code imports).
    # Only a value whose lower() is one of the six codes is rewritten; a
    # value outside them is reported, not changed (MODULE-SPEC Section 5
    # step 2, AC-MIG-03; phase 220 review P1-13, gate 238). Codes verbatim
    # from app/core/users/catalogs.yaml (core.identity_document_type).
    op.execute(
        f"""
        INSERT INTO catalog_migration_backup (table_name, column_name, row_id, original_value)
        SELECT 'person_identifications', 'document_type', id, document_type
        FROM person_identifications
        WHERE document_type IS NOT NULL
          AND lower(document_type) IN {DOCUMENT_TYPE_CODES_SQL}
          AND lower(document_type) IS DISTINCT FROM document_type
        """
    )
    op.execute(
        f"""
        UPDATE person_identifications
        SET document_type = lower(document_type)
        WHERE document_type IS NOT NULL
          AND lower(document_type) IN {DOCUMENT_TYPE_CODES_SQL}
          AND lower(document_type) IS DISTINCT FROM document_type
        """
    )

    # Report: distinct value + count only (SEC-05 / AC-MIG-07) -- never a
    # per-row identifier such as a UUID, email, or name. A value outside the
    # six codes is flagged UNMAPPED.
    report = op.get_bind().execute(sa.text(
        "SELECT document_type, count(*) FROM person_identifications "
        "GROUP BY document_type ORDER BY document_type"
    )).fetchall()
    for value, count in report:
        flag = "" if value is None or value in DOCUMENT_TYPE_CODES else "  UNMAPPED (left unchanged)"
        print(f"person_identifications.document_type = {value!r}: {count} rows{flag}")

    # No op.alter_column here: the column is already sa.String(50) at the DB
    # level (verified 2025_12_08-002_add_business_models_and_extend_user.py:216).
    # Only app/core/users/models.py's Python-level ORM type annotation
    # changes, in code, not via this migration.


def downgrade() -> None:
    # 1. Restore every backed-up original_value into (table_name, column_name, row_id).
    #    One literal UPDATE per (table, column) pair this sprint backs up. ISSUE-041's
    #    downgrade has already restored its own rows; re-applying them here is idempotent.
    op.execute(
        """
        UPDATE person_identifications t
        SET document_type = b.original_value
        FROM catalog_migration_backup b
        WHERE b.table_name = 'person_identifications'
          AND b.column_name = 'document_type'
          AND b.row_id = t.id
        """
    )
    op.execute(
        """
        UPDATE organizations t
        SET organization_type = b.original_value
        FROM catalog_migration_backup b
        WHERE b.table_name = 'organizations'
          AND b.column_name = 'organization_type'
          AND b.row_id = t.id
        """
    )
    op.execute(
        """
        UPDATE users t
        SET gender = b.original_value
        FROM catalog_migration_backup b
        WHERE b.table_name = 'users'
          AND b.column_name = 'gender'
          AND b.row_id = t.id
        """
    )
    # 2. THEN drop the backup table this revision created (MS Section 5 "Downgrade").
    #    AC-MIG-08 forbids dropping it only on the upgrade path.
    op.drop_index(
        "ix_catalog_migration_backup_table_row",
        table_name="catalog_migration_backup",
    )
    op.drop_table("catalog_migration_backup")
