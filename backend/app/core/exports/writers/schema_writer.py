"""Schema writer: generate a JSON-serializable schema dict for a SQLAlchemy model."""

from __future__ import annotations

from typing import Any


def table_schema_to_dict(model_class: type) -> dict[str, Any]:  # type: ignore[type-arg]
    """Return a schema dict for a SQLAlchemy model.

    Returns:
        {
            "table": str,
            "columns": [{"name": str, "type": str, "nullable": bool}, ...]
        }
    """
    mapper = model_class.__mapper__  # type: ignore[attr-defined]
    columns = []
    for col in mapper.columns:
        columns.append(
            {
                "name": col.key,
                "type": str(col.type),
                "nullable": bool(col.nullable),
            }
        )
    return {
        "table": model_class.__tablename__,  # type: ignore[attr-defined]
        "columns": columns,
    }
