"""Append-only version-row writers for catalog lists and items.

Every write to ``catalog_list_versions`` / ``catalog_item_versions`` goes
through these functions, so version numbering stays in one place.
``write_item_versions`` is the batch form of ``write_item_version`` for bulk
operations (reorder, sync list creation); it numbers the same way.

FROZEN CONTRACT (ISSUE-009): the signatures of ``write_item_version`` and
``write_list_version`` are consumed verbatim by catalog sync reconciliation
and by every tenant / governance mutation. Do not change them; a caller that
needs a different shape must raise the question instead of extending them.

Both functions:

- compute the next ``version_number`` for their scope -- per list for list
  versions; per ``(item_id, tenant_id)`` for item versions, with NULL tenant
  treated as its own scope (``IS NOT DISTINCT FROM``), matching the unique
  index ``(item_id, COALESCE(tenant_id, nil-uuid), version_number)``;
- add the row to the caller's session and flush it, so a subsequent call in
  the same transaction sees it. They never commit: the caller owns the
  transaction (RULE-015 -- the version row commits or rolls back together
  with the change it records).

The sessions used by this project run with ``autoflush=False``, which is why
the functions flush explicitly before numbering and after inserting.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.catalogs.models import (
    CatalogItem,
    CatalogItemVersion,
    CatalogList,
    CatalogListVersion,
)


def write_item_version(
    db: Session,
    *,
    item: CatalogItem,
    change_type: str,
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
    tenant_id: UUID | None = None,
    changed_by: UUID | None = None,
    change_reason: str | None = None,
    batch_id: UUID | None = None,
) -> CatalogItemVersion:
    """Append a version row for an item (system scope or one tenant's scope).

    Args:
        db: The caller's session; the row is added and flushed, not committed.
        item: The item the change applies to. Flushed first if it has no id yet.
        change_type: One of ``models.ITEM_CHANGE_TYPES``.
        before: Snapshot before the change, or None on creation.
        after: Snapshot after the change.
        tenant_id: The tenant scope of the change; None for system (sync) changes.
        changed_by: Acting user id; None for system actions.
        change_reason: Optional free-text reason.
        batch_id: Groups rows written by one bulk operation (e.g. a reorder).

    Returns:
        The flushed CatalogItemVersion with its version_number assigned.
    """
    db.flush()
    # tenant_id IS NOT DISTINCT FROM :tenant_id -- NULL is its own scope.
    scope = (
        CatalogItemVersion.tenant_id.is_(None)
        if tenant_id is None
        else CatalogItemVersion.tenant_id == tenant_id
    )
    current = (
        db.query(func.max(CatalogItemVersion.version_number))
        .filter(CatalogItemVersion.item_id == item.id, scope)
        .scalar()
    )
    version = CatalogItemVersion(
        item_id=item.id,
        tenant_id=tenant_id,
        version_number=(current or 0) + 1,
        change_type=change_type,
        before=before,
        after=after,
        batch_id=batch_id,
        changed_by=changed_by,
        change_reason=change_reason,
    )
    db.add(version)
    db.flush()
    return version


@dataclass(frozen=True)
class ItemVersionEntry:
    """One item change to record through ``write_item_versions``."""

    item: CatalogItem
    change_type: str
    before: dict[str, Any] | None
    after: dict[str, Any] | None


def write_item_versions(
    db: Session,
    *,
    entries: Sequence[ItemVersionEntry],
    tenant_id: UUID | None = None,
    changed_by: UUID | None = None,
    change_reason: str | None = None,
    batch_id: UUID | None = None,
) -> list[CatalogItemVersion]:
    """Append version rows for several items of one scope in constant queries.

    The batch counterpart of ``write_item_version`` (whose frozen signature
    is unchanged): one flush, one ``max(version_number)`` per item_id via a
    single GROUP BY, in-memory numbering, then one ``add_all`` + flush. Two
    entries for the same item get consecutive numbers. Every row shares the
    same scope (``tenant_id``), actor, reason and ``batch_id``. Never commits.

    Args:
        db: The caller's session; rows are added and flushed, not committed.
        entries: The item changes, in the order to number them.
        tenant_id: The tenant scope of the changes; None for system (sync) changes.
        changed_by: Acting user id; None for system actions.
        change_reason: Optional free-text reason.
        batch_id: Groups the rows written by one bulk operation.

    Returns:
        The flushed CatalogItemVersion rows, in ``entries`` order.
    """
    if not entries:
        return []
    db.flush()
    scope = (
        CatalogItemVersion.tenant_id.is_(None)
        if tenant_id is None
        else CatalogItemVersion.tenant_id == tenant_id
    )
    item_ids = list({entry.item.id for entry in entries})
    rows = (
        db.query(
            CatalogItemVersion.item_id, func.max(CatalogItemVersion.version_number)
        )
        .filter(CatalogItemVersion.item_id.in_(item_ids), scope)
        .group_by(CatalogItemVersion.item_id)
        .all()
    )
    last_number: dict[UUID, int] = {item_id: current or 0 for item_id, current in rows}

    versions: list[CatalogItemVersion] = []
    for entry in entries:
        number = last_number.get(entry.item.id, 0) + 1
        last_number[entry.item.id] = number
        versions.append(
            CatalogItemVersion(
                item_id=entry.item.id,
                tenant_id=tenant_id,
                version_number=number,
                change_type=entry.change_type,
                before=entry.before,
                after=entry.after,
                batch_id=batch_id,
                changed_by=changed_by,
                change_reason=change_reason,
            )
        )
    db.add_all(versions)
    db.flush()
    return versions


def write_list_version(
    db: Session,
    *,
    lst: CatalogList,
    change_type: str,
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
    changed_by: UUID | None = None,
    actor_tenant_id: UUID | None = None,
    change_reason: str | None = None,
) -> CatalogListVersion:
    """Append a version row for a list.

    Args:
        db: The caller's session; the row is added and flushed, not committed.
        lst: The list the change applies to. Flushed first if it has no id yet.
        change_type: One of ``models.LIST_CHANGE_TYPES``.
        before: Snapshot before the change, or None on creation.
        after: Snapshot after the change.
        changed_by: Acting user id; None for system (sync) actions.
        actor_tenant_id: Tenant the acting user belonged to, when any.
        change_reason: Free-text reason; required (>= 10 chars) by the DB for
            ``governance_updated``.

    Returns:
        The flushed CatalogListVersion with its version_number assigned.
    """
    db.flush()
    current = (
        db.query(func.max(CatalogListVersion.version_number))
        .filter(CatalogListVersion.list_id == lst.id)
        .scalar()
    )
    version = CatalogListVersion(
        list_id=lst.id,
        version_number=(current or 0) + 1,
        change_type=change_type,
        before=before,
        after=after,
        changed_by=changed_by,
        actor_tenant_id=actor_tenant_id,
        change_reason=change_reason,
    )
    db.add(version)
    db.flush()
    return version
