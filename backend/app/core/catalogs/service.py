"""CatalogService: resolves the effective catalog items for a tenant (ISSUE-014).

resolve_items(...) is the single read path every dropdown-backed consumer
calls. It merges system items and tenant overrides into one ordered,
selectability-annotated list (MS "Calculated Fields" + Section 8's
derived-selectability table), applies the read-time RULE-010 fallback, and
transparently uses CatalogCache (ISSUE-006, fail-open) to avoid
re-resolving on every call.

Contract (frozen -- ISSUE-015/016/017+ depend on this verbatim):

    CatalogService(db, cache=None).resolve_items(
        tenant_id: UUID,
        list_key: str,
        include_hidden: bool = False,
        include_codes: list[str] | None = None,
    ) -> ResolvedList

    ResolvedList(list_key: str, is_deprecated: bool, items: list[ResolvedItem])
    ResolvedItem(code, labels, sort_order, attributes, is_system, is_selectable)
"""

import logging
import unicodedata
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, NoReturn, cast
from uuid import UUID, uuid4

from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth.permissions import has_permission
from app.core.catalogs import versioning
from app.core.catalogs.codes import CatalogCodeExhaustedError, generate_tenant_code
from app.core.catalogs.models import (
    CatalogItem,
    CatalogItemOverride,
    CatalogItemVersion,
    CatalogList,
    CatalogListVersion,
)
from app.core.catalogs.policy import CATALOGS_MANAGE_PERMISSION, CatalogPolicy
from app.core.catalogs.repository import CatalogRepository
from app.core.catalogs.schemas import (
    CatalogAdminItemOut,
    CatalogAdminItemsResponse,
    CatalogItemVersionOut,
    CatalogListOut,
    CatalogListVersionOut,
    ChangedByOut,
    ViewerCapabilitiesOut,
)
from app.core.exceptions import (
    APIException,
    raise_internal_server_error,
    raise_not_found,
)
from app.core.input_guards import has_control_chars
from app.core.logging import create_audit_log_entry
from app.core.users.models import User

logger = logging.getLogger(__name__)

_MAX_INCLUDE_CODES = 20
_MAX_Q_LENGTH = 100
_SORT_BY_VALUES = frozenset({"owner_module", "key"})
_SORT_DIR_VALUES = frozenset({"asc", "desc"})
_MAX_LABEL_LENGTH = 100
_REQUIRED_LABEL_LANGUAGES = ("es", "en")
_TENANT_ITEM_LIMIT = 200
_TENANT_CODE_INDEX = "uq_catalog_items_tenant_code"
_CODE_INSERT_ATTEMPTS = 3


def _is_tenant_code_conflict(exc: IntegrityError) -> bool:
    """True if ``exc`` violates the per-tenant unique code index (RULE-012)."""
    diag = getattr(exc.orig, "diag", None)
    constraint = getattr(diag, "constraint_name", None)
    if constraint is not None:
        return bool(constraint == _TENANT_CODE_INDEX)
    return _TENANT_CODE_INDEX in str(exc.orig)


def _fold_accents(value: str) -> str:
    """Strip diacritics via NFKD decomposition (accent-insensitive compare)."""
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


# ORM boundary coercions. The JSONB columns are inferred by mypy as
# ``dict[str, Any] | list[Any]``, but the write paths (validated label maps,
# attribute objects, version snapshots) only ever store JSON objects. These
# helpers state that real shape once; they are no-ops at runtime.
def _as_labels(value: object) -> dict[str, str]:
    return cast(dict[str, str], value)


def _as_optional_labels(value: object) -> dict[str, str] | None:
    return cast("dict[str, str] | None", value)


def _as_attributes(value: object) -> dict[str, Any]:
    return cast(dict[str, Any], value)


def _as_snapshot(value: object) -> dict[str, Any] | None:
    return cast("dict[str, Any] | None", value)


def _label_matches(labels: dict[str, str], folded_q: str) -> bool:
    for value in labels.values():
        if folded_q in _fold_accents(value.casefold()):
            return True
    return False


@dataclass
class ResolvedItem:
    """One effective, selectability-annotated catalog item (C11)."""

    code: str
    labels: dict[str, str]
    sort_order: int
    attributes: dict[str, Any]
    is_system: bool
    is_selectable: bool


@dataclass
class ResolvedList:
    """The effective items of one catalog list for one tenant (C11)."""

    list_key: str
    is_deprecated: bool
    items: list[ResolvedItem]


class CatalogService:
    """Resolves the effective, selectable catalog items for a tenant."""

    def __init__(self, db: Session, cache: Any | None = None) -> None:
        self.db = db
        self.repository = CatalogRepository(db)
        self.cache = cache
        # Per-request memo (the service is built once per request) of whether
        # an owner module is disabled for a tenant; see _is_owner_disabled.
        self._owner_disabled: dict[tuple[UUID, str], bool] = {}
        self._module_scoping_warned = False

    def resolve_items(
        self,
        tenant_id: UUID,
        list_key: str,
        include_hidden: bool = False,
        include_codes: list[str] | None = None,
    ) -> ResolvedList:
        """Resolve the effective items of ``list_key`` for ``tenant_id``.

        Args:
            tenant_id: The requesting tenant.
            list_key: The catalog list key (e.g. "core.gender").
            include_hidden: When True, includes hidden/deprecated items as
                non-selectable (admin-only; the caller is responsible for
                the AUTH_INSUFFICIENT_PERMISSIONS gate before calling this
                with True).
            include_codes: Up to 20 extra codes to grandfather in as
                non-selectable even if they would otherwise be excluded.
                Unknown codes are silently ignored. More than 20 raises
                APIException("VALIDATION_ERROR", status_code=422).

        Returns:
            A ResolvedList with the list's deprecation state and its
            effective items in order.

        Raises:
            APIException: "CATALOG_LIST_NOT_FOUND" (404) if list_key is
                unknown; "VALIDATION_ERROR" (422) if include_codes has more
                than 20 entries.
        """
        if include_codes is not None and len(include_codes) > _MAX_INCLUDE_CODES:
            raise APIException(
                "VALIDATION_ERROR",
                f"include_codes accepts at most {_MAX_INCLUDE_CODES} codes.",
                status_code=422,
            )

        lst = self._get_list_or_404(list_key)
        return self.resolve_list(
            lst,
            tenant_id,
            include_hidden=include_hidden,
            include_codes=include_codes,
        )

    def resolve_list(
        self,
        lst: CatalogList,
        tenant_id: UUID,
        include_hidden: bool = False,
        include_codes: list[str] | None = None,
    ) -> ResolvedList:
        """``resolve_items`` for a list row the caller already loaded.

        Same semantics, cache use and errors as ``resolve_items`` minus the
        404 (the caller holds the row), so a request that already fetched
        the list for a policy check does not fetch it again on a cache hit
        (review P2-13). On a cache miss the row is re-read once, after the
        cache generation read, so its flags are not older than the
        generation the result is cached under (review R2-1).
        """
        if include_codes is not None and len(include_codes) > _MAX_INCLUDE_CODES:
            raise APIException(
                "VALIDATION_ERROR",
                f"include_codes accepts at most {_MAX_INCLUDE_CODES} codes.",
                status_code=422,
            )

        list_key = lst.key
        is_deprecated = lst.deprecated_at is not None

        # PERF-02: only the plain default-args call is cacheable -- a
        # request with include_hidden=True or non-empty include_codes
        # bypasses the cache entirely (ISSUE-006's key format has no room
        # for those params).
        use_cache = not include_hidden and not include_codes
        generation: tuple[int, int] | None = None
        if use_cache and self.cache is not None:
            cached = self._safe_cache_get(tenant_id, list_key)
            if cached is not None:
                return ResolvedList(
                    list_key=list_key, is_deprecated=is_deprecated, items=cached
                )
            # Read before the DB read, so the entry written below is labelled
            # with the generation its data belongs to (review N-4).
            generation = self._safe_cache_generation(tenant_id, list_key)
            if generation is not None:
                # The list row (its governance flags drive selectability) was
                # loaded before that read; re-read it so a governance commit
                # landing in between is not cached under the new generation
                # (review R2-1). Misses only -- a hit never gets here.
                self.db.refresh(lst)
                is_deprecated = lst.deprecated_at is not None

        items = self._resolve_from_db(
            lst, tenant_id, include_hidden=include_hidden, include_codes=include_codes
        )

        if use_cache and self.cache is not None:
            self._safe_cache_set(tenant_id, list_key, items, generation)

        return ResolvedList(list_key=list_key, is_deprecated=is_deprecated, items=items)

    def resolve_many(
        self, tenant_id: UUID, list_keys: list[str]
    ) -> tuple[list[ResolvedList], list[str]]:
        """Resolve several catalog lists in one call (ISSUE-015, C12, AC-API-07).

        For each key that exists, resolves it exactly like ``resolve_items``
        (default ``include_hidden=False, include_codes=None``), reusing that
        method's own cache check per key (PERF-03) -- there is no separate
        batch-cache path. Each list row is loaded once per cache hit (P2-13);
        a miss re-reads it after the generation read (R2-1). Keys that do
        not exist are collected into ``not_found`` instead of raising.

        Args:
            tenant_id: The requesting tenant.
            list_keys: The catalog list keys to resolve, in the order given.

        Returns:
            A ``(found, not_found)`` tuple: ``found`` holds one
            ``ResolvedList`` per existing key (in input order), and
            ``not_found`` holds the keys that do not exist (in input order).
        """
        found: list[ResolvedList] = []
        not_found: list[str] = []
        for key in list_keys:
            lst = self.repository.get_list_by_key(key)
            if lst is None:
                not_found.append(key)
                continue
            found.append(self.resolve_list(lst, tenant_id))
        return found, not_found

    def get_items(self, tenant_id: UUID, list_key: str) -> list["ResolvedItem"]:
        """Thin wrapper over ``resolve_items`` returning just the items (C12).

        Used by the SDK facade so a caller that only needs the item list
        (e.g. to check selectable codes) does not need to unpack a
        ``ResolvedList``.
        """
        return self.resolve_items(tenant_id, list_key).items

    def require(
        self,
        tenant_id: UUID,
        list_key: str,
        code: str | None,
        current: str | None = None,
        field: str | None = None,
    ) -> None:
        """Validate a stored/incoming catalog code (C12, C13, AC-API-29, RULE-011).

        A no-op when ``code`` is ``None`` (no value to validate). Otherwise,
        ``code`` must either be a currently selectable code of ``list_key``,
        or be equal to ``current`` (the record's existing stored value) even
        if that code is no longer selectable -- this is the read-time
        grandfathering counterpart to ``resolve_items``' selectability, so an
        existing record is not blocked from unrelated updates just because
        one of its catalog-backed fields has since been deprecated or
        hidden. An empty string is a real, non-None code and does not skip
        validation, unless it happens to equal ``current`` (grandfathering
        still applies literally).

        Args:
            tenant_id: The requesting tenant.
            list_key: The catalog list the code belongs to.
            code: The code to validate, or ``None`` to skip validation.
            current: The record's existing stored value, if any (grandfathering).
            field: Optional field name, included in the error ``details`` only.

        Raises:
            APIException: "CATALOG_CODE_INVALID" (422) if ``code`` is neither
                selectable nor grandfathered.
        """
        if code is None:
            return

        items = self.get_items(tenant_id, list_key)
        selectable_codes = {item.code for item in items if item.is_selectable}
        if code in selectable_codes:
            return
        if current is not None and code == current:
            return

        raise APIException(
            "CATALOG_CODE_INVALID",
            f"'{code}' is not a valid value for catalog '{list_key}'.",
            status_code=422,
            details={"list_key": list_key, "code": code, "field": field},
        )

    def labels_for(
        self, tenant_id: UUID, list_key: str, codes: list[str], lang: str
    ) -> dict[str, str]:
        """Resolve display labels for stored codes, including hidden/deprecated ones.

        For each requested code, returns ``labels[lang]``, falling back to
        ``labels["es"]``, falling back to the raw ``code`` itself when no
        labels are found at all (AC-API-29's exact fallback chain). Calls
        ``resolve_items`` with ``include_codes=codes`` (not the
        selectable-only default) so a hidden or deprecated stored code (E-12)
        still resolves to its real labels instead of falling straight
        through to the raw-code fallback.

        Args:
            tenant_id: The requesting tenant.
            list_key: The catalog list the codes belong to.
            codes: The stored codes to label.
            lang: The preferred language key (e.g. "en").

        Returns:
            A ``{code: label}`` mapping, one entry per requested code.
        """
        resolved = self.resolve_items(tenant_id, list_key, include_codes=codes or None)
        labels_by_code = {item.code: item.labels for item in resolved.items}

        result: dict[str, str] = {}
        for code in codes:
            labels = labels_by_code.get(code, {})
            result[code] = labels.get(lang) or labels.get("es") or code
        return result

    # ------------------------------------------------------------------
    # Admin read endpoints (ISSUE-016, C13)
    # ------------------------------------------------------------------

    def list_lists(
        self,
        tenant_id: UUID,
        viewer: CatalogPolicy,
        owner_module: str | None = None,
        q: str | None = None,
        include_deprecated: bool = False,
        sort_by: str = "owner_module",
        sort_dir: str = "asc",
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[CatalogListOut], int]:
        """List catalogs the viewer may govern or manage (AC-API-08/09).

        Access scoping: a ``catalogs.manage`` holder or a platform superuser
        sees every list; otherwise the result is filtered to only the lists
        whose own ``manage_permission`` the viewer holds. A viewer with
        neither gets an empty page here -- the router is responsible for
        rejecting with 403 before reaching this method when *no* access
        path applies at all (AC-API-08's "otherwise 403" is a router-level
        pre-check, not a service-level behavior).

        Args:
            tenant_id: The requesting tenant (used for item_count/
                modified_count and viewer_capabilities-independent scoping).
            viewer: The requesting viewer's CatalogPolicy.
            owner_module: Optional exact-match filter.
            q: Optional case/accent-insensitive search on key or either
                label (max 100 chars); longer values raise VALIDATION_ERROR.
            include_deprecated: Include deprecated lists (default False).
            sort_by: "owner_module" (default) or "key".
            sort_dir: "asc" (default) or "desc".
            page: 1-based page number (default 1).
            page_size: Page size, 1..100 (default 50).

        Returns:
            A ``(rows, total)`` tuple: ``rows`` is the requested page of
            ``CatalogListOut``, ``total`` is the total matching count
            (post permission-scope filter, pre pagination) for
            ``PaginationMeta``.

        Raises:
            APIException: "VALIDATION_ERROR" (422) for an invalid
                sort_by/sort_dir, an out-of-range page/page_size, or a q
                longer than 100 characters.
        """
        self._validate_list_lists_params(q, sort_by, sort_dir, page, page_size)

        # Two-phase q search (ISSUE-016 HOW notes): fetch the broad
        # candidate set with only the non-q SQL filters applied (dataset
        # size is a few dozen catalog lists total, per the issue's own
        # accepted-tradeoff note), then apply the precise Python NFKD
        # accent-fold pass for q -- this is what actually makes accent-
        # insensitive matching correct, since Postgres ILIKE alone cannot
        # fold accents without the unaccent extension this project avoids.
        candidates = self.repository.list_candidates(
            owner_module=owner_module,
            include_deprecated=include_deprecated,
            sort_by=sort_by,
            sort_dir=sort_dir,
        )

        if q:
            candidates = self._accent_fold_filter(candidates, q)

        candidates = self._scope_by_permission(candidates, viewer)
        # Lists of a module this tenant disabled are not part of its admin
        # surface; filtering before the count keeps total consistent.
        candidates = [
            c
            for c in candidates
            if not self._is_owner_disabled(c.owner_module, tenant_id)
        ]

        total = len(candidates)
        start = (page - 1) * page_size
        page_rows = candidates[start : start + page_size]

        counts = self.repository.counts_for_lists(
            [lst.id for lst in page_rows], tenant_id
        )
        rows = [
            self._to_list_out(lst, viewer, counts.get(lst.id, (0, 0)))
            for lst in page_rows
        ]
        return rows, total

    def has_any_list_access(self, viewer: CatalogPolicy) -> bool:
        """True if the viewer has any path into the catalog admin (AC-API-08).

        A platform superuser, a ``catalogs.manage`` holder, or a holder of
        any list's own ``manage_permission`` -- independent of the filters
        of a given ``list_lists`` call, so a filter that matches nothing
        gives such a viewer an empty page rather than a 403.
        """
        if viewer._is_superuser() or has_permission(
            viewer.permissions, CATALOGS_MANAGE_PERMISSION
        ):
            return True
        return any(
            has_permission(viewer.permissions, permission)
            for permission in self.repository.distinct_manage_permissions()
        )

    def get_list(
        self,
        tenant_id: UUID,
        viewer: CatalogPolicy,
        list_key: str,
        lst: CatalogList | None = None,
    ) -> CatalogListOut:
        """Return the admin detail view of one catalog list (AC-API-10).

        The caller (router) is responsible for calling
        ``viewer.assert_can_view_admin(lst)`` -- this method itself does not
        gate access, matching the existing ``/{list_key}/items`` router
        pattern where the policy check happens at the router level once the
        list row has been fetched.

        Args:
            tenant_id: The requesting tenant.
            viewer: The requesting viewer's CatalogPolicy.
            list_key: The catalog list key.
            lst: The list row, when the caller already loaded it (P2-13).

        Returns:
            A single ``CatalogListOut``.

        Raises:
            APIException: "CATALOG_LIST_NOT_FOUND" (404) if list_key is
                unknown.
        """
        if lst is None:
            lst = self._get_admin_list_or_404(list_key, tenant_id)
        counts = self.repository.counts_for_lists([lst.id], tenant_id)
        return self._to_list_out(lst, viewer, counts.get(lst.id, (0, 0)))

    def admin_items(
        self,
        tenant_id: UUID,
        viewer: CatalogPolicy,
        list_key: str,
        include_deprecated: bool = False,
        q: str | None = None,
        lst: CatalogList | None = None,
    ) -> CatalogAdminItemsResponse:
        """Return the full admin item view of one catalog list (AC-API-10).

        Not paginated (RULE-013 size caps bound the result set instead, per
        PERF-08). Ordered by effective ``sort_order`` then ``code``.

        Args:
            tenant_id: The requesting tenant.
            viewer: The requesting viewer's CatalogPolicy.
            list_key: The catalog list key.
            include_deprecated: Include deprecated items (default False).
            q: Optional case/accent-insensitive search on code or either
                effective label (max 100 chars).
            lst: The list row, when the caller already loaded it (P2-13).

        Returns:
            A ``CatalogAdminItemsResponse`` with the list detail and its
            admin items.

        Raises:
            APIException: "CATALOG_LIST_NOT_FOUND" (404) if list_key is
                unknown; "VALIDATION_ERROR" (422) if q exceeds 100 chars.
        """
        if q is not None and len(q) > _MAX_Q_LENGTH:
            raise APIException(
                "VALIDATION_ERROR",
                f"q accepts at most {_MAX_Q_LENGTH} characters.",
                status_code=422,
            )

        if lst is None:
            lst = self._get_admin_list_or_404(list_key, tenant_id)
        raw_items, overrides = self.repository.get_items_with_overrides(
            lst.id, tenant_id
        )

        # is_selectable must equal /items, including the RULE-010 read
        # fallback, which is evaluated over the tenant's whole item set
        # (deprecated items included) before any filtering (reviews R2-2,
        # N3-1: the same helper serves the write responses).
        visible = (
            raw_items
            if include_deprecated
            else [item for item in raw_items if item.deprecated_at is None]
        )
        items = self._admin_items_out(
            lst,
            tenant_id,
            [(item, overrides.get(item.id)) for item in visible],
            raw_items=raw_items,
            overrides=overrides,
        )

        if q:
            folded_q = _fold_accents(q.casefold())
            items = [
                item
                for item in items
                if folded_q in _fold_accents(item.code.casefold())
                or _label_matches(item.labels, folded_q)
            ]

        items.sort(key=lambda item: (item.sort_order, item.code))

        counts = self.repository.counts_for_lists([lst.id], tenant_id)
        list_out = self._to_list_out(lst, viewer, counts.get(lst.id, (0, 0)))
        return CatalogAdminItemsResponse(list=list_out, items=items)

    # ------------------------------------------------------------------
    # History read endpoints (ISSUE-022, C19)
    # ------------------------------------------------------------------

    def item_history(
        self,
        tenant_id: UUID,
        viewer: CatalogPolicy,
        list_key: str,
        code: str,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[CatalogItemVersionOut], int]:
        """Return one item's append-only version history (AC-API-25).

        Steps (frozen order, ISSUE-022 HOW):
          1. Resolve the list; 404 CATALOG_LIST_NOT_FOUND if unknown.
          2. viewer.assert_can_view_admin(lst); 403 AUTH_INSUFFICIENT_
             PERMISSIONS if false.
          3. Resolve the item scoped to (list_id, tenant-or-system); 404
             CATALOG_ITEM_NOT_FOUND if it resolves to neither.
          4. Query CatalogItemVersion filtered by
             item_id == item.id AND (tenant_id IS NULL OR tenant_id ==
             tenant_id), ordered by created_at DESC, paginated.
          5. Resolve changed_by per row via _resolve_changed_by (batch-
             loaded, no N+1).
          6. Return (rows, total).

        Args:
            tenant_id: The requesting tenant.
            viewer: The requesting viewer's CatalogPolicy.
            list_key: The catalog list key.
            code: The item code (a system code or this tenant's own code).
            page: 1-based page number (default 1).
            page_size: Page size, 1..100 (default 20).

        Returns:
            A (rows, total) tuple: rows is the requested page of
            CatalogItemVersionOut (newest first), total is the total
            matching row count for PaginationMeta.

        Raises:
            APIException: "CATALOG_LIST_NOT_FOUND" (404); "AUTH_INSUFFICIENT_
                PERMISSIONS" (403); "CATALOG_ITEM_NOT_FOUND" (404).
        """
        lst = self._get_admin_list_or_404(list_key, tenant_id)
        viewer.assert_can_view_admin(lst)

        item, _override = self._resolve_item_for_tenant(lst, tenant_id, code)

        query = self.db.query(CatalogItemVersion).filter(
            CatalogItemVersion.item_id == item.id,
            or_(
                CatalogItemVersion.tenant_id.is_(None),
                CatalogItemVersion.tenant_id == tenant_id,
            ),
        )
        total = query.count()
        version_rows = (
            query.order_by(CatalogItemVersion.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        changed_by_map = self._resolve_changed_by_map(
            viewer_tenant_id=tenant_id,
            actor_ids=[v.changed_by for v in version_rows if v.changed_by is not None],
        )

        rows = [
            CatalogItemVersionOut(
                id=str(version.id),
                version_number=version.version_number,
                change_type=version.change_type,
                before=_as_snapshot(version.before),
                after=_as_snapshot(version.after),
                batch_id=str(version.batch_id) if version.batch_id else None,
                scope="system" if version.tenant_id is None else "tenant",
                changed_by=changed_by_map.get(version.changed_by),
                change_reason=version.change_reason,
                created_at=version.created_at,
            )
            for version in version_rows
        ]
        return rows, total

    def list_history(
        self,
        tenant_id: UUID,
        viewer: CatalogPolicy,
        list_key: str,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[CatalogListVersionOut], int]:
        """Return one list's append-only version history (AC-API-26).

        List versions are global (no tenant_id column), so the version
        query itself is not tenant-scoped -- only changed_by resolution
        is (per-row, against each row's own actor_tenant_id).

        Args:
            tenant_id: The requesting viewer's tenant (used only for
                changed_by anonymization).
            viewer: The requesting viewer's CatalogPolicy.
            list_key: The catalog list key.
            page: 1-based page number (default 1).
            page_size: Page size, 1..100 (default 20).

        Returns:
            A (rows, total) tuple: rows is the requested page of
            CatalogListVersionOut (newest first), total is the total
            matching row count for PaginationMeta.

        Raises:
            APIException: "CATALOG_LIST_NOT_FOUND" (404); "AUTH_INSUFFICIENT_
                PERMISSIONS" (403).
        """
        lst = self._get_admin_list_or_404(list_key, tenant_id)
        viewer.assert_can_view_admin(lst)

        query = self.db.query(CatalogListVersion).filter(
            CatalogListVersion.list_id == lst.id
        )
        total = query.count()
        version_rows = (
            query.order_by(CatalogListVersion.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        user_ids = [v.changed_by for v in version_rows if v.changed_by is not None]
        users_by_id = self._batch_load_users(user_ids)

        rows = [
            CatalogListVersionOut(
                id=str(version.id),
                version_number=version.version_number,
                change_type=version.change_type,
                before=_as_snapshot(version.before),
                after=_as_snapshot(version.after),
                changed_by=self._changed_by_for_list_version(
                    version, users_by_id, viewer_tenant_id=tenant_id
                ),
                change_reason=version.change_reason,
                created_at=version.created_at,
            )
            for version in version_rows
        ]
        return rows, total

    def _batch_load_users(self, user_ids: list[UUID]) -> dict[UUID, User]:
        """Load distinct users by id in one query (avoids N+1)."""
        if not user_ids:
            return {}
        distinct_ids = list(set(user_ids))
        rows = (
            self.db.query(User)
            .filter(User.id.in_(distinct_ids))  # type: ignore[attr-defined]
            .all()
        )
        return {user.id: user for user in rows}

    def _resolve_changed_by_map(
        self, viewer_tenant_id: UUID, actor_ids: list[UUID]
    ) -> dict[UUID, ChangedByOut]:
        """Build {user_id: ChangedByOut} for item-version rows (AC-API-27).

        The actor's tenant is looked up live via User.tenant_id (item
        versions carry no actor_tenant_id column of their own).
        """
        users_by_id = self._batch_load_users(actor_ids)
        result: dict[UUID, ChangedByOut] = {}
        for user_id, user in users_by_id.items():
            if user.tenant_id == viewer_tenant_id:
                result[user_id] = ChangedByOut(
                    id=user.id, full_name=user.full_name, is_platform_actor=False
                )
            else:
                result[user_id] = ChangedByOut(
                    id=None, full_name=None, is_platform_actor=True
                )
        return result

    def _changed_by_for_list_version(
        self,
        version: CatalogListVersion,
        users_by_id: dict[UUID, User],
        viewer_tenant_id: UUID,
    ) -> ChangedByOut | None:
        """Resolve changed_by for one list-version row (AC-API-27).

        List versions snapshot the actor's tenant on the row itself
        (actor_tenant_id), so that stored value -- not a fresh User.tenant_id
        lookup -- is what is compared against the viewer's tenant.
        """
        if version.changed_by is None:
            return None
        user = users_by_id.get(version.changed_by)
        if user is None or version.actor_tenant_id != viewer_tenant_id:
            return ChangedByOut(id=None, full_name=None, is_platform_actor=True)
        return ChangedByOut(
            id=user.id, full_name=user.full_name, is_platform_actor=False
        )

    # ------------------------------------------------------------------
    # Item mutation (ISSUE-017/018, C14/C15)
    # ------------------------------------------------------------------

    def update_item(
        self,
        tenant_id: UUID,
        viewer: CatalogPolicy,
        list_key: str,
        code: str,
        labels: dict[str, str] | None,
        is_hidden: bool | None,
        reason: str | None,
        actor_id: UUID,
    ) -> CatalogAdminItemOut:
        """Relabel and/or hide one item for a tenant, versioned (AC-API-11/12/13).

        Args:
            tenant_id: The requesting tenant.
            viewer: The requesting viewer's CatalogPolicy.
            list_key: The catalog list key.
            code: The item code to mutate (a system code or this tenant's
                own ``x_`` code).
            labels: New labels to apply, or None to leave unchanged.
            is_hidden: New hidden state to apply, or None to leave unchanged.
            reason: Optional free-text change reason (<= 500 chars,
                enforced by the schema).
            actor_id: The acting user id, recorded on the version row.

        Returns:
            The mutated item as a ``CatalogAdminItemOut``.

        Raises:
            APIException: "CATALOG_LIST_NOT_FOUND" (404); "AUTH_INSUFFICIENT_
                PERMISSIONS" / "CATALOG_TENANT_MANAGE_DISABLED" (403) or
                "CATALOG_LIST_DEPRECATED" (409) via ``viewer.assert_can_manage``;
                "CATALOG_ITEM_NOT_FOUND" (404) for an unknown code or a code
                owned by a different tenant (identical body for both, E-08);
                "CATALOG_ITEM_DEPRECATED" (409); "CATALOG_LABELS_INVALID"
                (422); "CATALOG_LAST_VISIBLE_ITEM" (409); "CATALOG_VERSION_
                WRITE_FAILED" (500) if the version write fails, rolling back
                the whole mutation.
        """
        lst = self._get_admin_list_or_404(list_key, tenant_id)
        viewer.assert_can_manage(lst)

        item, override = self._resolve_item_for_tenant(lst, tenant_id, code)

        if item.deprecated_at is not None:
            raise APIException(
                "CATALOG_ITEM_DEPRECATED",
                f"Catalog item '{code}' is deprecated.",
                status_code=409,
            )

        if labels is not None:
            labels = self._validate_labels(labels)

        # RULE-010-adjacent guard (distinct from the read-time fallback):
        # a hide that would leave zero selectable items in this list is
        # rejected outright, before any row is written or flushed (AC-API-12).
        if is_hidden:
            self._assert_not_hiding_last_visible_item(lst, tenant_id, item.id)

        before = self._item_snapshot(item, override)

        # A request equal to the current effective state is a no-op: no
        # override row, no version row, no cache invalidation (phase 250
        # walkthrough, RUTA-43; same contract as an unchanged reorder,
        # AC-API-14, and unchanged governance, AC-API-23). Without this, a
        # "save" with nothing changed left an empty override behind and the
        # item showed as "Modificado" with an empty history entry.
        if self._item_snapshot_after(item, before, labels, is_hidden) == before:
            return self._admin_items_out(lst, tenant_id, [(item, override)])[0]

        change_type = self._determine_change_type(labels, is_hidden)

        if item.is_system:
            override = self._apply_system_item_update(
                item, override, tenant_id, labels, is_hidden, actor_id
            )
        else:
            self._apply_tenant_item_update(item, labels, is_hidden)

        after = self._item_snapshot(item, override)

        try:
            versioning.write_item_version(
                self.db,
                item=item,
                change_type=change_type,
                before=before,
                after=after,
                tenant_id=tenant_id,
                changed_by=actor_id,
                change_reason=reason,
            )
            self.db.commit()
        except Exception:
            self._version_write_failed(
                scope="item",
                change_type=change_type,
                list_key=list_key,
                tenant_id=tenant_id,
            )

        self.db.refresh(item)
        if override is not None:
            self.db.refresh(override)

        if self.cache is not None:
            self.cache.invalidate(list_key, tenant_id=tenant_id)

        return self._admin_items_out(lst, tenant_id, [(item, override)])[0]

    def reorder(
        self,
        tenant_id: UUID,
        viewer: CatalogPolicy,
        list_key: str,
        codes: list[str],
        reason: str | None,
        actor_id: UUID,
    ) -> tuple[list[CatalogAdminItemOut], UUID | None]:
        """Reorder a tenant's effective items of one catalog list (contract C15).

        ``codes`` must be an exact permutation of the tenant's current
        effective item codes for this list (system items visible to the
        tenant plus this tenant's own items, excluding deprecated items).
        Assigns spaced ``sort_order = (index + 1) * 10`` values in the given
        order, and versions only the items whose effective sort_order
        actually changes, all sharing one ``batch_id``.

        Args:
            tenant_id: The requesting tenant.
            viewer: The requesting viewer's CatalogPolicy.
            list_key: The catalog list key.
            codes: The tenant's desired full item order (a permutation of
                the current effective code set).
            reason: Optional free-text change reason (<= 500 chars,
                enforced by the schema).
            actor_id: The acting user id, recorded on each version row.

        Returns:
            A ``(items, batch_id)`` tuple. ``items`` is every current
            effective item as a ``CatalogAdminItemOut``, in the new order.
            ``batch_id`` is ``None`` (and nothing is written) when the
            submitted order already matches the current effective order,
            or when there is only one item -- otherwise it is the shared
            id of every ``CatalogItemVersion`` row this call writes.

        Raises:
            APIException: "CATALOG_LIST_NOT_FOUND" (404); "AUTH_INSUFFICIENT_
                PERMISSIONS" / "CATALOG_TENANT_MANAGE_DISABLED" (403) or
                "CATALOG_LIST_DEPRECATED" (409) via ``viewer.assert_can_manage``;
                "CATALOG_ORDER_MISMATCH" (422) if ``codes`` is not an exact
                permutation of the tenant's current effective code set;
                "CATALOG_VERSION_WRITE_FAILED" (500) if a version write
                fails, rolling back the whole batch.
        """
        lst = self._get_admin_list_or_404(list_key, tenant_id)
        viewer.assert_can_manage(lst)

        all_items, all_overrides = self.repository.get_items_with_overrides(
            lst.id, tenant_id
        )
        current_pairs = self._current_effective_items_for_reorder(
            all_items, all_overrides
        )
        current_codes = {item.code for item, _override in current_pairs}
        self._assert_exact_permutation(codes, current_codes)

        by_code = {item.code: (item, override) for item, override in current_pairs}
        ordered_pairs = [by_code[code] for code in codes]

        current_order = sorted(
            current_pairs,
            key=lambda pair: (self._effective_sort_order(*pair), pair[0].code),
        )
        current_order_codes = [item.code for item, _override in current_order]

        # Nothing written on the two early returns: the rows loaded above are
        # still current, so they also feed the response (review N4-1).
        if codes == current_order_codes:
            return (
                self._admin_items_out(
                    lst,
                    tenant_id,
                    current_order,
                    raw_items=all_items,
                    overrides=all_overrides,
                ),
                None,
            )

        batch_id = self._write_reorder_versions(
            ordered_pairs,
            list_key=list_key,
            tenant_id=tenant_id,
            actor_id=actor_id,
            reason=reason,
        )

        if batch_id is None:
            return (
                self._admin_items_out(
                    lst,
                    tenant_id,
                    ordered_pairs,
                    raw_items=all_items,
                    overrides=all_overrides,
                ),
                None,
            )

        # The commit expired every row: re-read the tenant's items in their
        # two constant queries instead of one refresh per item (P1-3); the
        # same rows feed the shared selectability computation (N3-1).
        raw_items, overrides = self.repository.get_items_with_overrides(
            lst.id, tenant_id
        )
        refreshed = {
            item.code: (item, overrides.get(item.id))
            for item in raw_items
            if item.deprecated_at is None
        }

        if self.cache is not None:
            self.cache.invalidate(list_key, tenant_id=tenant_id)

        result_items = self._admin_items_out(
            lst,
            tenant_id,
            [refreshed[code] for code in codes],
            raw_items=raw_items,
            overrides=overrides,
        )
        return result_items, batch_id

    def _current_effective_items_for_reorder(
        self,
        raw_items: list[CatalogItem],
        overrides: dict[UUID, CatalogItemOverride],
    ) -> list[tuple[CatalogItem, CatalogItemOverride | None]]:
        """The tenant's current effective (item, override) pairs, deprecated excluded.

        Same underlying data as ``admin_items(include_deprecated=False)``
        (system items visible to the tenant plus this tenant's own items,
        minus deprecated rows) but returned as raw model pairs instead of a
        ``CatalogAdminItemsResponse`` DTO, since reorder needs to mutate the
        rows directly rather than just serialize them. Built from the rows of
        ``repository.get_items_with_overrides``, which the caller keeps for
        the response.
        """
        return [
            (item, overrides.get(item.id))
            for item in raw_items
            if item.deprecated_at is None
        ]

    def _assert_exact_permutation(
        self, codes: list[str], current_codes: set[str]
    ) -> None:
        """422 CATALOG_ORDER_MISMATCH unless ``codes`` is an exact permutation."""
        submitted_codes = set(codes)
        missing = current_codes - submitted_codes
        unexpected = submitted_codes - current_codes

        seen: set[str] = set()
        duplicated: set[str] = set()
        for code in codes:
            if code in seen:
                duplicated.add(code)
            seen.add(code)

        if missing or unexpected or duplicated:
            raise APIException(
                "CATALOG_ORDER_MISMATCH",
                "The submitted order does not match this catalog's current items.",
                status_code=422,
                details={
                    "missing": sorted(missing),
                    "unexpected": sorted(unexpected),
                    "duplicated": sorted(duplicated),
                },
            )

    def _effective_sort_order(
        self, item: CatalogItem, override: CatalogItemOverride | None
    ) -> int:
        if override is not None and override.sort_order is not None:
            return override.sort_order
        return item.sort_order

    def _sort_order_snapshot(self, sort_order: int) -> dict[str, Any]:
        return {"sort_order": sort_order}

    def _write_reorder_versions(
        self,
        ordered_pairs: list[tuple[CatalogItem, CatalogItemOverride | None]],
        *,
        list_key: str,
        tenant_id: UUID,
        actor_id: UUID,
        reason: str | None,
    ) -> UUID | None:
        """Apply the spaced sort_order and version only the items that changed.

        Mutates ``ordered_pairs`` in place: an index whose system item gains
        a freshly-created override has its tuple replaced with
        ``(item, new_override)``, so the caller's list stays accurate for
        serialization after this call returns.

        Returns the shared ``batch_id`` for the version rows written, or
        ``None`` if nothing changed (single-item list, or every item's
        target position already matches its current effective position).
        """
        changes: list[tuple[int, CatalogItem, CatalogItemOverride | None, int, int]] = (
            []
        )
        for index, (item, override) in enumerate(ordered_pairs):
            new_sort_order = (index + 1) * 10
            old_sort_order = self._effective_sort_order(item, override)
            if new_sort_order != old_sort_order:
                changes.append((index, item, override, old_sort_order, new_sort_order))

        if not changes:
            return None

        batch_id: UUID = uuid4()
        try:
            # Mutate every row in memory, then write all version rows in one
            # batch (one flush, one numbering query, one insert -- P1-3).
            entries: list[versioning.ItemVersionEntry] = []
            for index, item, override, old_sort_order, new_sort_order in changes:
                if item.is_system:
                    if override is None:
                        override = CatalogItemOverride(
                            tenant_id=tenant_id, item_id=item.id
                        )
                        self.db.add(override)
                        ordered_pairs[index] = (item, override)
                    override.sort_order = new_sort_order
                    override.updated_by = actor_id
                else:
                    item.sort_order = new_sort_order
                entries.append(
                    versioning.ItemVersionEntry(
                        item=item,
                        change_type="reordered",
                        before=self._sort_order_snapshot(old_sort_order),
                        after=self._sort_order_snapshot(new_sort_order),
                    )
                )

            versioning.write_item_versions(
                self.db,
                entries=entries,
                tenant_id=tenant_id,
                changed_by=actor_id,
                change_reason=reason,
                batch_id=batch_id,
            )
            self.db.commit()
        except Exception:
            self._version_write_failed(
                scope="item",
                change_type="reordered",
                list_key=list_key,
                tenant_id=tenant_id,
            )

        return batch_id

    def add_item(
        self,
        tenant_id: UUID,
        viewer: CatalogPolicy,
        list_key: str,
        labels: dict[str, str],
        reason: str | None,
        actor_id: UUID,
    ) -> CatalogAdminItemOut:
        """Add a tenant item with a generated ``x_`` code (ISSUE-019, C16, AC-API-15).

        Args:
            tenant_id: The requesting tenant.
            viewer: The requesting viewer's CatalogPolicy.
            list_key: The catalog list key.
            labels: The new item's labels (RULE-003 validated).
            reason: Optional free-text change reason (<= 500 chars,
                enforced by the schema).
            actor_id: The acting user id, recorded as ``created_by`` and on
                the version row.

        Returns:
            The newly created item as a ``CatalogAdminItemOut``, with
            ``is_modified=False`` (a freshly added tenant item is never
            "modified" relative to itself).

        Raises:
            APIException: "CATALOG_LIST_NOT_FOUND" (404); "AUTH_INSUFFICIENT_
                PERMISSIONS" / "CATALOG_TENANT_MANAGE_DISABLED" (403) or
                "CATALOG_LIST_DEPRECATED" / "CATALOG_LIST_LOCKED" /
                "CATALOG_LIST_NOT_EXTENSIBLE" (409) via
                ``viewer.assert_can_add``; "CATALOG_ITEM_LIMIT_REACHED" (409)
                if the tenant already has 200 non-deprecated items in this
                list; "CATALOG_LABELS_INVALID" (422); "CATALOG_CODE_
                EXHAUSTED" (409) if every ``_2``..``_99`` suffix collides;
                "CATALOG_VERSION_WRITE_FAILED" (500) if the version write
                fails, rolling back the whole mutation.
        """
        lst = self._get_admin_list_or_404(list_key, tenant_id)
        viewer.assert_can_add(lst)

        self._assert_under_item_limit(lst, tenant_id)
        labels = self._validate_labels(labels)

        sort_order = self._next_tenant_sort_order(lst, tenant_id)
        new_item = self._insert_tenant_item(
            lst, tenant_id, labels=labels, sort_order=sort_order, actor_id=actor_id
        )

        after = {
            "code": new_item.code,
            "labels": new_item.labels,
            "sort_order": new_item.sort_order,
            "is_hidden": False,
        }

        try:
            versioning.write_item_version(
                self.db,
                item=new_item,
                change_type="created",
                before=None,
                after=after,
                tenant_id=tenant_id,
                changed_by=actor_id,
                change_reason=reason,
            )
            self.db.commit()
        except Exception:
            self._version_write_failed(
                scope="item",
                change_type="created",
                list_key=list_key,
                tenant_id=tenant_id,
            )

        self.db.refresh(new_item)

        if self.cache is not None:
            self.cache.invalidate(list_key, tenant_id=tenant_id)

        return CatalogAdminItemOut(
            code=new_item.code,
            labels=_as_labels(new_item.labels),
            sort_order=new_item.sort_order,
            attributes=_as_attributes(new_item.attributes),
            is_system=False,
            is_selectable=True,
            id=str(new_item.id),
            default_labels=_as_labels(new_item.labels),
            default_sort_order=new_item.sort_order,
            is_hidden=False,
            is_modified=False,
            is_deprecated=False,
            created_at=new_item.created_at,
            updated_at=new_item.updated_at,
        )

    def _insert_tenant_item(
        self,
        lst: CatalogList,
        tenant_id: UUID,
        *,
        labels: dict[str, str],
        sort_order: int,
        actor_id: UUID,
    ) -> CatalogItem:
        """Insert a tenant item under a freshly generated, collision-free code.

        The code is generated from a read of the existing codes; a concurrent
        add with the same label can take that code before this insert. The
        insert runs in a savepoint, so a violation of the tenant-code unique
        index only discards that attempt: the code set is re-read and the
        code regenerated, a bounded number of times (review P2-6).

        Raises:
            APIException: "CATALOG_CODE_EXHAUSTED" (409) if every suffix is
                taken or the race never settles.
        """
        for _attempt in range(_CODE_INSERT_ATTEMPTS):
            existing_codes = self._existing_codes_for_list(lst, tenant_id)
            try:
                code = generate_tenant_code(labels, existing_codes)
            except CatalogCodeExhaustedError:
                break
            candidate = CatalogItem(
                list_id=lst.id,
                tenant_id=tenant_id,
                code=code,
                labels=labels,
                sort_order=sort_order,
                attributes={},
                is_system=False,
                is_hidden=False,
                created_by=actor_id,
            )
            try:
                with self.db.begin_nested():
                    self.db.add(candidate)
                    self.db.flush()
            except IntegrityError as exc:
                if not _is_tenant_code_conflict(exc):
                    raise
                logger.warning(
                    "Catalog code '%s' was taken concurrently in list '%s' for "
                    "tenant %s; regenerating.",
                    code,
                    lst.key,
                    tenant_id,
                )
                continue
            return candidate

        raise APIException(
            "CATALOG_CODE_EXHAUSTED",
            "Could not generate a unique code for this item; every "
            "suffix is already in use.",
            status_code=409,
        )

    def reset_item(
        self,
        tenant_id: UUID,
        viewer: CatalogPolicy,
        list_key: str,
        code: str,
        reason: str | None,
        actor_id: UUID,
    ) -> CatalogAdminItemOut:
        """Delete a tenant's override of a system item, versioned (ISSUE-020, C17).

        Args:
            tenant_id: The requesting tenant.
            viewer: The requesting viewer's CatalogPolicy.
            list_key: The catalog list key.
            code: The item code to reset (a system code only -- a tenant's
                own ``x_`` code has no module default to reset to).
            reason: Optional free-text change reason (<= 500 chars,
                enforced by the schema).
            actor_id: The acting user id, recorded on the version row.

        Returns:
            The item now reflecting the module defaults, as a
            ``CatalogAdminItemOut`` (no override means
            ``effective_labels = item.labels``, ``is_hidden=False``,
            ``is_modified=False``).

        Raises:
            APIException: "CATALOG_LIST_NOT_FOUND" (404); "AUTH_INSUFFICIENT_
                PERMISSIONS" / "CATALOG_TENANT_MANAGE_DISABLED" (403) or
                "CATALOG_LIST_DEPRECATED" (409) via ``viewer.assert_can_manage``;
                "CATALOG_ITEM_NOT_FOUND" (404) for an unknown code or a code
                owned by a different tenant; "CATALOG_ITEM_NOT_RESETTABLE"
                (409) if the item is a tenant-owned item (no module default
                exists); "CATALOG_ITEM_NOT_MODIFIED" (409) if the system item
                has no override for this tenant (nothing to reset);
                "CATALOG_VERSION_WRITE_FAILED" (500) if the version write
                fails, rolling back the whole mutation.
        """
        lst = self._get_admin_list_or_404(list_key, tenant_id)
        viewer.assert_can_manage(lst)

        item, override = self._resolve_item_for_tenant(lst, tenant_id, code)

        if not item.is_system:
            raise APIException(
                "CATALOG_ITEM_NOT_RESETTABLE",
                f"Catalog item '{code}' has no module default to reset to.",
                status_code=409,
            )

        if override is None:
            raise APIException(
                "CATALOG_ITEM_NOT_MODIFIED",
                f"Catalog item '{code}' has not been modified for this tenant.",
                status_code=409,
            )

        before = {
            "labels": override.labels,
            "sort_order": override.sort_order,
            "is_hidden": override.is_hidden,
        }
        after = {"labels": None, "sort_order": None, "is_hidden": False}

        self.db.delete(override)
        self.db.flush()

        try:
            versioning.write_item_version(
                self.db,
                item=item,
                change_type="reset",
                before=before,
                after=after,
                tenant_id=tenant_id,
                changed_by=actor_id,
                change_reason=reason,
            )
            self.db.commit()
        except Exception:
            self._version_write_failed(
                scope="item",
                change_type="reset",
                list_key=list_key,
                tenant_id=tenant_id,
            )

        self.db.refresh(item)

        if self.cache is not None:
            self.cache.invalidate(list_key, tenant_id=tenant_id)

        return self._admin_items_out(lst, tenant_id, [(item, None)])[0]

    def update_governance(
        self,
        viewer_user: User,
        list_key: str,
        tenant_can_manage: bool | None,
        is_extensible: bool | None,
        reason: str,
        expected_updated_at: datetime,
        viewer_permissions: set[str] | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[CatalogListOut, list[str], int]:
        """Superuser-only governance change with optimistic concurrency (ISSUE-021, C18).

        The caller (router) is responsible for gating this call behind the
        ``require_superuser`` FastAPI dependency (ISSUE-013) -- this method
        does not re-check ``viewer_user.is_superuser`` itself, but does call
        ``CatalogPolicy.assert_can_govern`` once the list is resolved, which
        re-affirms the superuser check (defensively) and then enforces the
        deprecated-list check (RULE-008's frozen precedence: 403
        ``CATALOG_GOVERNANCE_FORBIDDEN`` before 409
        ``CATALOG_LIST_DEPRECATED``).

        Args:
            viewer_user: The acting platform superuser.
            list_key: The catalog list key.
            tenant_can_manage: New value, or None to leave unchanged.
            is_extensible: New value, or None to leave unchanged.
            reason: Free-text change reason (10..500 chars, schema-enforced).
            expected_updated_at: The list's ``updated_at`` the caller last
                read; a mismatch means someone else changed it since
                (optimistic concurrency, E-01).
            viewer_permissions: The superuser's own permission set, used only
                for the response's ``viewer_capabilities`` (governance itself
                is gated on ``is_superuser``, never on a permission).
            ip_address: The client IP, recorded on the audit entry.
            user_agent: The client user agent, recorded on the audit entry.

        Returns:
            A ``(list, adjusted, version_number)`` tuple. ``adjusted`` lists
            any RULE-006 auto-normalization messages applied (empty if
            none). ``version_number`` is the list's latest
            ``catalog_list_versions.version_number`` -- unchanged if this
            call was a no-op (AC-API-23).

        Raises:
            APIException: "CATALOG_GOVERNANCE_FORBIDDEN" (403) via
                ``assert_can_govern`` if the viewer is not a superuser;
                "CATALOG_LIST_DEPRECATED" (409) via ``assert_can_govern``;
                "CATALOG_LIST_NOT_FOUND" (404) if list_key is unknown;
                "CATALOG_LIST_STALE" (409) if ``expected_updated_at`` does
                not match the list's current ``updated_at``;
                "CATALOG_LIST_LOCKED" (409) if the resulting
                ``is_extensible=True`` on a locked list.
        """
        # Lock the row before the staleness check so concurrent governance
        # changes are serialized: the second caller waits, then sees the
        # first one's updated_at and gets 409 STALE (P1-10, E-01).
        lst = self.repository.get_list_by_key_for_update(list_key)
        if lst is not None and self._is_hidden_for_tenant(lst, viewer_user.tenant_id):
            lst = None
        if lst is None:
            raise APIException(
                "CATALOG_LIST_NOT_FOUND",
                f"Catalog list '{list_key}' does not exist.",
                status_code=404,
            )
        policy = CatalogPolicy(viewer_user, viewer_permissions or set())
        policy.assert_can_govern(lst)

        if expected_updated_at != lst.updated_at:
            raise APIException(
                "CATALOG_LIST_STALE",
                "This catalog list was changed by someone else; reload and try again.",
                status_code=409,
            )

        new_tenant_can_manage = (
            tenant_can_manage
            if tenant_can_manage is not None
            else bool(lst.tenant_can_manage)
        )
        new_is_extensible = (
            is_extensible if is_extensible is not None else bool(lst.is_extensible)
        )

        # RULE-006 normalization (AC-API-21). Each adjustment is triggered
        # by the caller's explicit request against the RESULTING flags
        # (request merged over the stored state): is_extensible=true with a
        # resulting tenant_can_manage=false forces manage on, and
        # tenant_can_manage=false with a resulting is_extensible=true
        # forces extensible off. At most one adjustment applies per request
        # (the first wins when a request asks for both, e.g. {manage:false,
        # ext:true}), so the result always satisfies the DB CHECK and
        # ISSUE-033's confirm dialog previews at most one message.
        adjusted: list[str] = []
        opening_extensible = is_extensible is True and not new_tenant_can_manage
        closing_manage = tenant_can_manage is False and new_is_extensible

        if opening_extensible:
            new_tenant_can_manage = True
            adjusted.append(
                "tenant_can_manage set to true because is_extensible requires it"
            )
        elif closing_manage:
            new_is_extensible = False
            adjusted.append(
                "is_extensible set to false because tenant_can_manage was turned off"
            )

        if new_is_extensible and lst.is_locked:
            raise APIException(
                "CATALOG_LIST_LOCKED",
                "This catalog is locked; governance cannot make it extensible.",
                status_code=409,
            )

        current_version_number = self._current_list_version_number(lst)

        if new_tenant_can_manage == bool(
            lst.tenant_can_manage
        ) and new_is_extensible == bool(lst.is_extensible):
            return (
                self._to_list_out(
                    lst,
                    policy,
                    self.repository.counts_for_lists(
                        [lst.id], viewer_user.tenant_id
                    ).get(lst.id, (0, 0)),
                ),
                [],
                current_version_number,
            )

        before = {
            "tenant_can_manage": bool(lst.tenant_can_manage),
            "is_extensible": bool(lst.is_extensible),
        }
        lst.tenant_can_manage = new_tenant_can_manage
        lst.is_extensible = new_is_extensible
        after = {
            "tenant_can_manage": new_tenant_can_manage,
            "is_extensible": new_is_extensible,
        }

        try:
            version = versioning.write_list_version(
                self.db,
                lst=lst,
                change_type="governance_updated",
                before=before,
                after=after,
                changed_by=viewer_user.id,
                actor_tenant_id=viewer_user.tenant_id,
                change_reason=reason,
            )
            self.db.commit()
        except Exception:
            self._version_write_failed(
                scope="list",
                change_type="governance_updated",
                list_key=list_key,
                tenant_id=viewer_user.tenant_id,
            )

        self.db.refresh(lst)

        # Build the response before the best-effort audit write: if the
        # audit's own commit fails, the session is left needing a rollback
        # and no further query may run on it (P1-6).
        version_number = version.version_number
        counts = self.repository.counts_for_lists([lst.id], viewer_user.tenant_id)
        list_out = self._to_list_out(lst, policy, counts.get(lst.id, (0, 0)))
        list_id = lst.id

        try:
            create_audit_log_entry(
                self.db,
                user_id=viewer_user.id,
                tenant_id=viewer_user.tenant_id,
                action="catalogs.governance.updated",
                resource_type="catalog_list",
                resource_id=list_id,
                details={"before": before, "after": after, "reason": reason},
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception as exc:  # noqa: BLE001 - best-effort, never fail the request
            logger.warning("Failed to write governance audit log entry: %s", exc)
        finally:
            # The governance change is already committed; a rollback here
            # only discards a failed audit write (the helper swallows its
            # own errors) and is a no-op after a successful one.
            self.db.rollback()

        if self.cache is not None:
            self.cache.invalidate(list_key, tenant_id=None)

        return list_out, adjusted, version_number

    def _version_write_failed(
        self,
        *,
        scope: str,
        change_type: str,
        list_key: str,
        tenant_id: UUID | None,
    ) -> NoReturn:
        """RULE-015: roll the mutation back, log the failure, raise 500.

        Must be called from inside the ``except`` block of the failed version
        write, so ``logger.exception`` records its traceback.
        """
        self.db.rollback()
        logger.exception(
            "Catalog %s version write failed; mutation rolled back "
            "(change_type=%s, list_key=%s, tenant_id=%s)",
            scope,
            change_type,
            list_key,
            tenant_id,
        )
        raise_internal_server_error(
            "CATALOG_VERSION_WRITE_FAILED",
            f"Failed to write the catalog {scope} version history.",
        )

    def _current_list_version_number(self, lst: CatalogList) -> int:
        """The list's latest ``catalog_list_versions.version_number``, or 0."""
        current = (
            self.db.query(func.max(CatalogListVersion.version_number))
            .filter(CatalogListVersion.list_id == lst.id)
            .scalar()
        )
        return current or 0

    def _assert_under_item_limit(self, lst: CatalogList, tenant_id: UUID) -> None:
        """409 CATALOG_ITEM_LIMIT_REACHED if the tenant already has 200 non-deprecated items."""
        count = (
            self.db.query(CatalogItem)
            .filter(
                CatalogItem.list_id == lst.id,
                CatalogItem.tenant_id == tenant_id,
                CatalogItem.deprecated_at.is_(None),
            )
            .count()
        )
        if count >= _TENANT_ITEM_LIMIT:
            raise APIException(
                "CATALOG_ITEM_LIMIT_REACHED",
                f"This tenant already has the maximum of "
                f"{_TENANT_ITEM_LIMIT} items in this catalog.",
                status_code=409,
            )

    def _existing_codes_for_list(self, lst: CatalogList, tenant_id: UUID) -> set[str]:
        """Codes that collide for ``tenant_id`` in ``lst``: system + own tenant.

        Codes are unique per (list, tenant) (MODULE-SPEC RULE-012), so the
        collision set is every system code in the list (``tenant_id IS NULL``)
        plus every code owned by the requesting tenant. Deprecated items are
        included for both: a deprecated code must still never be reused by the
        same tenant. Codes owned by other tenants are deliberately excluded --
        counting them would let one tenant infer another tenant's codes from
        the suffix it receives, or exhaust another tenant's suffix space.
        """
        rows = (
            self.db.query(CatalogItem.code)
            .filter(
                CatalogItem.list_id == lst.id,
                or_(
                    CatalogItem.tenant_id.is_(None),
                    CatalogItem.tenant_id == tenant_id,
                ),
            )
            .all()
        )
        return {code for (code,) in rows}

    def _next_tenant_sort_order(self, lst: CatalogList, tenant_id: UUID) -> int:
        """``max(effective sort_order across the tenant's visible items) + 10``."""
        raw_items, overrides = self.repository.get_items_with_overrides(
            lst.id, tenant_id
        )
        effective_orders = [
            self._effective_sort_order(item, overrides.get(item.id))
            for item in raw_items
            if item.deprecated_at is None
        ]
        return (max(effective_orders) if effective_orders else 0) + 10

    def _resolve_item_for_tenant(
        self, lst: CatalogList, tenant_id: UUID, code: str
    ) -> tuple[CatalogItem, CatalogItemOverride | None]:
        """Resolve ``code`` scoped to ``(list_id, tenant_id)`` (E-08).

        A system item (``tenant_id IS NULL``) or this tenant's own item are
        the only two valid resolutions; any other case (unknown code, or a
        code owned by a different tenant) raises the identical
        CATALOG_ITEM_NOT_FOUND body, never leaking which case it was.
        """
        item = (
            self.db.query(CatalogItem)
            .filter(
                CatalogItem.list_id == lst.id,
                CatalogItem.code == code,
                or_(
                    CatalogItem.tenant_id.is_(None),
                    CatalogItem.tenant_id == tenant_id,
                ),
            )
            .one_or_none()
        )
        if item is None:
            raise_not_found("Catalog item")

        override = None
        if item.is_system:
            override = (
                self.db.query(CatalogItemOverride)
                .filter(
                    CatalogItemOverride.tenant_id == tenant_id,
                    CatalogItemOverride.item_id == item.id,
                )
                .one_or_none()
            )
        return item, override

    def _validate_labels(self, labels: dict[str, str]) -> dict[str, str]:
        """RULE-003: 1-100 chars per language after trim, no ``<``/``>``, both langs present.

        Returns the trimmed labels: what was validated is what is stored and
        compared (E-09), never the raw input.
        """
        for lang in _REQUIRED_LABEL_LANGUAGES:
            if lang not in labels:
                raise APIException(
                    "CATALOG_LABELS_INVALID",
                    f"labels.{lang} is required.",
                    status_code=422,
                    details={"field": f"labels.{lang}", "reason": "missing"},
                )

        normalized: dict[str, str] = {}
        for lang, value in labels.items():
            if lang not in _REQUIRED_LABEL_LANGUAGES:
                # RULE-003: only es/en are accepted this sprint.
                raise APIException(
                    "CATALOG_LABELS_INVALID",
                    f"labels.{lang} is not a supported language.",
                    status_code=422,
                    details={"field": f"labels.{lang}", "reason": "unsupported"},
                )
            trimmed = value.strip() if isinstance(value, str) else ""
            if not trimmed:
                raise APIException(
                    "CATALOG_LABELS_INVALID",
                    f"labels.{lang} must not be empty.",
                    status_code=422,
                    details={"field": f"labels.{lang}", "reason": "empty"},
                )
            if len(trimmed) > _MAX_LABEL_LENGTH:
                raise APIException(
                    "CATALOG_LABELS_INVALID",
                    f"labels.{lang} must be at most {_MAX_LABEL_LENGTH} characters.",
                    status_code=422,
                    details={"field": f"labels.{lang}", "reason": "too_long"},
                )
            if "<" in trimmed or ">" in trimmed:
                raise APIException(
                    "CATALOG_LABELS_INVALID",
                    f"labels.{lang} must not contain '<' or '>'.",
                    status_code=422,
                    details={"field": f"labels.{lang}", "reason": "html"},
                )
            # SEC-230-02: a label is one line of text. NUL would make the
            # JSONB write fail (500); any other control char is noise.
            if has_control_chars(trimmed):
                raise APIException(
                    "CATALOG_LABELS_INVALID",
                    f"labels.{lang} must not contain control characters.",
                    status_code=422,
                    details={"field": f"labels.{lang}", "reason": "control_char"},
                )
            normalized[lang] = trimmed
        return normalized

    def _determine_change_type(
        self, labels: dict[str, str] | None, is_hidden: bool | None
    ) -> str:
        """Pick the ITEM_CHANGE_TYPES value for this mutation.

        MS Section 9's change_type enum has no combined value: when both
        labels and is_hidden changed in one call, "labels_updated" is
        written (both fields are still present in the after-snapshot), per
        the issue's HOW step 7.
        """
        if labels is not None:
            return "labels_updated"
        if is_hidden is True:
            return "hidden"
        return "unhidden"

    def _apply_system_item_update(
        self,
        item: CatalogItem,
        override: CatalogItemOverride | None,
        tenant_id: UUID,
        labels: dict[str, str] | None,
        is_hidden: bool | None,
        actor_id: UUID,
    ) -> CatalogItemOverride:
        """Upsert this tenant's override of a system item (E-09)."""
        if override is None:
            override = CatalogItemOverride(tenant_id=tenant_id, item_id=item.id)
            self.db.add(override)

        if labels is not None:
            # E-09: a label equal to the system default stores labels=NULL
            # in the override, not a copy of the default.
            override.labels = None if labels == item.labels else labels
        if is_hidden is not None:
            override.is_hidden = is_hidden
        override.updated_by = actor_id

        self.db.flush()
        return override

    def _apply_tenant_item_update(
        self,
        item: CatalogItem,
        labels: dict[str, str] | None,
        is_hidden: bool | None,
    ) -> None:
        """Update a tenant-owned CatalogItem row directly (no override row)."""
        if labels is not None:
            item.labels = labels
        if is_hidden is not None:
            item.is_hidden = is_hidden
        self.db.flush()

    def _assert_not_hiding_last_visible_item(
        self,
        lst: CatalogList,
        tenant_id: UUID,
        changed_item_id: UUID,
    ) -> None:
        """409 CATALOG_LAST_VISIBLE_ITEM if this hide leaves zero selectable items.

        Evaluated across the tenant's full effective item set (MS Section 8
        selectability table), simulating the pending hide of
        ``changed_item_id`` in memory only -- this check runs and must fail
        before any row is written or flushed (AC-API-12), so it never relies
        on (or causes) any DB write.
        """
        raw_items, overrides = self.repository.get_items_with_overrides(
            lst.id, tenant_id
        )

        still_selectable = False
        for raw_item in raw_items:
            if raw_item.id == changed_item_id:
                # This is the item about to be hidden -- it can never stay
                # selectable under this pending change, regardless of its
                # current stored state.
                continue

            override = overrides.get(raw_item.id)
            resolved = self._resolve_one(
                lst,
                raw_item,
                override,
                include_hidden=False,
                requested_codes=set(),
                ignore_own_hide=False,
            )
            if resolved is not None and resolved.is_selectable:
                still_selectable = True
                break

        if not still_selectable:
            raise APIException(
                "CATALOG_LAST_VISIBLE_ITEM",
                "Cannot hide the last selectable item of this catalog.",
                status_code=409,
            )

    def _item_snapshot_after(
        self,
        item: CatalogItem,
        before: dict[str, Any],
        labels: dict[str, str] | None,
        is_hidden: bool | None,
    ) -> dict[str, Any]:
        """The snapshot ``update_item`` would produce, computed without writing.

        Mirrors ``_item_snapshot``: for a system item the effective hidden
        flag is the declaration's flag OR the override's, so un-hiding a
        system item hidden by its declaration changes nothing.
        """
        after = dict(before)
        if labels is not None:
            after["labels"] = _as_labels(labels)
        if is_hidden is not None:
            if item.is_system:
                after["is_hidden"] = bool(item.is_hidden) or is_hidden
            else:
                after["is_hidden"] = is_hidden
        return after

    def _item_snapshot(
        self, item: CatalogItem, override: CatalogItemOverride | None
    ) -> dict[str, Any]:
        """Build a before/after snapshot dict for the version row."""
        effective_labels = _as_labels(item.labels)
        effective_is_hidden = bool(item.is_hidden)
        if override is not None:
            if override.labels is not None:
                effective_labels = _as_labels(override.labels)
            if override.is_hidden:
                effective_is_hidden = True
        return {
            "code": item.code,
            "labels": effective_labels,
            "is_hidden": effective_is_hidden,
        }

    # ------------------------------------------------------------------
    # Admin read helpers
    # ------------------------------------------------------------------

    def _get_list_or_404(self, list_key: str) -> CatalogList:
        lst = self.repository.get_list_by_key(list_key)
        if lst is None:
            raise APIException(
                "CATALOG_LIST_NOT_FOUND",
                f"Catalog list '{list_key}' does not exist.",
                status_code=404,
            )
        return lst

    def get_admin_list_or_404(self, list_key: str, tenant_id: UUID) -> CatalogList:
        """Load a list for the admin surface, as the tenant sees it.

        A list whose owner module the tenant disabled answers the same
        ``CATALOG_LIST_NOT_FOUND`` 404 as an unknown key (superuser included).
        Consumer reads (resolve_items/resolve_many and the SDK) never call
        this: stored values must keep resolving.
        """
        return self._get_admin_list_or_404(list_key, tenant_id)

    def _get_admin_list_or_404(self, list_key: str, tenant_id: UUID) -> CatalogList:
        lst = self._get_list_or_404(list_key)
        if self._is_hidden_for_tenant(lst, tenant_id):
            raise APIException(
                "CATALOG_LIST_NOT_FOUND",
                f"Catalog list '{list_key}' does not exist.",
                status_code=404,
            )
        return lst

    def _is_hidden_for_tenant(self, lst: CatalogList, tenant_id: UUID) -> bool:
        """True when ``lst``'s owner module is disabled for ``tenant_id``."""
        return self._is_owner_disabled(lst.owner_module, tenant_id)

    def _is_owner_disabled(self, owner_module: str, tenant_id: UUID) -> bool:
        """True when ``owner_module`` is disabled for ``tenant_id`` (the ONE place of the rule).

        Only the owners actually on the admin surface are checked, each once
        per tenant per service instance (i.e. per request). Never walk every
        installed module: the registry reads one tenant config key per module,
        which on a cold cache cost one query per installed module per request.
        Modules the registry does not know are never treated as disabled, and
        critical core modules answer without a query. Fail-open: if the
        registry is not initialized or raises, nothing is filtered and one
        warning is logged -- this is UX scoping inside a tenant, not a
        security boundary. Core code must not import ``app.modules.*``; only
        the registry (core) is consulted.
        """
        memo_key = (tenant_id, owner_module)
        cached = self._owner_disabled.get(memo_key)
        if cached is not None:
            return cached
        try:
            from app.core.module_registry import get_module_registry

            registry = get_module_registry()
            disabled = owner_module in registry.get_all_modules() and not (
                registry.is_module_enabled(owner_module, tenant_id)
            )
        except Exception as exc:
            if not self._module_scoping_warned:
                logger.warning(
                    "Catalog admin module scoping skipped (module registry "
                    "unavailable): %s",
                    exc,
                )
                self._module_scoping_warned = True
            disabled = False
        self._owner_disabled[memo_key] = disabled
        return disabled

    def _validate_list_lists_params(
        self,
        q: str | None,
        sort_by: str,
        sort_dir: str,
        page: int,
        page_size: int,
    ) -> None:
        if sort_by not in _SORT_BY_VALUES:
            raise APIException(
                "VALIDATION_ERROR",
                f"sort_by must be one of {sorted(_SORT_BY_VALUES)}.",
                status_code=422,
            )
        if sort_dir not in _SORT_DIR_VALUES:
            raise APIException(
                "VALIDATION_ERROR",
                f"sort_dir must be one of {sorted(_SORT_DIR_VALUES)}.",
                status_code=422,
            )
        if page < 1:
            raise APIException(
                "VALIDATION_ERROR", "page must be >= 1.", status_code=422
            )
        if page_size < 1 or page_size > 100:
            raise APIException(
                "VALIDATION_ERROR",
                "page_size must be between 1 and 100.",
                status_code=422,
            )
        if q is not None and len(q) > _MAX_Q_LENGTH:
            raise APIException(
                "VALIDATION_ERROR",
                f"q accepts at most {_MAX_Q_LENGTH} characters.",
                status_code=422,
            )

    def _accent_fold_filter(
        self, candidates: list[CatalogList], q: str
    ) -> list[CatalogList]:
        """Python-side accent-insensitive precise filter (q search, SEC-07).

        Given the expected data volume for ``catalog_lists`` (a few dozen
        rows total, per the issue's HOW notes), the whole ``q`` match is
        done here in Python with plain (non-ILIKE) substring containment
        after NFKD accent folding on both sides -- a literal '%' or '_' in
        the search term is therefore compared literally, never as a
        wildcard (SEC-07), since this is not a SQL LIKE/ILIKE pattern at
        all.
        """
        folded_q = _fold_accents(q.casefold())
        matched = []
        for lst in candidates:
            if folded_q in _fold_accents(lst.key.casefold()):
                matched.append(lst)
                continue
            if _label_matches(_as_labels(lst.labels), folded_q):
                matched.append(lst)
        return matched

    def _scope_by_permission(
        self, candidates: list[CatalogList], viewer: CatalogPolicy
    ) -> list[CatalogList]:
        """Filter to the lists the viewer may administer (AC-API-08).

        A platform superuser or a ``catalogs.manage`` holder sees every
        candidate. Otherwise, the result is filtered to only the lists
        whose own ``manage_permission`` the viewer holds -- checked per
        row (a viewer might hold one list's manage_permission but not
        another's, even though neither holds the blanket ``catalogs.manage``).
        """
        if viewer._is_superuser() or has_permission(
            viewer.permissions, CATALOGS_MANAGE_PERMISSION
        ):
            return candidates
        return [
            lst
            for lst in candidates
            if lst.manage_permission is not None
            and has_permission(viewer.permissions, lst.manage_permission)
        ]

    def _to_list_out(
        self,
        lst: CatalogList,
        viewer: CatalogPolicy,
        counts: tuple[int, int],
    ) -> CatalogListOut:
        item_count, modified_count = counts
        caps = viewer.capabilities(lst)
        return CatalogListOut(
            id=str(lst.id),
            key=lst.key,
            owner_module=lst.owner_module,
            labels=_as_labels(lst.labels),
            description=_as_optional_labels(lst.description),
            tenant_can_manage=bool(lst.tenant_can_manage),
            is_extensible=bool(lst.is_extensible),
            is_locked=bool(lst.is_locked),
            manage_permission=lst.manage_permission,
            is_deprecated=lst.deprecated_at is not None,
            item_count=item_count,
            modified_count=modified_count,
            updated_at=lst.updated_at,
            viewer_capabilities=ViewerCapabilitiesOut.model_validate(caps),
        )

    def _admin_items_out(
        self,
        lst: CatalogList,
        tenant_id: UUID,
        pairs: list[tuple[CatalogItem, CatalogItemOverride | None]],
        *,
        raw_items: list[CatalogItem] | None = None,
        overrides: dict[UUID, CatalogItemOverride] | None = None,
    ) -> list[CatalogAdminItemOut]:
        """Serialize ``pairs`` for every admin response (read and write paths).

        ``is_selectable`` comes from ``_admin_selectability`` over the
        tenant's WHOLE item set, so the RULE-010 fallback is applied the same
        way in admin-items and in the PATCH / reorder / reset responses
        (review N3-1). Pass ``raw_items`` / ``overrides`` when already loaded;
        otherwise they are read here (two queries).
        """
        if raw_items is None or overrides is None:
            raw_items, overrides = self.repository.get_items_with_overrides(
                lst.id, tenant_id
            )
        selectable_by_code = self._admin_selectability(
            lst, raw_items, overrides, tenant_id
        )
        return [
            self._to_admin_item_out(
                lst, item, override, is_selectable=selectable_by_code.get(item.code)
            )
            for item, override in pairs
        ]

    def _admin_selectability(
        self,
        lst: CatalogList,
        raw_items: list[CatalogItem],
        overrides: dict[UUID, CatalogItemOverride],
        tenant_id: UUID,
    ) -> dict[str, bool]:
        """``{code: is_selectable}`` exactly as /items resolves it.

        The selectability table per item, then the RULE-010 read fallback
        over the whole set, the same two steps as ``_resolve_from_db``.
        """
        resolved = [
            resolved_item
            for resolved_item in (
                self._resolve_one(
                    lst,
                    item,
                    overrides.get(item.id),
                    include_hidden=True,
                    requested_codes=set(),
                    ignore_own_hide=False,
                )
                for item in raw_items
            )
            if resolved_item is not None
        ]
        resolved = self._apply_rule_010_fallback(
            lst, raw_items, overrides, resolved, tenant_id
        )
        return {item.code: item.is_selectable for item in resolved}

    def _to_admin_item_out(
        self,
        lst: CatalogList,
        item: CatalogItem,
        override: CatalogItemOverride | None,
        is_selectable: bool | None = None,
    ) -> CatalogAdminItemOut:
        # Effective labels / sort_order and is_selectable come from the same
        # evaluator as /items (MS Calculated Fields + selectability table), so
        # a closed list never applies the tenant's overrides here either
        # (review N-3). ``is_selectable`` may be passed in when the caller has
        # already applied the list-wide RULE-010 fallback (admin_items).
        resolved = self._resolve_one(
            lst,
            item,
            override,
            include_hidden=True,
            requested_codes=set(),
            ignore_own_hide=False,
        )
        if resolved is None:  # unreachable: include_hidden=True always resolves
            raise RuntimeError(f"Catalog item '{item.code}' did not resolve.")
        # MS line 1194: is_hidden is the EFFECTIVE hidden flag for this
        # tenant. A hide override only applies while the list is open to
        # tenant management (selectability row 6, RULE-009), review R2-2.
        # MS Calculated Fields (is_modified row): an override exists with
        # any non-null / non-default field -- a bare row left by E-09
        # (label set back to the default stores NULL) does not count.
        # System items only; a tenant's own item has no override. MS line
        # 1197: updated_at is the latest of the item's and the override's.
        is_hidden = bool(item.is_hidden)
        is_modified = (
            override is not None
            and bool(item.is_system)
            and (
                override.labels is not None
                or bool(override.is_hidden)
                or override.sort_order is not None
            )
        )
        updated_at = item.updated_at
        if override is not None:
            if override.is_hidden and lst.tenant_can_manage:
                is_hidden = True
            if override.updated_at is not None and (
                updated_at is None or override.updated_at > updated_at
            ):
                updated_at = override.updated_at

        return CatalogAdminItemOut(
            code=item.code,
            labels=resolved.labels,
            sort_order=resolved.sort_order,
            attributes=_as_attributes(item.attributes),
            is_system=item.is_system,
            is_selectable=(
                resolved.is_selectable if is_selectable is None else is_selectable
            ),
            id=str(item.id),
            default_labels=_as_labels(item.labels),
            default_sort_order=item.sort_order,
            is_hidden=is_hidden,
            is_modified=is_modified,
            is_deprecated=item.deprecated_at is not None,
            created_at=item.created_at,
            updated_at=updated_at,
        )

    # ------------------------------------------------------------------
    # Cache helpers -- fail-open even if the injected cache is not itself
    # fail-open (defensive: ISSUE-006's CatalogCache already never raises,
    # but resolve_items must not depend on that at this call site, per
    # AC-API-28).
    # ------------------------------------------------------------------

    def _safe_cache_get(
        self, tenant_id: UUID, list_key: str
    ) -> list[ResolvedItem] | None:
        cache = self.cache
        if cache is None:
            return None
        try:
            cached = cast("list[dict[str, Any]] | None", cache.get(tenant_id, list_key))
            if cached is None:
                return None
            # Deserialized inside the guard: an entry written in an older
            # shape is a miss, never a 500 (AC-API-28 fail-open).
            return [ResolvedItem(**item) for item in cached]
        except Exception as exc:  # noqa: BLE001 - fail-open by contract
            logger.warning("Catalog cache get failed, falling back to DB: %s", exc)
            return None

    def _safe_cache_generation(
        self, tenant_id: UUID, list_key: str
    ) -> tuple[int, int] | None:
        """The ``(list, tenant)`` cache generations, or None (unsupported / error)."""
        get_generations = getattr(self.cache, "get_generations", None)
        if get_generations is None:
            return None
        try:
            return cast("tuple[int, int] | None", get_generations(tenant_id, list_key))
        except Exception as exc:  # noqa: BLE001 - fail-open by contract
            logger.warning("Catalog cache generation read failed: %s", exc)
            return None

    def _safe_cache_set(
        self,
        tenant_id: UUID,
        list_key: str,
        items: list[ResolvedItem],
        generation: tuple[int, int] | None = None,
    ) -> None:
        cache = self.cache
        if cache is None:
            return
        payload = [asdict(item) for item in items]
        try:
            if generation is None:
                cache.set(tenant_id, list_key, payload)
            else:
                cache.set(tenant_id, list_key, payload, generation=generation)
        except Exception as exc:  # noqa: BLE001 - fail-open by contract
            logger.warning("Catalog cache set failed: %s", exc)

    # ------------------------------------------------------------------
    # Resolution
    # ------------------------------------------------------------------

    def _resolve_from_db(
        self,
        lst: CatalogList,
        tenant_id: UUID,
        *,
        include_hidden: bool,
        include_codes: list[str] | None,
    ) -> list[ResolvedItem]:
        raw_items, overrides = self.repository.get_items_with_overrides(
            lst.id, tenant_id
        )

        requested_codes = set(include_codes or [])

        maybe_resolved = [
            self._resolve_one(
                lst,
                item,
                overrides.get(item.id),
                include_hidden=include_hidden,
                requested_codes=requested_codes,
                ignore_own_hide=False,
            )
            for item in raw_items
        ]
        resolved = [item for item in maybe_resolved if item is not None]

        resolved = self._apply_rule_010_fallback(
            lst, raw_items, overrides, resolved, tenant_id
        )

        resolved.sort(key=lambda item: (item.sort_order, item.code))
        return resolved

    def _resolve_one(
        self,
        lst: CatalogList,
        item: CatalogItem,
        override: CatalogItemOverride | None,
        *,
        include_hidden: bool,
        requested_codes: set[str],
        ignore_own_hide: bool,
    ) -> ResolvedItem | None:
        """Apply the effective-fields + selectability-table logic to one item.

        Returns None when the item must not be shown at all (i.e. it is
        neither selectable, nor requested via include_codes, nor visible
        under include_hidden). Tenant-visibility ("another tenant's item is
        invisible") is already enforced at the repository query level, so
        this method never needs to check it.
        """
        is_hidden_override = bool(override.is_hidden) if override else False
        if ignore_own_hide:
            is_hidden_override = False

        is_deprecated_item = item.deprecated_at is not None
        # A tenant item's own is_hidden column applies the same way an
        # override's is_hidden does for a system item.
        is_hidden_self = bool(item.is_hidden) and not ignore_own_hide

        # Selectability table, branched in the exact MS Section 8 order.
        if lst.deprecated_at is not None:
            is_selectable = False
        elif is_deprecated_item:
            is_selectable = False
        elif not item.is_system and not lst.tenant_can_manage:
            # Row 4: own tenant item, list closed to tenant management.
            is_selectable = False
        elif not item.is_system and not lst.is_extensible:
            # Row 4 (not_extensible variant): own tenant item, list closed
            # to new items -- existing tenant items are still shown via
            # include_codes/include_hidden but never selectable once the
            # list stops being extensible.
            is_selectable = False
        elif not item.is_system and is_hidden_self:
            # Row 5: own hidden tenant item.
            is_selectable = False
        elif item.is_system and is_hidden_override and lst.tenant_can_manage:
            # Row 6: system item hidden by this tenant's override, list open.
            # Once the list is closed the override is not applied (RULE-009).
            is_selectable = False
        else:
            # Row 7: otherwise selectable.
            is_selectable = True

        is_requested = item.code in requested_codes
        # AC-API-05: a deprecated *list* still returns its items (all
        # non-selectable) by default -- this default visibility does not
        # require include_hidden, unlike an individually deprecated/hidden
        # item within an otherwise-live list.
        list_deprecated = lst.deprecated_at is not None
        visible = is_selectable or include_hidden or is_requested or list_deprecated
        if not visible:
            return None

        effective_labels = _as_labels(item.labels)
        effective_sort_order = item.sort_order
        if item.is_system and lst.tenant_can_manage and override is not None:
            if override.labels is not None:
                effective_labels = _as_labels(override.labels)
            if override.sort_order is not None:
                effective_sort_order = override.sort_order

        return ResolvedItem(
            code=item.code,
            labels=effective_labels,
            sort_order=effective_sort_order,
            attributes=_as_attributes(item.attributes),
            is_system=item.is_system,
            is_selectable=is_selectable,
        )

    def _apply_rule_010_fallback(
        self,
        lst: CatalogList,
        raw_items: list[CatalogItem],
        overrides: dict[UUID, CatalogItemOverride],
        resolved: list[ResolvedItem],
        tenant_id: UUID,
    ) -> list[ResolvedItem]:
        """RULE-010: never let this tenant end up with zero selectable items.

        If the selectable set is empty, recompute ignoring this tenant's own
        hide-overrides/is_hidden flags (but still respecting deprecation,
        list closure and extensibility) and log a warning naming the item
        codes and the tenant id. Only applied to the read path.
        """
        if any(item.is_selectable for item in resolved):
            return resolved

        maybe_fallback = [
            self._resolve_one(
                lst,
                item,
                overrides.get(item.id),
                include_hidden=False,
                requested_codes=set(),
                ignore_own_hide=True,
            )
            for item in raw_items
        ]
        fallback_resolved = [item for item in maybe_fallback if item is not None]

        if not any(item.is_selectable for item in fallback_resolved):
            # Even ignoring hides, nothing is selectable (e.g. every item is
            # deprecated, or the list itself is deprecated) -- RULE-010 only
            # promises to ignore hide-overrides, not to conjure a selectable
            # item where none can exist. Return the original resolution.
            return resolved

        selectable_codes = [
            item.code for item in fallback_resolved if item.is_selectable
        ]
        logger.warning(
            "RULE-010 read fallback: catalog list '%s' had zero selectable "
            "items for tenant %s after applying hides; ignoring this "
            "tenant's hide-overrides for items %s to serve at least one "
            "selectable item.",
            lst.key,
            tenant_id,
            selectable_codes,
        )

        # Merge: keep every item that was already visible (e.g. via
        # include_hidden) plus whatever the fallback now marks selectable,
        # de-duplicated by code, preferring the fallback's selectability.
        by_code = {item.code: item for item in resolved}
        for item in fallback_resolved:
            by_code[item.code] = item
        return list(by_code.values())
