"""Export orchestrator: builds a ZIP archive from module data using writers."""

from __future__ import annotations

import json
import zipfile
from io import BytesIO
from typing import Any

from sqlalchemy.orm import Session

from app.core.exports.writers.jsonl_writer import rows_to_jsonl
from app.core.exports.writers.manifest_writer import build_manifest


class ExportOrchestrator:
    """Orchestrates building a ZIP export from module table data.

    Usage:
        orch = ExportOrchestrator(db)
        zip_bytes = orch.build_zip(module_id, tenant_id, tables)
        # store zip_bytes via FileService
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def build_zip(
        self,
        module_id: str,
        tenant_id: str,
        tables: dict[str, list[dict[str, Any]]],
    ) -> bytes:
        """Build a ZIP archive with manifest.json + one JSONL per table.

        Args:
            module_id: The module being exported.
            tenant_id: Tenant UUID as string.
            tables: Dict of table_name → list of row dicts.

        Returns:
            ZIP file content as bytes.
        """
        table_counts = {name: len(rows) for name, rows in tables.items()}
        manifest = build_manifest(module_id, tenant_id, table_counts)

        buf = BytesIO()
        with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("manifest.json", json.dumps(manifest, indent=2))
            for table_name, rows in tables.items():
                if rows:
                    zf.writestr(f"{table_name}.jsonl", rows_to_jsonl(rows))

        return buf.getvalue()
