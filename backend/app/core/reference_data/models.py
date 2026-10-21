"""Storage models for the reference data subsystem (MODULE-SPEC Section 9).

Five global tables (no ``tenant_id`` — identical for every tenant, never
tenant-edited):

- ``ref_currencies``: ISO 4217 currencies (CLDR names, symbol, minor units).
- ``ref_languages``: ISO 639-1 languages (CLDR names, native name).
- ``ref_countries``: ISO 3166-1 alpha-2 countries (CLDR names), with an
  optional currency reference.
- ``ref_admin_divisions``: administrative divisions per country (this sprint:
  Colombia departments and municipalities from DANE DIVIPOLA), with a
  self-referencing composite parent FK.
- ``ref_sync_state``: last applied dataset version, for sync idempotency.

Attribute names equal column names. The schema itself is created by a future
Alembic migration (ISSUE-023, pending HITL approval); the constraints
declared here mirror the migration so the metadata and the database agree,
following the same convention as ``app/core/catalogs/models.py``.
"""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    SmallInteger,
    String,
    UniqueConstraint,
    text,
    true,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.core.db.session import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


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


def _active_flag() -> Column[bool]:
    return Column(Boolean, nullable=False, default=True, server_default=true())


def _bool_flag(default: bool) -> Column[bool]:
    return Column(
        Boolean,
        nullable=False,
        default=default,
        server_default=true() if default else text("false"),
    )


class RefCurrency(Base):
    """ISO 4217 currency (global — no tenant scoping)."""

    __tablename__ = "ref_currencies"

    id = _pk()
    code = Column(String(3), nullable=False)
    names = Column(JSONB, nullable=False)
    symbol = Column(String(10), nullable=False)
    minor_units = Column(
        SmallInteger, nullable=False, default=2, server_default=text("2")
    )
    is_active = _active_flag()
    source_version = Column(String(40), nullable=False)
    created_at = _created_at()
    updated_at = _updated_at()

    __table_args__ = (
        UniqueConstraint("code", name="uq_ref_currencies_code"),
        CheckConstraint(
            r"code ~ '^[A-Z]{3}$'",
            name="ck_ref_currencies_code",
        ),
        Index("ix_ref_currencies_code", "code", unique=True),
    )

    def __repr__(self) -> str:
        return f"<RefCurrency(code='{self.code}')>"


class RefLanguage(Base):
    """ISO 639-1 language (global — no tenant scoping)."""

    __tablename__ = "ref_languages"

    id = _pk()
    code = Column(String(3), nullable=False)
    names = Column(JSONB, nullable=False)
    native_name = Column(String(100), nullable=True)
    is_active = _active_flag()
    source_version = Column(String(40), nullable=False)
    created_at = _created_at()
    updated_at = _updated_at()

    __table_args__ = (
        UniqueConstraint("code", name="uq_ref_languages_code"),
        CheckConstraint(
            r"code ~ '^[a-z]{2,3}$'",
            name="ck_ref_languages_code",
        ),
        Index("ix_ref_languages_code", "code", unique=True),
    )

    def __repr__(self) -> str:
        return f"<RefLanguage(code='{self.code}')>"


class RefCountry(Base):
    """ISO 3166-1 alpha-2 country (global — no tenant scoping)."""

    __tablename__ = "ref_countries"

    id = _pk()
    code = Column(String(2), nullable=False)
    names = Column(JSONB, nullable=False)
    search_name = Column(String(300), nullable=False)
    currency_code = Column(
        String(3),
        ForeignKey(
            "ref_currencies.code",
            name="fk_ref_countries_currency",
            ondelete="SET NULL",
        ),
        nullable=True,
    )
    has_divisions = _bool_flag(default=False)
    is_active = _active_flag()
    source_version = Column(String(40), nullable=False)
    created_at = _created_at()
    updated_at = _updated_at()

    __table_args__ = (
        UniqueConstraint("code", name="uq_ref_countries_code"),
        CheckConstraint(
            r"code ~ '^[A-Z]{2}$'",
            name="ck_ref_countries_code",
        ),
        Index("ix_ref_countries_code", "code", unique=True),
    )

    def __repr__(self) -> str:
        return f"<RefCountry(code='{self.code}')>"


class RefAdminDivision(Base):
    """Administrative division of a country (global — no tenant scoping).

    Self-referencing via a composite ``(country_code, parent_code) ->
    (country_code, code)`` FK, because ``code`` is only unique per country,
    not globally. Declared ``DEFERRABLE INITIALLY DEFERRED`` so bulk sync
    (ISSUE-025) can insert level-2 rows before their level-1 parent commits
    within the same transaction.
    """

    __tablename__ = "ref_admin_divisions"

    id = _pk()
    country_code = Column(
        String(2),
        ForeignKey(
            "ref_countries.code",
            name="fk_ref_admin_divisions_country",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )
    code = Column(String(20), nullable=False)
    parent_code = Column(String(20), nullable=True)
    level = Column(SmallInteger, nullable=False)
    name = Column(String(150), nullable=False)
    search_name = Column(String(150), nullable=False)
    attributes = Column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    is_active = _active_flag()
    source_version = Column(String(40), nullable=False)
    created_at = _created_at()
    updated_at = _updated_at()

    __table_args__ = (
        UniqueConstraint(
            "country_code", "code", name="uq_ref_admin_divisions_country_code"
        ),
        CheckConstraint(
            "level IN (1, 2)",
            name="ck_ref_divisions_level",
        ),
        CheckConstraint(
            "(level = 1 AND parent_code IS NULL) "
            "OR (level = 2 AND parent_code IS NOT NULL)",
            name="ck_ref_divisions_parent",
        ),
        ForeignKeyConstraint(
            ["country_code", "parent_code"],
            ["ref_admin_divisions.country_code", "ref_admin_divisions.code"],
            name="fk_ref_divisions_parent",
            deferrable=True,
            initially="DEFERRED",
        ),
        Index(
            "ix_ref_admin_divisions_country_code",
            "country_code",
            "code",
            unique=True,
        ),
        Index(
            "ix_ref_admin_divisions_country_level_parent",
            "country_code",
            "level",
            "parent_code",
        ),
    )

    def __repr__(self) -> str:
        return f"<RefAdminDivision(country_code='{self.country_code}', code='{self.code}')>"


class RefSyncState(Base):
    """Last applied version of a reference dataset (global — no tenant scoping)."""

    __tablename__ = "ref_sync_state"

    id = _pk()
    dataset = Column(String(50), nullable=False)
    source_version = Column(String(40), nullable=False)
    checksum = Column(String(64), nullable=False)
    row_count = Column(Integer, nullable=False)
    synced_at = _created_at()

    __table_args__ = (
        UniqueConstraint("dataset", name="uq_ref_sync_state_dataset"),
        Index("ix_ref_sync_state_dataset", "dataset", unique=True),
    )

    def __repr__(self) -> str:
        return f"<RefSyncState(dataset='{self.dataset}')>"
