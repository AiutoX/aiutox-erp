"""Manifest writer: build the export manifest.json metadata."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

_EXPORT_VERSION = "1.0"


def build_manifest(
    module_id: str,
    tenant_id: str,
    tables: dict[str, int],
) -> dict[str, Any]:
    """Build export manifest with record counts and metadata.

    Args:
        module_id: The module being exported.
        tenant_id: Tenant UUID as string.
        tables: Dict of table_name → row count.

    Returns:
        Manifest dict ready to serialize as manifest.json.
    """
    return {
        "_export_version": _EXPORT_VERSION,
        "module_id": module_id,
        "tenant_id": tenant_id,
        "exported_at": datetime.now(UTC).isoformat(),
        "record_count": sum(tables.values()),
        "tables": tables,
    }
