"""CSV exporter for import/export module."""

import csv
import io
from typing import Any


class CSVExporter:
    """Exports data to CSV format."""

    def export(
        self,
        data: list[dict[str, Any]],
        fieldnames: list[str] | None = None,
    ) -> bytes:
        """Export a list of dicts to CSV bytes.

        Args:
            data: List of row dicts to export
            fieldnames: Column order. If None, uses keys from first row.

        Returns:
            CSV content as bytes (UTF-8 with BOM for Excel compatibility)
        """
        if not data:
            return b""

        if fieldnames is None:
            fieldnames = list(data[0].keys())

        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=fieldnames,
            extrasaction="ignore",
            lineterminator="\r\n",
        )
        writer.writeheader()
        writer.writerows(data)

        return output.getvalue().encode("utf-8-sig")
