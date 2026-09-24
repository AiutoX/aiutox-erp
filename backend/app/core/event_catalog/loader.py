"""Event catalog loader.

Scans all app/modules/*/events/*.schema.json files and loads them into a
registry keyed by event type. Used by the PubSub publisher to validate
event payloads at runtime (strict mode in dev/test, lenient in prod).

Usage:
    from app.core.event_catalog.loader import EventCatalogLoader

    catalog = EventCatalogLoader.load()
    schema = catalog.get_schema("product.created")  # None if not registered
"""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Root of the backend source tree (this file is app/core/event_catalog/loader.py)
_BACKEND_ROOT = Path(__file__).resolve().parents[3]  # → backend/
_MODULES_ROOT = _BACKEND_ROOT / "app" / "modules"


class EventCatalogLoader:
    """Loads and caches JSON Schema definitions for all registered events."""

    def __init__(self) -> None:
        # { "product.created": { "$schema": "...", "type": "object", ... } }
        self._schemas: dict[str, dict[str, Any]] = {}
        self._errors: list[str] = []

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_schema(self, event_type: str) -> dict[str, Any] | None:
        """Return the JSON Schema for *event_type*, or None if not registered."""
        return self._schemas.get(event_type)

    def list_event_types(self) -> list[str]:
        """Return all registered event types."""
        return list(self._schemas.keys())

    def has_schema(self, event_type: str) -> bool:
        return event_type in self._schemas

    @property
    def load_errors(self) -> list[str]:
        """Non-fatal errors encountered during the last load() call."""
        return list(self._errors)

    # ------------------------------------------------------------------
    # Factory / loading
    # ------------------------------------------------------------------

    @classmethod
    def load(cls, modules_root: Path | None = None) -> EventCatalogLoader:
        """Scan all modules/<X>/events/*.schema.json and return a loaded catalog.

        Errors (malformed JSON, missing 'event_type' key) are collected in
        loader.load_errors and logged as warnings — they never raise so that
        a single bad schema file does not block startup.

        Args:
            modules_root: Override the modules directory (useful in tests).

        Returns:
            A populated EventCatalogLoader instance.
        """
        root = modules_root or _MODULES_ROOT
        instance = cls()
        instance._load_from(root)
        return instance

    def _load_from(self, modules_root: Path) -> None:
        if not modules_root.exists():
            logger.debug(
                "event_catalog: modules root %s does not exist — skipping", modules_root
            )
            return

        schema_files = sorted(modules_root.glob("*/events/*.schema.json"))

        if not schema_files:
            logger.debug(
                "event_catalog: no *.schema.json files found under %s "
                "(expected in Fase 2+)",
                modules_root,
            )
            return

        for schema_path in schema_files:
            self._load_schema_file(schema_path)

        logger.info(
            "event_catalog: loaded %d schemas from %d files",
            len(self._schemas),
            len(schema_files),
        )

    def _load_schema_file(self, path: Path) -> None:
        """Parse a single .schema.json file and register it by event_type."""
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            msg = f"event_catalog: failed to parse {path}: {exc}"
            logger.warning(msg)
            self._errors.append(msg)
            return

        if not isinstance(raw, dict):
            msg = f"event_catalog: {path} is not a JSON object — skipped"
            logger.warning(msg)
            self._errors.append(msg)
            return

        # The event type can be declared as:
        #   a) a top-level "event_type" key in the schema, OR
        #   b) derived from the filename: "product_created.schema.json" → "product.created"
        event_type: str | None = raw.get("event_type") or _event_type_from_filename(
            path
        )

        if not event_type:
            msg = f"event_catalog: {path} has no 'event_type' key and filename is ambiguous — skipped"
            logger.warning(msg)
            self._errors.append(msg)
            return

        if event_type in self._schemas:
            logger.warning(
                "event_catalog: duplicate event_type '%s' — %s overrides previous",
                event_type,
                path,
            )

        self._schemas[event_type] = raw
        logger.debug("event_catalog: registered '%s' from %s", event_type, path)


# ------------------------------------------------------------------
# Module-level singleton (cached, re-loadable)
# ------------------------------------------------------------------


@lru_cache(maxsize=1)
def get_event_catalog() -> EventCatalogLoader:
    """Return the global event catalog singleton (loaded once on first call).

    To force a reload (e.g., in tests), call ``get_event_catalog.cache_clear()``
    before calling this function again.
    """
    return EventCatalogLoader.load()


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _event_type_from_filename(path: Path) -> str | None:
    """Derive event type from schema filename.

    Conventions (both accepted):
      - "product_created.schema.json"  → "product.created"
      - "product.created.schema.json"  → "product.created"
    """
    stem = path.stem  # e.g. "product_created" or "product.created"
    # Remove trailing ".schema" if present (e.g. stem = "product.created.schema")
    if stem.endswith(".schema"):
        stem = stem[: -len(".schema")]
    # Normalise underscores between words to dots only when there's one underscore segment
    # "product_created" → "product.created"
    # "work_order_created" → leave as "work_order.created" (last segment)
    # We split on last underscore when no dot present
    if "." not in stem:
        parts = stem.rsplit("_", 1)
        if len(parts) == 2:
            return f"{parts[0]}.{parts[1]}"
        return stem
    return stem
