"""create reference data tables

Revision ID: 2026_09_25_add_reference_data_tables
Revises: 2026_09_25_grant_catalogs_manage
Create Date: 2026-09-25

Creates the five reference-data storage tables of MODULE-SPEC Section 9:
ref_currencies, ref_languages, ref_countries, ref_admin_divisions,
ref_sync_state. Table creation only; population is ISSUE-025's sync service.

NOTE ON DEFERRABLE: fk_ref_divisions_parent on ref_admin_divisions is the
first DEFERRABLE constraint in this codebase (confirmed via
`grep -rn DEFERRABLE backend/migrations/versions/*.py backend/app/` — zero
prior matches). It exists because ISSUE-025's bulk sync may insert a
level-2 division row referencing a level-1 parent that has not yet been
committed within the same transaction; DEFERRABLE INITIALLY DEFERRED defers
the FK check to COMMIT time instead of per-statement, allowing that
insertion order. All other FKs in this migration are ordinary (checked
immediately).
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "2026_09_25_add_reference_data_tables"
down_revision = "2026_09_25_grant_catalogs_manage"
branch_labels = None
depends_on = None


def _pk() -> sa.Column:
    return sa.Column(
        "id",
        postgresql.UUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )


def _ts(name: str) -> sa.Column:
    return sa.Column(
        name,
        sa.TIMESTAMP(timezone=True),
        nullable=False,
        server_default=sa.text("now()"),
    )


def _active(default: bool = True) -> sa.Column:
    return sa.Column(
        "is_active",
        sa.Boolean(),
        nullable=False,
        server_default=sa.true() if default else sa.false(),
    )


def upgrade() -> None:
    # -- ref_currencies (no inbound FK dependency) --------------------------
    op.create_table(
        "ref_currencies",
        _pk(),
        sa.Column("code", sa.String(length=3), nullable=False),
        sa.Column("names", postgresql.JSONB(), nullable=False),
        sa.Column("symbol", sa.String(length=10), nullable=False),
        sa.Column(
            "minor_units",
            sa.SmallInteger(),
            nullable=False,
            server_default=sa.text("2"),
        ),
        _active(),
        sa.Column("source_version", sa.String(length=40), nullable=False),
        _ts("created_at"),
        _ts("updated_at"),
        sa.UniqueConstraint("code", name="uq_ref_currencies_code"),
        sa.CheckConstraint(r"code ~ '^[A-Z]{3}$'", name="ck_ref_currencies_code"),
    )
    op.create_index(
        "ix_ref_currencies_code", "ref_currencies", ["code"], unique=True
    )

    # -- ref_languages (no inbound FK dependency) ----------------------------
    op.create_table(
        "ref_languages",
        _pk(),
        sa.Column("code", sa.String(length=3), nullable=False),
        sa.Column("names", postgresql.JSONB(), nullable=False),
        sa.Column("native_name", sa.String(length=100), nullable=True),
        _active(),
        sa.Column("source_version", sa.String(length=40), nullable=False),
        _ts("created_at"),
        _ts("updated_at"),
        sa.UniqueConstraint("code", name="uq_ref_languages_code"),
        sa.CheckConstraint(r"code ~ '^[a-z]{2,3}$'", name="ck_ref_languages_code"),
    )
    op.create_index(
        "ix_ref_languages_code", "ref_languages", ["code"], unique=True
    )

    # -- ref_countries (depends on ref_currencies) ---------------------------
    op.create_table(
        "ref_countries",
        _pk(),
        sa.Column("code", sa.String(length=2), nullable=False),
        sa.Column("names", postgresql.JSONB(), nullable=False),
        sa.Column("search_name", sa.String(length=300), nullable=False),
        sa.Column(
            "currency_code",
            sa.String(length=3),
            sa.ForeignKey(
                "ref_currencies.code",
                name="fk_ref_countries_currency",
                ondelete="SET NULL",
            ),
            nullable=True,
        ),
        sa.Column(
            "has_divisions",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        _active(),
        sa.Column("source_version", sa.String(length=40), nullable=False),
        _ts("created_at"),
        _ts("updated_at"),
        sa.UniqueConstraint("code", name="uq_ref_countries_code"),
        sa.CheckConstraint(r"code ~ '^[A-Z]{2}$'", name="ck_ref_countries_code"),
    )
    op.create_index("ix_ref_countries_code", "ref_countries", ["code"], unique=True)

    # -- ref_admin_divisions (depends on ref_countries; self-referencing) ----
    op.create_table(
        "ref_admin_divisions",
        _pk(),
        sa.Column(
            "country_code",
            sa.String(length=2),
            sa.ForeignKey(
                "ref_countries.code",
                name="fk_ref_admin_divisions_country",
                ondelete="RESTRICT",
            ),
            nullable=False,
        ),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("parent_code", sa.String(length=20), nullable=True),
        sa.Column("level", sa.SmallInteger(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("search_name", sa.String(length=150), nullable=False),
        sa.Column(
            "attributes",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        _active(),
        sa.Column("source_version", sa.String(length=40), nullable=False),
        _ts("created_at"),
        _ts("updated_at"),
        sa.UniqueConstraint(
            "country_code", "code", name="uq_ref_admin_divisions_country_code"
        ),
        sa.CheckConstraint("level IN (1, 2)", name="ck_ref_divisions_level"),
        sa.CheckConstraint(
            "(level = 1 AND parent_code IS NULL) "
            "OR (level = 2 AND parent_code IS NOT NULL)",
            name="ck_ref_divisions_parent",
        ),
        sa.ForeignKeyConstraint(
            ["country_code", "parent_code"],
            ["ref_admin_divisions.country_code", "ref_admin_divisions.code"],
            name="fk_ref_divisions_parent",
            deferrable=True,
            initially="DEFERRED",
        ),
    )
    op.create_index(
        "ix_ref_admin_divisions_country_code",
        "ref_admin_divisions",
        ["country_code", "code"],
        unique=True,
    )
    op.create_index(
        "ix_ref_admin_divisions_country_level_parent",
        "ref_admin_divisions",
        ["country_code", "level", "parent_code"],
    )

    # -- ref_sync_state (no FK; order-independent) ---------------------------
    op.create_table(
        "ref_sync_state",
        _pk(),
        sa.Column("dataset", sa.String(length=50), nullable=False),
        sa.Column("source_version", sa.String(length=40), nullable=False),
        sa.Column("checksum", sa.String(length=64), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        _ts("synced_at"),
        sa.UniqueConstraint("dataset", name="uq_ref_sync_state_dataset"),
    )
    op.create_index(
        "ix_ref_sync_state_dataset", "ref_sync_state", ["dataset"], unique=True
    )


def downgrade() -> None:
    # Reverse dependency order; dropping a table drops its indexes and
    # constraints (including the composite self-referencing FK).
    op.drop_table("ref_sync_state")
    op.drop_table("ref_admin_divisions")
    op.drop_table("ref_countries")
    op.drop_table("ref_languages")
    op.drop_table("ref_currencies")
