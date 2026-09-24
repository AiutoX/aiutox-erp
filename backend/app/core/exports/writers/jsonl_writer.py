"""JSONL writer: serialize a list of row dicts to newline-delimited JSON."""

from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID


def _default(obj: Any) -> Any:
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return str(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def rows_to_jsonl(rows: list[dict[str, Any]]) -> str:
    """Serialize rows to JSONL (one JSON object per line).

    Handles UUID, datetime, date, and Decimal types.
    Returns empty string for empty input.
    """
    if not rows:
        return ""
    return "\n".join(json.dumps(row, default=_default) for row in rows)
