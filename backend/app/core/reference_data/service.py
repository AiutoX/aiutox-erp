"""Read-only business logic for the reference data API (ISSUE-026).

``ReferenceService`` shapes repository rows into response schemas, validates
the country on the divisions endpoints and caches the three small, unpaginated
lists in Redis through ``ReferenceCache`` (ISSUE-025). The cache is fail-open:
a missing/broken Redis behaves like a permanent miss.

Only the ``q``-less variants are cached. ``q`` has unbounded cardinality, so
caching it would let any authenticated caller fill Redis with 24h keys; the
searched variants hit the database (a few hundred rows at most).
"""

import hashlib
import json
import logging
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.core.reference_data.exceptions import (
    raise_country_not_found,
    raise_division_not_found,
)
from app.core.reference_data.repository import (
    ReferenceRepository,
    as_names,
    normalize_query,
)
from app.core.reference_data.schemas import (
    RefAdminDivisionDetailOut,
    RefAdminDivisionOut,
    RefCountriesOut,
    RefCountryOut,
    RefCurrenciesOut,
    RefCurrencyOut,
    RefDivisionParentOut,
    RefLanguageOut,
    RefLanguagesOut,
)

if TYPE_CHECKING:
    from app.core.reference_data.cache import ReferenceCache

logger = logging.getLogger(__name__)

_ADMIN_DIVISIONS_DATASET_PREFIX = "admin_divisions_"


def _params_hash(**params: Any) -> str:
    """Stable short hash of the lookup parameters (cache key suffix)."""
    canonical = json.dumps(params, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()[:16]


class ReferenceService:
    """Countries, currencies, languages and administrative divisions (read-only)."""

    def __init__(self, db: Session, cache: "ReferenceCache | None" = None) -> None:
        self.db = db
        self.repository = ReferenceRepository(db)
        self.cache = cache

    # -- cache helpers ------------------------------------------------------

    def _cached[M: BaseModel](
        self, dataset: str, params_hash: str, model: type[M]
    ) -> M | None:
        if self.cache is None:
            return None
        raw = self.cache.get(dataset, params_hash)
        if raw is None:
            return None
        try:
            return model.model_validate(raw)
        except ValidationError:
            # Corrupt/obsolete entry: treat as a miss, but leave a trace so a
            # cache written in an old shape does not go unnoticed.
            logger.warning(
                "Dropping unreadable reference cache entry dataset=%s "
                "params_hash=%s (treated as a miss)",
                dataset,
                params_hash,
            )
            return None

    def _store(self, dataset: str, params_hash: str, payload: BaseModel) -> None:
        if self.cache is not None:
            self.cache.set(dataset, params_hash, payload.model_dump(mode="json"))

    # -- countries / currencies / languages --------------------------------

    def countries(self, q: str | None, include_inactive: bool) -> RefCountriesOut:
        """All countries (or the ``q`` matches), ordered by code."""
        folded = normalize_query(q)
        key = _params_hash(include_inactive=include_inactive)
        if folded is None:
            hit = self._cached("countries", key, RefCountriesOut)
            if hit is not None:
                return hit

        rows = self.repository.list_countries(
            q=folded, include_inactive=include_inactive
        )
        payload = RefCountriesOut(
            source_version=self.repository.sync_source_version("countries"),
            items=[
                RefCountryOut(
                    code=r.code,
                    names=as_names(r.names),
                    currency_code=r.currency_code,
                    has_divisions=r.has_divisions,
                    is_active=r.is_active,
                )
                for r in rows
            ],
        )
        if folded is None:
            self._store("countries", key, payload)
        return payload

    def currencies(self, q: str | None, include_inactive: bool) -> RefCurrenciesOut:
        """All currencies (or the ``q`` matches), ordered by code."""
        folded = normalize_query(q)
        key = _params_hash(include_inactive=include_inactive)
        if folded is None:
            hit = self._cached("currencies", key, RefCurrenciesOut)
            if hit is not None:
                return hit

        rows = self.repository.list_currencies(
            q=folded, include_inactive=include_inactive
        )
        payload = RefCurrenciesOut(
            source_version=self.repository.sync_source_version("currencies"),
            items=[
                RefCurrencyOut(
                    code=r.code,
                    names=as_names(r.names),
                    symbol=r.symbol,
                    minor_units=r.minor_units,
                    is_active=r.is_active,
                )
                for r in rows
            ],
        )
        if folded is None:
            self._store("currencies", key, payload)
        return payload

    def languages(self, q: str | None, include_inactive: bool) -> RefLanguagesOut:
        """All languages (or the ``q`` matches), ordered by code."""
        folded = normalize_query(q)
        key = _params_hash(include_inactive=include_inactive)
        if folded is None:
            hit = self._cached("languages", key, RefLanguagesOut)
            if hit is not None:
                return hit

        rows = self.repository.list_languages(
            q=folded, include_inactive=include_inactive
        )
        payload = RefLanguagesOut(
            source_version=self.repository.sync_source_version("languages"),
            items=[
                RefLanguageOut(
                    code=r.code,
                    names=as_names(r.names),
                    native_name=r.native_name,
                    is_active=r.is_active,
                )
                for r in rows
            ],
        )
        if folded is None:
            self._store("languages", key, payload)
        return payload

    # -- divisions ----------------------------------------------------------

    def divisions(
        self,
        country: str,
        level: int | None,
        parent_code: str | None,
        q: str | None,
        include_inactive: bool,
        page: int,
        page_size: int,
    ) -> tuple[list[RefAdminDivisionOut], int]:
        """One page of a country's divisions and the total match count.

        Raises:
            APIException: 404 ``REFERENCE_COUNTRY_NOT_FOUND`` when ``country``
                is not in ``ref_countries``. A known country without
                divisions is not an error: it yields ``([], 0)``.
        """
        country_code = country.upper()
        if not self.repository.country_exists(country_code):
            raise_country_not_found(country_code)

        rows, total = self.repository.list_divisions(
            country_code=country_code,
            level=level,
            parent_code=parent_code,
            q=normalize_query(q),
            include_inactive=include_inactive,
            page=page,
            page_size=page_size,
        )
        items = [
            RefAdminDivisionOut.model_validate(r, from_attributes=True) for r in rows
        ]
        return items, total

    def division(self, country: str, code: str) -> RefAdminDivisionDetailOut:
        """One division (inactive included) with its parent and dataset edition.

        Raises:
            APIException: 404 ``REFERENCE_DIVISION_NOT_FOUND`` when the
                country or the division is unknown.
        """
        country_code = country.upper()
        row = self.repository.get_division(country_code, code)
        if row is None:
            raise_division_not_found(country_code, code)

        parent = None
        if row.parent_code is not None:
            parent_row = self.repository.get_division(country_code, row.parent_code)
            if parent_row is not None:
                parent = RefDivisionParentOut(
                    code=parent_row.code, name=parent_row.name
                )

        source_version = (
            self.repository.sync_source_version(
                f"{_ADMIN_DIVISIONS_DATASET_PREFIX}{country_code.lower()}"
            )
            or row.source_version
        )
        base = RefAdminDivisionOut.model_validate(row, from_attributes=True)
        return RefAdminDivisionDetailOut(
            **base.model_dump(), parent=parent, source_version=source_version
        )
