"""Storage models for the catalogs subsystem (MODULE-SPEC Section 9).

Five tables:

- ``catalog_lists``: one row per declared option list, with its governance
  flags. Global (no ``tenant_id``): a list and its governance apply to every
  tenant.
- ``catalog_items``: the options of a list. System items (``tenant_id IS
  NULL``) and tenant-added items share the table.
- ``catalog_item_overrides``: a tenant's label / order / visibility changes to
  a system item.
- ``catalog_item_versions``: append-only history of item and override changes.
- ``catalog_list_versions``: append-only history of list creation, declaration
  syncs and governance changes.

Attribute names equal column names. The schema itself is created by the
Alembic migration ``2026_09_24_add_catalog_tables``; the constraints declared
here mirror it so the metadata and the database agree.
"""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    false,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.core.db.session import Base

ITEM_CHANGE_TYPES = (
    "created",
    "synced",
    "labels_updated",
    "reordered",
    "hidden",
    "unhidden",
    "reset",
    "deprecated",
    "reactivated",
)

LIST_CHANGE_TYPES = (
    "created",
    "declaration_synced",
    "governance_updated",
    "deprecated",
    "reactivated",
)

NIL_UUID = "00000000-0000-0000-0000-000000000000"


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _in_list(column: str, values: tuple[str, ...]) -> str:
    quoted = ", ".join(f"'{value}'" for value in values)
    return f"{column} IN ({quoted})"


def _pk() -> Column[Any]:
    return Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )


def _created_at() -> Column[datetime]:
    return Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        default=_utcnow,
        server_default=text("now()"),
    )


def _updated_at() -> Column[datetime]:
    return Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        default=_utcnow,
        onupdate=_utcnow,
        server_default=text("now()"),
    )


def _flag() -> Column[bool]:
    return Column(Boolean, nullable=False, default=False, server_default=false())


def _fk(target: str, name: str, ondelete: str, *, nullable: bool) -> Column[Any]:
    return Column(
        PG_UUID(as_uuid=True),
        ForeignKey(target, name=name, ondelete=ondelete),
        nullable=nullable,
    )


class CatalogList(Base):
    """A declared option list and its governance flags (global, no tenant)."""

    __tablename__ = "catalog_lists"

    id = _pk()
    key = Column(String(100), nullable=False)
    owner_module = Column(String(50), nullable=False)
    labels = Column(JSONB, nullable=False)
    description = Column(JSONB, nullable=True)
    tenant_can_manage = _flag()
    is_extensible = _flag()
    is_locked = _flag()
    manage_permission = Column(String(100), nullable=True)
    declaration_checksum = Column(String(64), nullable=False)
    deprecated_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = _created_at()
    updated_at = _updated_at()

    __table_args__ = (
        UniqueConstraint("key", name="uq_catalog_lists_key"),
        CheckConstraint(
            r"key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'",
            name="ck_catalog_lists_key_format",
        ),
        CheckConstraint(
            "NOT (is_locked AND is_extensible)",
            name="ck_catalog_lists_lock_ext",
        ),
        CheckConstraint(
            "NOT is_extensible OR tenant_can_manage",
            name="ck_catalog_lists_ext_manage",
        ),
        Index("ix_catalog_lists_owner_module", "owner_module"),
    )

    def __repr__(self) -> str:
        return f"<CatalogList(id={self.id}, key='{self.key}')>"


class CatalogItem(Base):
    """An option of a list: a system item (tenant_id NULL) or a tenant item."""

    __tablename__ = "catalog_items"

    id = _pk()
    list_id = _fk(
        "catalog_lists.id", "fk_catalog_items_list", "RESTRICT", nullable=False
    )
    tenant_id = _fk("tenants.id", "fk_catalog_items_tenant", "CASCADE", nullable=True)
    code = Column(String(64), nullable=False)
    labels = Column(JSONB, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0, server_default=text("0"))
    attributes = Column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    is_system = Column(Boolean, nullable=False)
    is_hidden = _flag()
    deprecated_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_by = _fk(
        "users.id", "fk_catalog_items_created_by", "SET NULL", nullable=True
    )
    created_at = _created_at()
    updated_at = _updated_at()

    __table_args__ = (
        CheckConstraint(
            "(tenant_id IS NULL AND code ~ '^[a-z][a-z0-9_]{0,63}$' "
            "AND code !~ '^x_') "
            "OR (tenant_id IS NOT NULL AND code ~ '^x_[a-z0-9_]{1,62}$')",
            name="ck_catalog_items_code_format",
        ),
        CheckConstraint(
            "is_system = (tenant_id IS NULL)",
            name="ck_catalog_items_is_system",
        ),
        CheckConstraint(
            "tenant_id IS NOT NULL OR is_hidden = false",
            name="ck_catalog_items_hidden_tenant_only",
        ),
        Index(
            "uq_catalog_items_system_code",
            "list_id",
            "code",
            unique=True,
            postgresql_where=text("tenant_id IS NULL"),
        ),
        Index(
            "uq_catalog_items_tenant_code",
            "list_id",
            "tenant_id",
            "code",
            unique=True,
            postgresql_where=text("tenant_id IS NOT NULL"),
        ),
        Index("ix_catalog_items_list_tenant", "list_id", "tenant_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<CatalogItem(id={self.id}, list_id={self.list_id}, "
            f"tenant_id={self.tenant_id}, code='{self.code}')>"
        )


class CatalogItemOverride(Base):
    """A tenant's changes to a system item. NULL columns inherit the default."""

    __tablename__ = "catalog_item_overrides"

    id = _pk()
    tenant_id = _fk(
        "tenants.id", "fk_catalog_item_overrides_tenant", "CASCADE", nullable=False
    )
    item_id = _fk(
        "catalog_items.id",
        "fk_catalog_item_overrides_item",
        "RESTRICT",
        nullable=False,
    )
    labels = Column(JSONB, nullable=True)
    sort_order = Column(Integer, nullable=True)
    is_hidden = _flag()
    updated_by = _fk(
        "users.id",
        "fk_catalog_item_overrides_updated_by",
        "SET NULL",
        nullable=True,
    )
    created_at = _created_at()
    updated_at = _updated_at()

    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "item_id", name="uq_catalog_item_overrides_tenant_item"
        ),
        Index("ix_catalog_item_overrides_tenant_id", "tenant_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<CatalogItemOverride(id={self.id}, tenant_id={self.tenant_id}, "
            f"item_id={self.item_id})>"
        )


class CatalogItemVersion(Base):
    """Append-only history of an item or of a tenant's override of it."""

    __tablename__ = "catalog_item_versions"

    id = _pk()
    item_id = _fk(
        "catalog_items.id",
        "fk_catalog_item_versions_item",
        "RESTRICT",
        nullable=False,
    )
    tenant_id = _fk(
        "tenants.id", "fk_catalog_item_versions_tenant", "CASCADE", nullable=True
    )
    version_number = Column(Integer, nullable=False)
    change_type = Column(String(30), nullable=False)
    before = Column(JSONB, nullable=True)
    after = Column(JSONB, nullable=True)
    batch_id = Column(PG_UUID(as_uuid=True), nullable=True)
    changed_by = _fk(
        "users.id",
        "fk_catalog_item_versions_changed_by",
        "SET NULL",
        nullable=True,
    )
    change_reason = Column(Text, nullable=True)
    created_at = _created_at()

    __table_args__ = (
        CheckConstraint(
            _in_list("change_type", ITEM_CHANGE_TYPES),
            name="ck_catalog_item_versions_change_type",
        ),
        Index(
            "ix_catalog_item_versions_item_tenant_version",
            "item_id",
            "tenant_id",
            text("version_number DESC"),
        ),
        Index(
            "uq_catalog_item_versions_scope_version",
            "item_id",
            text(f"COALESCE(tenant_id, '{NIL_UUID}'::uuid)"),
            "version_number",
            unique=True,
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<CatalogItemVersion(id={self.id}, item_id={self.item_id}, "
            f"v={self.version_number}, change_type='{self.change_type}')>"
        )


class CatalogListVersion(Base):
    """Append-only history of list creation, syncs and governance changes."""

    __tablename__ = "catalog_list_versions"

    id = _pk()
    list_id = _fk(
        "catalog_lists.id",
        "fk_catalog_list_versions_list",
        "RESTRICT",
        nullable=False,
    )
    version_number = Column(Integer, nullable=False)
    change_type = Column(String(30), nullable=False)
    before = Column(JSONB, nullable=True)
    after = Column(JSONB, nullable=True)
    changed_by = _fk(
        "users.id",
        "fk_catalog_list_versions_changed_by",
        "SET NULL",
        nullable=True,
    )
    actor_tenant_id = _fk(
        "tenants.id",
        "fk_catalog_list_versions_actor_tenant",
        "SET NULL",
        nullable=True,
    )
    change_reason = Column(Text, nullable=True)
    created_at = _created_at()

    __table_args__ = (
        UniqueConstraint("list_id", "version_number", name="uq_catalog_list_versions"),
        CheckConstraint(
            "change_type <> 'governance_updated' "
            "OR (change_reason IS NOT NULL AND char_length(change_reason) >= 10)",
            name="ck_catalog_list_versions_reason",
        ),
        CheckConstraint(
            _in_list("change_type", LIST_CHANGE_TYPES),
            name="ck_catalog_list_versions_change_type",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<CatalogListVersion(id={self.id}, list_id={self.list_id}, "
            f"v={self.version_number}, change_type='{self.change_type}')>"
        )
