"""Mark JSONB snapshot columns when the source module is uninstalled.

When a business module is uninstalled, rows in other modules that hold a
JSONB snapshot of that module's data are updated with:
  source_module_removed = true
  source_module_removed_at = <ISO timestamp>

This lets downstream consumers know the source data is gone but still
read the snapshot for display/audit purposes.

Registry format:
  MODULE_SNAPSHOT_COLUMNS[module_id] = list of (table, column) tuples
  that hold snapshots of that module's data.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

# Maps source module → list of (table_name, snapshot_column_name) that
# contain snapshots of that module's data.
MODULE_SNAPSHOT_COLUMNS: dict[str, list[tuple[str, str]]] = {
    "products": [
        ("stock_moves", "product_snapshot"),
        ("lots", "product_snapshot"),
        ("product_quantities", "product_snapshot"),
        ("order_points", "product_snapshot"),
    ],
    "properties": [
        ("lease_agreements", "property_snapshot"),
    ],
}


def mark_snapshots_source_removed(
    db: Session,
    tenant_id: UUID,
    module_id: str,
) -> dict[str, Any]:
    """Update all snapshot columns referencing module_id with source_module_removed=true.

    Only affects rows for the given tenant_id.

    Returns:
        dict with 'updated_rows' (total across all tables) and 'tables' (per-table counts).
    """
    targets = MODULE_SNAPSHOT_COLUMNS.get(module_id, [])
    removed_at = datetime.now(UTC).isoformat()
    total = 0
    per_table: dict[str, int] = {}

    _allowed_identifiers = {
        identifier
        for pairs in MODULE_SNAPSHOT_COLUMNS.values()
        for pair in pairs
        for identifier in pair
    }

    for table, col in targets:
        if table not in _allowed_identifiers or col not in _allowed_identifiers:
            raise ValueError(f"Unexpected table/column not in allowlist: {table}.{col}")

        # table and col are validated against MODULE_SNAPSHOT_COLUMNS above;
        # they are internal constants, not user input.
        sql = (  # noqa: S608
            f"UPDATE {table} "  # nosec B608
            f"SET {col} = {col} || jsonb_build_object("
            "'source_module_removed', true, "
            "'source_module_removed_at', :removed_at) "
            f"WHERE tenant_id = :tenant_id "
            f"AND {col} IS NOT NULL "
            f"AND NOT ({col} ? 'source_module_removed')"
        )
        result = db.execute(
            text(sql),
            {"tenant_id": str(tenant_id), "removed_at": removed_at},
        )
        count = result.rowcount if result.rowcount is not None else 0
        per_table[table] = count
        total += count

    return {"updated_rows": total, "tables": per_table}
