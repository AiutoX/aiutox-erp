"""Read-only database access for the reference data API (ISSUE-026).

Reference tables are global (no ``tenant_id``), so none of these queries are
tenant-scoped. ``q`` handling follows MODULE-SPEC Section 8 / 9:

- Countries and divisions match ``ILIKE`` against the pre-computed
  ``search_name`` column (NFKD accent-stripped, lowercased at sync time by
  ISSUE-025). The incoming ``q`` is normalized with the *same* function so
  both sides fold identically.
- ``ref_currencies`` / ``ref_languages`` have no ``search_name`` column
  (ISSUE-023 schema), and their row counts are tiny (a few hundred), so they
  are fetched and folded in Python, mirroring how the catalogs read path
  folds accents without the ``unaccent`` extension. A Python substring test
  has no wildcard semantics, so a literal ``%`` / ``_`` in ``q`` only ever
  matches itself (SEC-07).
"""

from typing import Any, cast

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.reference_data.models import (
    RefAdminDivision,
    RefCountry,
    RefCurrency,
    RefLanguage,
    RefSyncState,
)
from app.core.reference_data.sync import _normalize_search_name

_LIKE_ESCAPE = "\\"


def normalize_query(q: str | None) -> str | None:
    """Fold ``q`` like ``search_name`` is folded; ``None`` for blank input."""
    if q is None:
        return None
    folded = _normalize_search_name(q.strip())
    return folded or None


def escape_like(value: str) -> str:
    """Escape backslash, percent and underscore for a literal LIKE match.

    The backslash is escaped first so the escapes added for the two wildcards
    are not themselves doubled. Pair with ``ilike(pattern, escape=...)`` using
    the same escape character.
    """
    return (
        value.replace(_LIKE_ESCAPE, _LIKE_ESCAPE * 2)
        .replace("%", f"{_LIKE_ESCAPE}%")
        .replace("_", f"{_LIKE_ESCAPE}_")
    )


def as_names(raw: Any) -> dict[str, str]:
    """Coerce a ``names`` JSONB value to ``{lang: name}`` (empty if malformed)."""
    return dict(raw) if isinstance(raw, dict) else {}


def _matches(folded_q: str, code: str, raw_names: Any) -> bool:
    """Code prefix-match, or contains-match on the es / en names."""
    names = as_names(raw_names)
    if code.lower().startswith(folded_q):
        return True
    haystack = " ".join(
        _normalize_search_name(names.get(lang, "")) for lang in ("es", "en")
    )
    return folded_q in haystack


class ReferenceRepository:
    """Queries backing ``ReferenceService``."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # -- sync state ---------------------------------------------------------

    def sync_source_version(self, dataset: str) -> str | None:
        """Return the applied ``source_version`` of ``dataset``, or None."""
        return cast(
            "str | None",
            self.db.query(RefSyncState.source_version)
            .filter(RefSyncState.dataset == dataset)
            .scalar(),
        )

    # -- countries / currencies / languages --------------------------------

    def list_countries(
        self, *, q: str | None, include_inactive: bool
    ) -> list[RefCountry]:
        """Countries ordered by code; ``q`` is already folded (or None)."""
        query = self.db.query(RefCountry)
        if not include_inactive:
            query = query.filter(RefCountry.is_active.is_(True))
        if q is not None:
            escaped = escape_like(q)
            query = query.filter(
                RefCountry.search_name.ilike(f"%{escaped}%", escape=_LIKE_ESCAPE)
                | RefCountry.code.ilike(f"{escaped}%", escape=_LIKE_ESCAPE)
            )
        return query.order_by(RefCountry.code).all()

    def list_currencies(
        self, *, q: str | None, include_inactive: bool
    ) -> list[RefCurrency]:
        """Currencies ordered by code; ``q`` is already folded (or None)."""
        query = self.db.query(RefCurrency)
        if not include_inactive:
            query = query.filter(RefCurrency.is_active.is_(True))
        rows = query.order_by(RefCurrency.code).all()
        if q is None:
            return rows
        return [r for r in rows if _matches(q, r.code, r.names)]

    def list_languages(
        self, *, q: str | None, include_inactive: bool
    ) -> list[RefLanguage]:
        """Languages ordered by code; ``q`` is already folded (or None)."""
        query = self.db.query(RefLanguage)
        if not include_inactive:
            query = query.filter(RefLanguage.is_active.is_(True))
        rows = query.order_by(RefLanguage.code).all()
        if q is None:
            return rows
        return [r for r in rows if _matches(q, r.code, r.names)]

    # -- divisions ----------------------------------------------------------

    def country_exists(self, country_code: str) -> bool:
        """True when ``ref_countries`` holds ``country_code`` (any status)."""
        return (
            self.db.query(RefCountry.id).filter(RefCountry.code == country_code).first()
            is not None
        )

    def list_divisions(
        self,
        *,
        country_code: str,
        level: int | None,
        parent_code: str | None,
        q: str | None,
        include_inactive: bool,
        page: int,
        page_size: int,
    ) -> tuple[list[RefAdminDivision], int]:
        """One page of divisions ordered by name then code, plus the total."""
        query = self.db.query(RefAdminDivision).filter(
            RefAdminDivision.country_code == country_code
        )
        if level is not None:
            query = query.filter(RefAdminDivision.level == level)
        if parent_code is not None:
            query = query.filter(RefAdminDivision.parent_code == parent_code)
        if not include_inactive:
            query = query.filter(RefAdminDivision.is_active.is_(True))
        if q is not None:
            escaped = escape_like(q)
            query = query.filter(
                RefAdminDivision.search_name.ilike(f"%{escaped}%", escape=_LIKE_ESCAPE)
                | RefAdminDivision.code.ilike(f"{escaped}%", escape=_LIKE_ESCAPE)
            )

        total = query.with_entities(func.count(RefAdminDivision.id)).scalar() or 0
        rows = (
            query.order_by(RefAdminDivision.name, RefAdminDivision.code)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return rows, total

    def get_division(self, country_code: str, code: str) -> RefAdminDivision | None:
        """Return one division by ``(country_code, code)``, inactive included."""
        return (
            self.db.query(RefAdminDivision)
            .filter(
                RefAdminDivision.country_code == country_code,
                RefAdminDivision.code == code,
            )
            .one_or_none()
        )
