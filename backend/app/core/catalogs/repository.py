"""Database access for resolving effective catalog items (ISSUE-014, PERF-01).

CatalogRepository is the only place in the catalogs read path that touches
the database. Every method here is tenant-filtered at the query level (never
post-filtered in Python) so that another tenant's items are excluded before
they ever reach the service.
"""

from uuid import UUID

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.catalogs.models import CatalogItem, CatalogItemOverride, CatalogList

_SORTABLE_COLUMNS = {
    "owner_module": CatalogList.owner_module,
    "key": CatalogList.key,
}


class CatalogRepository:
    """Tenant-scoped queries backing CatalogService.resolve_items."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_list_by_key(self, list_key: str) -> CatalogList | None:
        """Return the CatalogList row for ``list_key``, or None if unknown."""
        return (
            self.db.query(CatalogList).filter(CatalogList.key == list_key).one_or_none()
        )

    def get_list_by_key_for_update(self, list_key: str) -> CatalogList | None:
        """Return ``list_key``'s row locked ``FOR UPDATE`` and freshly read.

        ``populate_existing`` overwrites an instance already in the session,
        so a check made after the lock (e.g. governance's optimistic
        ``updated_at`` comparison) never reads a stale in-memory copy.
        """
        return (
            self.db.query(CatalogList)
            .filter(CatalogList.key == list_key)
            .with_for_update()
            .populate_existing()
            .one_or_none()
        )

    def distinct_manage_permissions(self) -> list[str]:
        """Every non-null ``manage_permission`` declared by any catalog list."""
        rows = (
            self.db.query(CatalogList.manage_permission)
            .filter(CatalogList.manage_permission.isnot(None))
            .distinct()
            .all()
        )
        return [permission for (permission,) in rows if permission is not None]

    def list_candidates(
        self,
        *,
        owner_module: str | None,
        include_deprecated: bool,
        sort_by: str,
        sort_dir: str,
    ) -> list[CatalogList]:
        """Return every ``CatalogList`` matching the SQL-level filters (ISSUE-016).

        Applies only the non-``q`` filters (``owner_module``,
        ``include_deprecated``) at the SQL level. ``q`` matching is done
        entirely in Python by the service (see
        ``CatalogService._accent_fold_filter``): given the expected data
        volume for this table (a few dozen catalog lists total, per the
        issue's HOW notes), fetching the full non-q-filtered candidate set
        and accent-folding in Python is both simpler and more correct than
        a SQL ``ILIKE`` pass, since Postgres ``ILIKE`` cannot fold accents
        without the ``unaccent`` extension this project avoids. Not
        paginated -- pagination is applied by the service after the q
        filter.
        """
        query = self.db.query(CatalogList)

        if owner_module is not None:
            query = query.filter(CatalogList.owner_module == owner_module)

        if not include_deprecated:
            query = query.filter(CatalogList.deprecated_at.is_(None))

        column = _SORTABLE_COLUMNS[sort_by]
        order = column.asc() if sort_dir == "asc" else column.desc()
        return query.order_by(order).all()

    def counts_for_lists(
        self, list_ids: list[UUID], tenant_id: UUID
    ) -> dict[UUID, tuple[int, int]]:
        """Return ``{list_id: (item_count, modified_count)}`` for ``list_ids``.

        ``item_count``: system + own-tenant items, excluding deprecated
        items, visible to this tenant (i.e. ``tenant_id IS NULL OR
        tenant_id = :tenant_id``).
        ``modified_count``: items that either have a tenant override, or are
        themselves a tenant item (``tenant_id = :tenant_id``), for this
        tenant.

        One aggregate query for item_count, one for modified_count -- not
        N+1 per list, regardless of how many lists are in the page.
        """
        if not list_ids:
            return {}

        item_count_rows = (
            self.db.query(CatalogItem.list_id, func.count(CatalogItem.id))
            .filter(
                CatalogItem.list_id.in_(list_ids),
                CatalogItem.deprecated_at.is_(None),
                or_(
                    CatalogItem.tenant_id.is_(None),
                    CatalogItem.tenant_id == tenant_id,
                ),
            )
            .group_by(CatalogItem.list_id)
            .all()
        )
        item_counts = {row[0]: row[1] for row in item_count_rows}

        tenant_item_rows = (
            self.db.query(CatalogItem.list_id, func.count(CatalogItem.id))
            .filter(
                CatalogItem.list_id.in_(list_ids),
                CatalogItem.tenant_id == tenant_id,
            )
            .group_by(CatalogItem.list_id)
            .all()
        )
        tenant_item_counts = {row[0]: row[1] for row in tenant_item_rows}

        override_rows = (
            self.db.query(CatalogItem.list_id, func.count(CatalogItemOverride.id))
            .join(CatalogItemOverride, CatalogItemOverride.item_id == CatalogItem.id)
            .filter(
                CatalogItem.list_id.in_(list_ids),
                CatalogItemOverride.tenant_id == tenant_id,
            )
            .group_by(CatalogItem.list_id)
            .all()
        )
        override_counts = {row[0]: row[1] for row in override_rows}

        result: dict[UUID, tuple[int, int]] = {}
        for list_id in list_ids:
            modified = override_counts.get(list_id, 0) + tenant_item_counts.get(
                list_id, 0
            )
            result[list_id] = (item_counts.get(list_id, 0), modified)
        return result

    def get_items_with_overrides(
        self, list_id: UUID, tenant_id: UUID
    ) -> tuple[list[CatalogItem], dict[UUID, CatalogItemOverride]]:
        """Return every visible item of ``list_id`` plus this tenant's overrides.

        PERF-01: exactly two queries regardless of item count -- one for
        ``catalog_items`` (system items plus this tenant's own items,
        computed at the query level via ``tenant_id IS NULL OR tenant_id =
        :tenant_id`` so another tenant's items are never fetched at all),
        and one for ``catalog_item_overrides`` filtered by this tenant and
        the system item ids just fetched.

        Includes deprecated and hidden items -- the selectability table
        (applied by the service) decides what to do with them; this method
        never filters based on selectability, only tenant visibility.
        """
        items = (
            self.db.query(CatalogItem)
            .filter(
                CatalogItem.list_id == list_id,
                or_(
                    CatalogItem.tenant_id.is_(None),
                    CatalogItem.tenant_id == tenant_id,
                ),
            )
            .all()
        )

        system_item_ids = [item.id for item in items if item.tenant_id is None]
        overrides_by_item_id: dict[UUID, CatalogItemOverride] = {}
        if system_item_ids:
            overrides = (
                self.db.query(CatalogItemOverride)
                .filter(
                    CatalogItemOverride.tenant_id == tenant_id,
                    CatalogItemOverride.item_id.in_(system_item_ids),
                )
                .all()
            )
            overrides_by_item_id = {ov.item_id: ov for ov in overrides}

        return items, overrides_by_item_id
