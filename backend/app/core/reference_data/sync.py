"""Reference data synchronization service (ISSUE-025).

``ReferenceDataSyncService.sync_all`` loads the four committed JSON files
(ISSUE-024) and upserts their rows into ``ref_currencies``, ``ref_countries``,
``ref_languages`` and ``ref_admin_divisions`` (ISSUE-023), in FK order:
currencies -> countries -> languages -> admin_divisions_co.

Mirrors the shape of ``app.core.catalogs.sync.CatalogSyncService`` (load
declarations, checksum-skip unchanged, advisory lock, fail loudly), but:

- there is no tenant-override concept here -- every row is global;
- there is no per-row version table -- ``ref_sync_state`` tracks one
  checksum/version per *dataset*, not per row;
- the checksum compared against ``ref_sync_state.checksum`` is read directly
  from each JSON file's own ``checksum`` header field (ISSUE-024's generator
  already computed it over the file's ``rows`` array) -- this service never
  hashes anything itself.

Rows are never deleted: a row present in a dataset's prior sync but missing
from a re-synced file is marked ``is_active=false`` (E-15).

sync_all commits its own transaction (unlike CatalogSyncService.sync_all,
which only flushes) because this service also owns deciding when to call
``cache.invalidate_all()`` -- that call only makes sense once the write is
durable.
"""

import hashlib
import json
import logging
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any, cast

from sqlalchemy import text

from app.core.reference_data.models import (
    RefAdminDivision,
    RefCountry,
    RefCurrency,
    RefLanguage,
    RefSyncState,
)

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.core.reference_data.cache import ReferenceCache

logger = logging.getLogger(__name__)

# Fixed pg_advisory_xact_lock key for the reference-data sync transaction --
# the first 8 bytes of a SHA-256, read as a signed 64-bit int so it fits
# Postgres' bigint lock-key range. Distinct from the catalog sync's own key
# (app.core.catalogs.sync._SYNC_LOCK_KEY) so the two subsystems never
# contend with each other unnecessarily.
_SYNC_LOCK_KEY = int.from_bytes(
    hashlib.sha256(b"aiutox:reference_data:sync").digest()[:8], "big", signed=True
)

_DEFAULT_DATA_DIR = Path(__file__).resolve().parent / "data"

# Dataset names, in FK-safe sync order: currencies have no FK dependency,
# countries FK to currencies, languages are independent, admin_divisions_co
# FKs to countries (and self-FKs, deferred at the DB level).
_DATASET_ORDER = ("currencies", "countries", "languages", "admin_divisions_co")

_DATASET_FILES = {
    "currencies": "currencies.json",
    "countries": "countries.json",
    "languages": "languages.json",
    "admin_divisions_co": "admin_divisions_co.json",
}


@dataclass
class DatasetSyncResult:
    """What one dataset's sync did (MODULE-SPEC Audit Trail: reference sync)."""

    dataset: str
    skipped: bool = False
    old_version: str | None = None
    new_version: str | None = None
    inserted: int = 0
    updated: int = 0
    deactivated: int = 0


@dataclass
class RefSyncReport:
    """Counters returned by ReferenceDataSyncService.sync_all."""

    datasets_synced: int
    datasets_skipped: int
    results: list[DatasetSyncResult] = field(default_factory=list)


def _normalize_search_name(value: str) -> str:
    """Lowercase, NFKD accent-stripped normalization (MS Section 8).

    "Bogotá" -> "bogota".
    """
    decomposed = unicodedata.normalize("NFKD", value)
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return stripped.lower()


def _load_dataset_file(data_dir: Path, dataset: str) -> dict[str, Any]:
    file_path = data_dir / _DATASET_FILES[dataset]
    with file_path.open(encoding="utf-8") as f:
        return cast(dict[str, Any], json.load(f))


class ReferenceDataSyncService:
    """Loads the committed reference data JSON files and syncs them to the DB."""

    def __init__(self, db: "Session", cache: "ReferenceCache") -> None:
        """Initialize the service.

        Args:
            db: The database session. sync_all commits its own transaction.
            cache: The reference cache; invalidate_all() is called once per
                sync_all invocation that wrote any change.
        """
        self.db = db
        self.cache = cache

    def sync_all(
        self,
        data_dir: Path | None = None,
        force: bool = False,
        dataset: str | None = None,
    ) -> RefSyncReport:
        """Sync reference datasets from their committed JSON files.

        Args:
            data_dir: Directory containing the dataset JSON files. Defaults
                to app/core/reference_data/data/.
            force: When True, re-applies a dataset even if its checksum is
                unchanged from the stored ref_sync_state row.
            dataset: When given, syncs only this one dataset. Must be one of
                "countries", "currencies", "languages", "admin_divisions_co".

        Returns:
            A RefSyncReport with the counts of datasets synced vs. skipped.

        Raises:
            ValueError: If `dataset` is given and is not a known dataset name.
        """
        if dataset is not None and dataset not in _DATASET_ORDER:
            raise ValueError(
                f"Unknown reference dataset: {dataset!r}. "
                f"Expected one of {_DATASET_ORDER!r}."
            )

        resolved_data_dir = data_dir if data_dir is not None else _DEFAULT_DATA_DIR
        datasets_to_sync = (dataset,) if dataset is not None else _DATASET_ORDER

        # Serialize concurrent syncs for the duration of this transaction.
        self.db.execute(
            text("SELECT pg_advisory_xact_lock(:key)"), {"key": _SYNC_LOCK_KEY}
        )

        report = RefSyncReport(datasets_synced=0, datasets_skipped=0)
        any_changed = False

        for name in datasets_to_sync:
            result = self._sync_one_dataset(resolved_data_dir, name, force=force)
            report.results.append(result)
            if result.skipped:
                report.datasets_skipped += 1
            else:
                report.datasets_synced += 1
                any_changed = True
            self._log_dataset_result(result)

        self.db.commit()

        if any_changed:
            self.cache.invalidate_all()

        logger.info(
            "Reference data sync: datasets_synced=%d datasets_skipped=%d",
            report.datasets_synced,
            report.datasets_skipped,
        )
        return report

    @staticmethod
    def _log_dataset_result(result: DatasetSyncResult) -> None:
        """One log line per dataset; WARNING when any row was deactivated."""
        message = (
            "Reference data sync dataset=%s skipped=%s old_version=%s "
            "new_version=%s inserted=%d updated=%d deactivated=%d"
        )
        args = (
            result.dataset,
            result.skipped,
            result.old_version,
            result.new_version,
            result.inserted,
            result.updated,
            result.deactivated,
        )
        if result.deactivated:
            logger.warning(message, *args)
        else:
            logger.info(message, *args)

    def _sync_one_dataset(
        self, data_dir: Path, dataset: str, *, force: bool
    ) -> DatasetSyncResult:
        """Sync one dataset.

        Returns a result with ``skipped=True`` when nothing was written
        (checksum unchanged and not forced), otherwise the inserted / updated /
        deactivated row counts.
        """
        payload = _load_dataset_file(data_dir, dataset)
        checksum = payload["checksum"]
        source_version = payload["source_version"]
        rows = payload["rows"]

        state = (
            self.db.query(RefSyncState)
            .filter(RefSyncState.dataset == dataset)
            .one_or_none()
        )

        if state is not None and state.checksum == checksum and not force:
            # AC-REF-04 / AC-SYNC-13 order-equivalent: unchanged -> no writes.
            version = state.source_version
            return DatasetSyncResult(
                dataset, skipped=True, old_version=version, new_version=version
            )

        old_version = state.source_version if state is not None else None
        result = DatasetSyncResult(
            dataset, old_version=old_version, new_version=source_version
        )
        if dataset == "currencies":
            self._sync_currencies(rows, source_version, result)
        elif dataset == "countries":
            self._sync_countries(rows, source_version, result)
        elif dataset == "languages":
            self._sync_languages(rows, source_version, result)
        elif dataset == "admin_divisions_co":
            self._sync_admin_divisions(rows, source_version, result)

        self.db.flush()

        if state is None:
            state = RefSyncState(
                dataset=dataset,
                source_version=source_version,
                checksum=checksum,
                row_count=len(rows),
            )
            self.db.add(state)
        else:
            state.source_version = source_version
            state.checksum = checksum
            state.row_count = len(rows)

        self.db.flush()
        return result

    def _sync_currencies(
        self,
        rows: list[dict[str, Any]],
        source_version: str,
        result: DatasetSyncResult,
    ) -> None:
        existing = {c.code: c for c in self.db.query(RefCurrency).all()}
        seen_codes: set[str] = set()

        for row in rows:
            code = row["code"]
            seen_codes.add(code)
            currency = existing.get(code)
            is_new = currency is None
            if currency is None:
                currency = RefCurrency(code=code, source_version=source_version)
                self.db.add(currency)
                existing[code] = currency

            currency.names = row["names"]
            currency.symbol = row["symbol"]
            currency.minor_units = row["minor_units"]
            currency.is_active = row["is_active"]
            self._finish_row(currency, is_new, source_version, result)

        for code, currency in existing.items():
            if code not in seen_codes and currency.is_active:
                # E-15: a row missing from the re-synced file is deactivated,
                # never deleted.
                currency.is_active = False
                result.deactivated += 1

    def _sync_countries(
        self,
        rows: list[dict[str, Any]],
        source_version: str,
        result: DatasetSyncResult,
    ) -> None:
        existing = {c.code: c for c in self.db.query(RefCountry).all()}
        seen_codes: set[str] = set()

        for row in rows:
            code = row["code"]
            seen_codes.add(code)
            country = existing.get(code)
            is_new = country is None
            if country is None:
                country = RefCountry(code=code, source_version=source_version)
                self.db.add(country)
                existing[code] = country

            country.names = row["names"]
            country.search_name = self._country_search_name(row["names"])
            country.currency_code = row.get("currency_code")
            country.has_divisions = row.get("has_divisions", False)
            country.is_active = True
            self._finish_row(country, is_new, source_version, result)

        for code, country in existing.items():
            if code not in seen_codes and country.is_active:
                country.is_active = False
                result.deactivated += 1

    def _sync_languages(
        self,
        rows: list[dict[str, Any]],
        source_version: str,
        result: DatasetSyncResult,
    ) -> None:
        existing = {lang.code: lang for lang in self.db.query(RefLanguage).all()}
        seen_codes: set[str] = set()

        for row in rows:
            code = row["code"]
            seen_codes.add(code)
            language = existing.get(code)
            is_new = language is None
            if language is None:
                language = RefLanguage(code=code, source_version=source_version)
                self.db.add(language)
                existing[code] = language

            language.names = row["names"]
            language.native_name = row.get("native_name")
            language.is_active = True
            self._finish_row(language, is_new, source_version, result)

        for code, language in existing.items():
            if code not in seen_codes and language.is_active:
                language.is_active = False
                result.deactivated += 1

    def _sync_admin_divisions(
        self,
        rows: list[dict[str, Any]],
        source_version: str,
        result: DatasetSyncResult,
    ) -> None:
        existing = {
            (d.country_code, d.code): d for d in self.db.query(RefAdminDivision).all()
        }
        seen_keys: set[tuple[str, str]] = set()

        # Level 1 rows first, then level 2 -- the composite self-FK is
        # DEFERRABLE INITIALLY DEFERRED at the DB level, but syncing parents
        # first keeps intent clear and avoids relying on that deferral for
        # anything beyond true out-of-order edge cases.
        ordered_rows = sorted(rows, key=lambda r: r["level"])

        for row in ordered_rows:
            country_code = row["country_code"]
            code = row["code"]
            key = (country_code, code)
            seen_keys.add(key)
            division = existing.get(key)
            is_new = division is None
            if division is None:
                division = RefAdminDivision(
                    country_code=country_code,
                    code=code,
                    source_version=source_version,
                )
                self.db.add(division)
                existing[key] = division

            division.parent_code = row.get("parent_code")
            division.level = row["level"]
            division.name = row["name"]
            division.search_name = _normalize_search_name(row["name"])
            division.attributes = row.get("attributes", {})
            division.is_active = True
            self._finish_row(division, is_new, source_version, result)

        # Scope the deactivation to the countries this file covers: a dataset
        # file owns only its own country's divisions, so re-syncing it must
        # never wipe another country's rows (P2-15).
        synced_countries = {country_code for country_code, _ in seen_keys}
        for key, division in existing.items():
            if (
                key not in seen_keys
                and key[0] in synced_countries
                and division.is_active
            ):
                division.is_active = False
                result.deactivated += 1

    def _finish_row(
        self,
        row: Any,
        is_new: bool,
        source_version: str,
        result: DatasetSyncResult,
    ) -> None:
        """Count an upserted row as inserted or (really) updated, then stamp it.

        The change check runs before ``source_version`` is stamped, so a
        version bump alone does not make every row count as updated.
        """
        if is_new:
            result.inserted += 1
        elif self.db.is_modified(row):
            result.updated += 1
        row.source_version = source_version

    @staticmethod
    def _country_search_name(names: dict[str, str]) -> str:
        """Normalized es+en display names, space-joined (MS Section 8).

        Both language names are folded into one searchable string so a
        lookup by either the Spanish or English name matches.
        """
        parts = [names.get("es", ""), names.get("en", "")]
        joined = " ".join(p for p in parts if p)
        return _normalize_search_name(joined)
