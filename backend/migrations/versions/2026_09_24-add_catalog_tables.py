"""add catalog tables

Revision ID: 2026_09_24_add_catalog_tables
Revises: 2026_09_24_add_is_superuser
Create Date: 2026-09-24

Creates the five catalog storage tables of MODULE-SPEC Section 9:
catalog_lists, catalog_items, catalog_item_overrides, catalog_item_versions,
catalog_list_versions. Table creation only; declared catalogs are populated
by sync, not by this migration.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "2026_09_24_add_catalog_tables"
down_revision = "2026_09_24_add_is_superuser"
branch_labels = None
depends_on = None

NIL_UUID = "00000000-0000-0000-0000-000000000000"


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


def _flag(name: str) -> sa.Column:
    return sa.Column(name, sa.Boolean(), nullable=False, server_default=sa.false())


def upgrade() -> None:
    op.create_table(
        "catalog_lists",
        _pk(),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("owner_module", sa.String(length=50), nullable=False),
        sa.Column("labels", postgresql.JSONB(), nullable=False),
        sa.Column("description", postgresql.JSONB(), nullable=True),
        _flag("tenant_can_manage"),
        _flag("is_extensible"),
        _flag("is_locked"),
        sa.Column("manage_permission", sa.String(length=100), nullable=True),
        sa.Column("declaration_checksum", sa.String(length=64), nullable=False),
        sa.Column("deprecated_at", sa.TIMESTAMP(timezone=True), nullable=True),
        _ts("created_at"),
        _ts("updated_at"),
        sa.UniqueConstraint("key", name="uq_catalog_lists_key"),
        sa.CheckConstraint(
            r"key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'",
            name="ck_catalog_lists_key_format",
        ),
        sa.CheckConstraint(
            "NOT (is_locked AND is_extensible)",
            name="ck_catalog_lists_lock_ext",
        ),
        sa.CheckConstraint(
            "NOT is_extensible OR tenant_can_manage",
            name="ck_catalog_lists_ext_manage",
        ),
    )
    op.create_index("ix_catalog_lists_owner_module", "catalog_lists", ["owner_module"])

    op.create_table(
        "catalog_items",
        _pk(),
        sa.Column(
            "list_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "catalog_lists.id", name="fk_catalog_items_list", ondelete="RESTRICT"
            ),
            nullable=False,
        ),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "tenants.id", name="fk_catalog_items_tenant", ondelete="CASCADE"
            ),
            nullable=True,
        ),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("labels", postgresql.JSONB(), nullable=False),
        sa.Column(
            "sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "attributes",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("is_system", sa.Boolean(), nullable=False),
        _flag("is_hidden"),
        sa.Column("deprecated_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "users.id", name="fk_catalog_items_created_by", ondelete="SET NULL"
            ),
            nullable=True,
        ),
        _ts("created_at"),
        _ts("updated_at"),
        sa.CheckConstraint(
            "(tenant_id IS NULL AND code ~ '^[a-z][a-z0-9_]{0,63}$' "
            "AND code !~ '^x_') "
            "OR (tenant_id IS NOT NULL AND code ~ '^x_[a-z0-9_]{1,62}$')",
            name="ck_catalog_items_code_format",
        ),
        sa.CheckConstraint(
            "is_system = (tenant_id IS NULL)",
            name="ck_catalog_items_is_system",
        ),
        sa.CheckConstraint(
            "tenant_id IS NOT NULL OR is_hidden = false",
            name="ck_catalog_items_hidden_tenant_only",
        ),
    )
    op.create_index(
        "uq_catalog_items_system_code",
        "catalog_items",
        ["list_id", "code"],
        unique=True,
        postgresql_where=sa.text("tenant_id IS NULL"),
    )
    op.create_index(
        "uq_catalog_items_tenant_code",
        "catalog_items",
        ["list_id", "tenant_id", "code"],
        unique=True,
        postgresql_where=sa.text("tenant_id IS NOT NULL"),
    )
    op.create_index(
        "ix_catalog_items_list_tenant", "catalog_items", ["list_id", "tenant_id"]
    )

    op.create_table(
        "catalog_item_overrides",
        _pk(),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "tenants.id",
                name="fk_catalog_item_overrides_tenant",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),
        sa.Column(
            "item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "catalog_items.id",
                name="fk_catalog_item_overrides_item",
                ondelete="RESTRICT",
            ),
            nullable=False,
        ),
        sa.Column("labels", postgresql.JSONB(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        _flag("is_hidden"),
        sa.Column(
            "updated_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "users.id",
                name="fk_catalog_item_overrides_updated_by",
                ondelete="SET NULL",
            ),
            nullable=True,
        ),
        _ts("created_at"),
        _ts("updated_at"),
        sa.UniqueConstraint(
            "tenant_id", "item_id", name="uq_catalog_item_overrides_tenant_item"
        ),
    )
    op.create_index(
        "ix_catalog_item_overrides_tenant_id", "catalog_item_overrides", ["tenant_id"]
    )

    op.create_table(
        "catalog_item_versions",
        _pk(),
        sa.Column(
            "item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "catalog_items.id",
                name="fk_catalog_item_versions_item",
                ondelete="RESTRICT",
            ),
            nullable=False,
        ),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "tenants.id",
                name="fk_catalog_item_versions_tenant",
                ondelete="CASCADE",
            ),
            nullable=True,
        ),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("change_type", sa.String(length=30), nullable=False),
        sa.Column("before", postgresql.JSONB(), nullable=True),
        sa.Column("after", postgresql.JSONB(), nullable=True),
        sa.Column("batch_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "changed_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "users.id",
                name="fk_catalog_item_versions_changed_by",
                ondelete="SET NULL",
            ),
            nullable=True,
        ),
        sa.Column("change_reason", sa.Text(), nullable=True),
        _ts("created_at"),
        sa.CheckConstraint(
            "change_type IN ('created', 'synced', 'labels_updated', 'reordered', "
            "'hidden', 'unhidden', 'reset', 'deprecated', 'reactivated')",
            name="ck_catalog_item_versions_change_type",
        ),
    )
    op.create_index(
        "ix_catalog_item_versions_item_tenant_version",
        "catalog_item_versions",
        ["item_id", "tenant_id", sa.text("version_number DESC")],
    )
    op.create_index(
        "uq_catalog_item_versions_scope_version",
        "catalog_item_versions",
        [
            "item_id",
            sa.text(f"COALESCE(tenant_id, '{NIL_UUID}'::uuid)"),
            "version_number",
        ],
        unique=True,
    )

    op.create_table(
        "catalog_list_versions",
        _pk(),
        sa.Column(
            "list_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "catalog_lists.id",
                name="fk_catalog_list_versions_list",
                ondelete="RESTRICT",
            ),
            nullable=False,
        ),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("change_type", sa.String(length=30), nullable=False),
        sa.Column("before", postgresql.JSONB(), nullable=True),
        sa.Column("after", postgresql.JSONB(), nullable=True),
        sa.Column(
            "changed_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "users.id",
                name="fk_catalog_list_versions_changed_by",
                ondelete="SET NULL",
            ),
            nullable=True,
        ),
        sa.Column(
            "actor_tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "tenants.id",
                name="fk_catalog_list_versions_actor_tenant",
                ondelete="SET NULL",
            ),
            nullable=True,
        ),
        sa.Column("change_reason", sa.Text(), nullable=True),
        _ts("created_at"),
        sa.UniqueConstraint(
            "list_id", "version_number", name="uq_catalog_list_versions"
        ),
        sa.CheckConstraint(
            "change_type <> 'governance_updated' "
            "OR (change_reason IS NOT NULL AND char_length(change_reason) >= 10)",
            name="ck_catalog_list_versions_reason",
        ),
        sa.CheckConstraint(
            "change_type IN ('created', 'declaration_synced', "
            "'governance_updated', 'deprecated', 'reactivated')",
            name="ck_catalog_list_versions_change_type",
        ),
    )


def downgrade() -> None:
    # Reverse dependency order; dropping a table drops its indexes and constraints.
    op.drop_table("catalog_list_versions")
    op.drop_table("catalog_item_versions")
    op.drop_table("catalog_item_overrides")
    op.drop_table("catalog_items")
    op.drop_table("catalog_lists")
