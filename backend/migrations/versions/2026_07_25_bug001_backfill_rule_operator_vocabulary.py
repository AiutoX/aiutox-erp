"""BUG-001: backfill legacy operator strings in rules.conditions to the
canonical vocabulary now enforced by condition_evaluator.py.

Revision ID: 2026_07_25_bug001_operator_backfill
Revises: ccba24a09724
Create Date: 2026-07-25 00:00:00.000000+00:00

Data-only migration (no schema change). Rewrites already-persisted
rules.conditions JSON that used operator strings the evaluator never
recognized ("equals", "gte", "lte", "not_in") to the canonical symbols
it actually implements ("==", ">=", "<=", plus "in" + negate=True for
the not_in case). Any rule seeded by the leases or maintenance
installers before this fix landed is affected — those conditions
silently evaluated to False forever (see BUG-001).

This is a blanket rewrite across all tenants, not scoped to leases/
maintenance rule names: condition_evaluator.py never recognized these
four strings for ANY rule, tenant-authored or installer-seeded, so
there is no legitimate existing row where "equals"/"gte"/"lte"/"not_in"
was intentionally relying on current (non-)behavior.

Idempotency: upgrade() only rewrites conditions whose operator is one
of the four legacy strings, so re-running it after the first pass is a
no-op (no matching rows left to update).

STOP: this migration must be reviewed and explicitly approved by the
user before being applied against any shared or production database,
per CLAUDE.md's migration risk policy. It is safe to apply against a
disposable local/dev/test database as part of normal implementation
and verification.
"""

import json
from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2026_07_25_bug001_operator_backfill"
down_revision: str | None = "ccba24a09724"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_FORWARD_MAP = {"equals": "==", "gte": ">=", "lte": "<="}
_LEGACY_OPERATORS = (*_FORWARD_MAP, "not_in")


def _rewrite_forward(condition: dict[str, Any]) -> dict[str, Any]:
    operator = condition.get("operator")
    if operator in _FORWARD_MAP:
        return {**condition, "operator": _FORWARD_MAP[operator]}
    if operator == "not_in":
        rewritten = {**condition, "operator": "in", "negate": True}
        return rewritten
    return condition


def _has_legacy_operator(conditions: list[dict[str, Any]] | None) -> bool:
    if not conditions:
        return False
    return any(c.get("operator") in _LEGACY_OPERATORS for c in conditions)


def upgrade() -> None:
    conn = op.get_bind()

    rows = conn.execute(sa.text("SELECT id, conditions FROM rules")).fetchall()

    for row in rows:
        conditions = row.conditions
        if not _has_legacy_operator(conditions):
            continue

        rewritten = [_rewrite_forward(c) for c in conditions]
        conn.execute(
            sa.text("UPDATE rules SET conditions = :c WHERE id = :id"),
            {"c": json.dumps(rewritten), "id": row.id},
        )


def downgrade() -> None:
    """Intentional no-op.

    upgrade() cannot be precisely inverted: once a condition reads
    "==" / ">=" / "<=" / "in"+negate=True, there is no way to tell
    whether it got there via this migration's rewrite or was authored
    that way natively (e.g. any rule created after this fix landed, or
    a tenant-authored rule that always used canonical operators).
    Reverting by operator value alone would silently corrupt those
    unrelated rows. If a genuine rollback is ever needed, restore the
    affected rows from a pre-migration backup instead of guessing here.
    """
    return None
