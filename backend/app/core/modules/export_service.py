"""Module data export service — F8-T01.

Enables exporting all data from a module in JSON/CSV formats.
Supports point-in-time exports for backup before uninstall.
"""

import csv
import io
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import inspect
from sqlalchemy.orm import Query, Session


class ModuleExportService:
    """Service for exporting module data in JSON/CSV formats."""

    def __init__(self, db: Session):
        self.db = db

    def export_module_json(
        self,
        tenant_id: UUID,
        module_id: str,
        models: list[Any],
    ) -> dict[str, Any]:
        """Export all data from a module as JSON.

        Args:
            tenant_id: Tenant ID (filters data to this tenant)
            module_id: Module identifier (for metadata)
            models: List of SQLAlchemy model classes to export

        Returns:
            Dict with export metadata and data arrays per model
        """
        export_data: dict[str, Any] = {
            "metadata": {
                "module_id": module_id,
                "tenant_id": str(tenant_id),
                "exported_at": datetime.now(UTC).isoformat(),
                "format": "json",
                "record_count": 0,
            },
            "tables": {},
        }

        for model in models:
            table_name: str = model.__tablename__

            query: Query[Any] = self.db.query(model)
            if hasattr(model, "tenant_id"):
                query = query.filter(model.tenant_id == tenant_id)

            records = query.all()

            table_data = []
            for record in records:
                row_dict = self._record_to_dict(record)
                table_data.append(row_dict)

            export_data["tables"][table_name] = table_data
            export_data["metadata"]["record_count"] += len(table_data)

        return export_data

    def export_module_csv(
        self,
        tenant_id: UUID,
        module_id: str,
        models: list[Any],
    ) -> dict[str, str]:
        """Export all data from a module as CSV files (zip format).

        Args:
            tenant_id: Tenant ID (filters data)
            module_id: Module identifier
            models: List of SQLAlchemy model classes

        Returns:
            Dict mapping table_name → CSV content as string
        """
        csv_files = {}

        for model in models:
            table_name: str = model.__tablename__

            query: Query[Any] = self.db.query(model)
            if hasattr(model, "tenant_id"):
                query = query.filter(model.tenant_id == tenant_id)

            records = query.all()

            if not records:
                columns = self._get_model_columns(model)
                csv_files[f"{table_name}.csv"] = ",".join(columns)
                continue

            output = io.StringIO()

            rows = [self._record_to_dict(r) for r in records]

            if rows:
                fieldnames = list(rows[0].keys())
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)

            csv_files[f"{table_name}.csv"] = output.getvalue()

        return csv_files

    def estimate_export_size(
        self,
        tenant_id: UUID,
        models: list[Any],
    ) -> dict[str, int]:
        """Estimate export size per table (record count).

        Args:
            tenant_id: Tenant ID
            models: List of models

        Returns:
            Dict mapping table_name → record count
        """
        sizes: dict[str, int] = {}

        for model in models:
            query: Query[Any] = self.db.query(model)
            if hasattr(model, "tenant_id"):
                query = query.filter(model.tenant_id == tenant_id)

            count = query.count()
            table_name: str = model.__tablename__
            sizes[table_name] = count

        return sizes

    def _record_to_dict(self, record: Any) -> dict[str, Any]:
        """Convert SQLAlchemy model instance to dict.

        Handles UUID and datetime serialization.
        """
        result = {}
        mapper = inspect(record.__class__)

        for column in mapper.columns:
            value = getattr(record, column.name)

            if isinstance(value, UUID):
                value = str(value)
            elif isinstance(value, datetime):
                value = value.isoformat()

            result[column.name] = value

        return result

    def _get_model_columns(self, model: Any) -> list[str]:
        """Get column names for a model."""
        mapper = inspect(model)
        return [col.name for col in mapper.columns]
