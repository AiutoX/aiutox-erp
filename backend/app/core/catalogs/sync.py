"""Catalog synchronization service.

This module provides CatalogSyncService, which validates every module's
declared catalogs and writes them to the database.

- validate_all (ISSUE-008): the in-memory, DB-free declaration-time
  business-rule validation gate. sync_all calls it before writing anything,
  and `aiutox catalogs:sync --dry-run` (ISSUE-011) relies on it to check
  declarations safely and cheaply.
- sync_all (ISSUE-009): collects declarations from the module registry,
  validates them, then creates new lists with their items, skips lists whose
  declaration checksum is unchanged, and applies the list-level update rules
  (RULE-007) to changed lists.
- ISSUE-010 completes sync_all: item reconciliation of changed lists (new,
  changed, removed and re-declared codes), deprecation of lists no module
  declares any more (full syncs only), reactivation of a re-declared
  deprecated list, a pg_advisory_xact_lock around the apply phase, cache
  invalidation of every changed list, and one summary log line.

sync_all flushes but never commits: the caller owns the transaction, so every
write and its version row commit or roll back together (RULE-015), and the
advisory lock is held until that commit or rollback. Rows are never deleted.
"""

import hashlib
import json
import logging
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import event, text

from app.core.catalogs.exceptions import CatalogDeclarationError
from app.core.catalogs.models import CatalogItem, CatalogList
from app.core.catalogs.versioning import (
    ItemVersionEntry,
    write_item_version,
    write_item_versions,
    write_list_version,
)

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.core.catalogs.cache import CatalogCache
    from app.core.catalogs.descriptors import (
        CatalogDescriptor,
        CatalogItemDescriptor,
    )
    from app.core.module_registry import ModuleRegistry

logger = logging.getLogger(__name__)

# AC-SYNC-12: fixed pg_advisory_xact_lock key for the catalog sync apply
# phase -- the first 8 bytes of a SHA-256, read as a signed 64-bit int so it
# fits Postgres' bigint lock-key range.
_SYNC_LOCK_KEY = int.from_bytes(
    hashlib.sha256(b"aiutox:catalogs:sync").digest()[:8], "big", signed=True
)

_CODE_PATTERN = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
_RESERVED_CODE_PREFIX = "x_"
_ALLOWED_LABEL_LANGUAGES = {"es", "en"}
_MAX_LABEL_LENGTH = 100
_MAX_ITEMS = 500


@dataclass
class SyncReport:
    """Counters returned by CatalogSyncService.sync_all.

    lists_updated counts existing lists whose declaration changed plus
    re-declared deprecated lists (reactivated). items_updated counts items
    whose labels / sort_order / attributes changed plus re-declared deprecated
    items (reactivated).
    """

    lists_created: int
    lists_updated: int
    lists_deprecated: int
    lists_skipped: int
    items_created: int
    items_updated: int
    items_deprecated: int


def compute_declaration_checksum(descriptor: "CatalogDescriptor") -> str:
    """SHA-256 of the canonical JSON of a descriptor (sorted keys).

    MODULE-SPEC "Calculated Fields": declaration_checksum.
    """
    canonical = {
        "key": descriptor.key,
        "labels": descriptor.labels,
        "description": descriptor.description,
        "tenant_can_manage": descriptor.tenant_can_manage,
        "is_extensible": descriptor.is_extensible,
        "is_locked": descriptor.is_locked,
        "manage_permission": descriptor.manage_permission,
        "items": tuple(
            {
                "code": item.code,
                "labels": item.labels,
                "sort_order": item.sort_order,
                "attributes": item.attributes,
            }
            for item in descriptor.items
        ),
    }
    return hashlib.sha256(json.dumps(canonical, sort_keys=True).encode()).hexdigest()


def _list_snapshot(lst: CatalogList) -> dict[str, Any]:
    """Snapshot stored in catalog_list_versions.before/after (AC-SYNC-07)."""
    return {
        "labels": lst.labels,
        "tenant_can_manage": lst.tenant_can_manage,
        "is_extensible": lst.is_extensible,
        "is_locked": lst.is_locked,
        "manage_permission": lst.manage_permission,
    }


def _item_snapshot(item: CatalogItem) -> dict[str, Any]:
    """Snapshot stored in catalog_item_versions.before/after."""
    return {
        "code": item.code,
        "labels": item.labels,
        "sort_order": item.sort_order,
        "attributes": item.attributes,
        "is_hidden": item.is_hidden,
    }


class CatalogSyncService:
    """Validates and synchronizes module catalog declarations to the database.

    validate_all is the DB-free validation gate (ISSUE-008); sync_all is the
    write path (ISSUE-009, extended by ISSUE-010).
    """

    def __init__(
        self, db: "Session | None", cache: "CatalogCache | None" = None
    ) -> None:
        """Initialize the service.

        Args:
            db: The database session. May be None -- validate_all performs
                no DB access, so a None db is fine for validation-only use
                (e.g. tests, or `catalogs:sync --dry-run`).
            cache: Optional catalog cache. validate_all performs no cache
                operations -- only sync_all does -- so it defaults to None.
        """
        self.db = db
        self.cache = cache

    def sync_all(
        self,
        registry: "ModuleRegistry",
        dry_run: bool = False,
        module_id: str | None = None,
    ) -> SyncReport:
        """Validate every module's catalog declarations, then write them.

        Args:
            registry: Source of modules; only get_all_modules() is used.
            dry_run: Validate only. Returns an all-zero report and writes
                nothing; it does not compute what the counts would have been.
            module_id: When set, validate and apply only this module's
                declarations.

        Returns:
            A SyncReport with the counters of what was written.

        Raises:
            CatalogDeclarationError: If any declaration is invalid. Raised by
                validate_all before any write, so nothing is written.
        """
        declarations: dict[str, tuple[str, list[CatalogDescriptor]]] = {}
        for mid, module in registry.get_all_modules().items():
            if module_id and mid != module_id:
                continue
            descriptors = module.get_catalogs()
            if descriptors:
                declarations[mid] = (module.module_type, descriptors)

        self.validate_all(declarations)

        report = SyncReport(0, 0, 0, 0, 0, 0, 0)
        if dry_run:
            return report

        assert self.db is not None, "sync_all requires a database session"
        # AC-SYNC-12: serialize concurrent syncs. Transaction-scoped: released
        # when the caller commits or rolls back. A second caller blocks here,
        # then reads the first caller's committed rows (READ COMMITTED takes a
        # fresh snapshot per statement) and writes nothing it already applied.
        self.db.execute(
            text("SELECT pg_advisory_xact_lock(:key)"), {"key": _SYNC_LOCK_KEY}
        )

        touched: set[str] = set()
        declared_keys: set[str] = set()
        for mid, (_module_type, descriptors) in declarations.items():
            for descriptor in descriptors:
                declared_keys.add(descriptor.key)
                if self._sync_one_list(mid, descriptor, report):
                    touched.add(descriptor.key)

        if module_id is None:
            # A --module partial sync must not deprecate lists owned by
            # modules it did not scan.
            touched |= self._deprecate_undeclared_lists(declared_keys, report)

        # AC-SYNC-11: every tenant's cached copy of a changed list is stale --
        # but only once the caller commits. Invalidating before the commit
        # lets a concurrent reader re-cache the pre-sync rows (review N-4).
        if self.cache is not None and touched:
            self._invalidate_after_commit(sorted(touched))

        logger.info(
            "Catalog sync: lists_created=%d lists_updated=%d lists_deprecated=%d "
            "lists_skipped=%d items_created=%d items_updated=%d items_deprecated=%d",
            report.lists_created,
            report.lists_updated,
            report.lists_deprecated,
            report.lists_skipped,
            report.items_created,
            report.items_updated,
            report.items_deprecated,
        )
        return report

    def _invalidate_after_commit(self, list_keys: list[str]) -> None:
        """Invalidate every tenant's cached copy of ``list_keys`` on commit.

        sync_all never commits (the caller owns the transaction), so the
        invalidation is bound to the session's next real commit; a rollback
        discards it. Both listeners are one-shot; whichever fires first
        disarms the other. Fail-open: a cache error never breaks the commit.
        """
        assert self.db is not None, "sync_all requires a database session"
        cache = self.cache
        state = {"armed": True}

        def _on_commit(_session: Any) -> None:
            if not state["armed"] or cache is None:
                return
            state["armed"] = False
            for key in list_keys:
                try:
                    cache.invalidate(key, tenant_id=None)
                except Exception as exc:  # noqa: BLE001 - fail-open
                    logger.warning(
                        "Catalog sync: cache invalidation of '%s' failed: %s",
                        key,
                        exc,
                    )

        def _on_rollback(_session: Any) -> None:
            state["armed"] = False

        event.listen(self.db, "after_commit", _on_commit, once=True)
        event.listen(self.db, "after_rollback", _on_rollback, once=True)

    def _sync_one_list(
        self, module_id: str, descriptor: "CatalogDescriptor", report: SyncReport
    ) -> bool:
        """Apply one declaration. Returns True when stored data changed."""
        assert self.db is not None, "sync_all requires a database session"
        checksum = compute_declaration_checksum(descriptor)
        lst = (
            self.db.query(CatalogList)
            .filter(CatalogList.key == descriptor.key)
            .one_or_none()
        )
        if lst is None:
            self._create_list(module_id, descriptor, checksum, report)
            return True

        reactivated = lst.deprecated_at is not None
        if reactivated:
            # A list deprecated by an earlier sweep is declared again.
            self._reactivate_list(lst)

        if lst.declaration_checksum == checksum:
            # AC-SYNC-06: unchanged declaration -> no writes at all.
            if reactivated:
                report.lists_updated += 1
            else:
                report.lists_skipped += 1
            return reactivated

        self._update_list(lst, descriptor, checksum)
        report.lists_updated += 1
        self._reconcile_items(lst, descriptor, report)
        return True

    def _reactivate_list(self, lst: CatalogList) -> None:
        """Clear deprecated_at on a re-declared list and record "reactivated"."""
        db = self.db
        assert db is not None
        snapshot = _list_snapshot(lst)
        lst.deprecated_at = None
        db.flush()
        write_list_version(
            db,
            lst=lst,
            change_type="reactivated",
            before=snapshot,
            after=_list_snapshot(lst),
        )

    def _deprecate_undeclared_lists(
        self, declared_keys: set[str], report: SyncReport
    ) -> set[str]:
        """AC-SYNC-10: deprecate (never delete) lists no module declares.

        Returns the keys of the lists deprecated by this call.
        """
        db = self.db
        assert db is not None
        query = db.query(CatalogList).filter(CatalogList.deprecated_at.is_(None))
        if declared_keys:
            query = query.filter(CatalogList.key.notin_(declared_keys))

        deprecated: set[str] = set()
        for lst in query.all():
            snapshot = _list_snapshot(lst)
            lst.deprecated_at = datetime.now(UTC)
            db.flush()
            write_list_version(
                db,
                lst=lst,
                change_type="deprecated",
                before=snapshot,
                after=_list_snapshot(lst),
            )
            report.lists_deprecated += 1
            deprecated.add(lst.key)
        return deprecated

    def _reconcile_items(
        self, lst: CatalogList, descriptor: "CatalogDescriptor", report: SyncReport
    ) -> None:
        """AC-SYNC-09: bring the list's system items in line with the declaration.

        Only fields that actually differ are assigned, so an unchanged item
        issues no UPDATE and gets no version row.
        """
        db = self.db
        assert db is not None
        existing = {
            item.code: item
            for item in db.query(CatalogItem)
            .filter(CatalogItem.list_id == lst.id, CatalogItem.tenant_id.is_(None))
            .all()
        }

        for declared in descriptor.items:
            item = existing.get(declared.code)
            if item is None:
                self._insert_item(lst, declared, report)
                continue

            before = _item_snapshot(item)
            if item.labels != declared.labels:
                item.labels = declared.labels
            if item.sort_order != declared.sort_order:
                item.sort_order = declared.sort_order
            if item.attributes != declared.attributes:
                item.attributes = declared.attributes
            after = _item_snapshot(item)

            reactivated = item.deprecated_at is not None
            if reactivated:
                # A re-declared deprecated code comes back; one "reactivated"
                # version also records any label/order/attribute change.
                item.deprecated_at = None

            if reactivated or after != before:
                db.flush()
                write_item_version(
                    db,
                    item=item,
                    change_type="reactivated" if reactivated else "synced",
                    before=before,
                    after=after,
                )
                report.items_updated += 1

        declared_codes = {declared.code for declared in descriptor.items}
        for code, item in existing.items():
            if code in declared_codes or item.deprecated_at is not None:
                continue
            # A code no longer declared is deprecated, never deleted.
            snapshot = _item_snapshot(item)
            item.deprecated_at = datetime.now(UTC)
            db.flush()
            write_item_version(
                db,
                item=item,
                change_type="deprecated",
                before=snapshot,
                after=_item_snapshot(item),
            )
            report.items_deprecated += 1

    def _insert_item(
        self,
        lst: CatalogList,
        declared: "CatalogItemDescriptor",
        report: SyncReport,
    ) -> None:
        """Insert one newly declared system item and its "created" version."""
        db = self.db
        assert db is not None
        item = CatalogItem(
            list_id=lst.id,
            tenant_id=None,
            code=declared.code,
            labels=declared.labels,
            sort_order=declared.sort_order,
            attributes=declared.attributes,
            is_system=True,
            is_hidden=False,
        )
        db.add(item)
        db.flush()
        write_item_version(
            db,
            item=item,
            change_type="created",
            before=None,
            after=_item_snapshot(item),
        )
        report.items_created += 1

    def _update_list(
        self, lst: CatalogList, descriptor: "CatalogDescriptor", checksum: str
    ) -> None:
        """AC-SYNC-07: apply the module-owned columns of a changed declaration.

        RULE-007: labels, description, is_locked and manage_permission are
        owned by the declaration; tenant_can_manage and is_extensible are
        written only at creation (then only by governance) and are never
        taken from the declaration here -- except that becoming locked forces
        is_extensible to false (AC-SYNC-08).
        """
        db = self.db
        assert db is not None
        before = _list_snapshot(lst)
        old_description = lst.description

        lst.labels = descriptor.labels
        lst.description = descriptor.description
        lst.is_locked = descriptor.is_locked
        if lst.is_locked and lst.is_extensible:
            # AC-SYNC-08 / RULE-006: a list cannot be both locked and
            # extensible, so becoming locked forces is_extensible off. This
            # is the only case where sync writes is_extensible after creation.
            lst.is_extensible = False
        lst.manage_permission = descriptor.manage_permission
        lst.declaration_checksum = checksum
        db.flush()

        after = _list_snapshot(lst)
        if after != before or lst.description != old_description:
            write_list_version(
                db,
                lst=lst,
                change_type="declaration_synced",
                before=before,
                after=after,
            )

    def _create_list(
        self,
        module_id: str,
        descriptor: "CatalogDescriptor",
        checksum: str,
        report: SyncReport,
    ) -> None:
        """AC-SYNC-05: insert the list, every declared item, and their versions."""
        db = self.db
        assert db is not None
        lst = CatalogList(
            key=descriptor.key,
            owner_module=module_id,
            labels=descriptor.labels,
            description=descriptor.description,
            tenant_can_manage=descriptor.tenant_can_manage,
            is_extensible=descriptor.is_extensible,
            is_locked=descriptor.is_locked,
            manage_permission=descriptor.manage_permission,
            declaration_checksum=checksum,
        )
        db.add(lst)
        db.flush()

        items = [
            CatalogItem(
                list_id=lst.id,
                tenant_id=None,
                code=item.code,
                labels=item.labels,
                sort_order=item.sort_order,
                attributes=item.attributes,
                is_system=True,
                is_hidden=False,
            )
            for item in descriptor.items
        ]
        db.add_all(items)
        db.flush()

        write_list_version(
            db, lst=lst, change_type="created", before=None, after=_list_snapshot(lst)
        )
        # One numbering query and one insert for the whole list (P1-3).
        write_item_versions(
            db,
            entries=[
                ItemVersionEntry(
                    item=item,
                    change_type="created",
                    before=None,
                    after=_item_snapshot(item),
                )
                for item in items
            ],
        )

        report.lists_created += 1
        report.items_created += len(items)

    def validate_all(
        self, declarations: dict[str, tuple[str, list["CatalogDescriptor"]]]
    ) -> None:
        """Validate every module's declared catalogs together, in memory only.

        Args:
            declarations: Maps module_id -> (module_type, descriptors). Every
                module's declarations are inspected together in one pass so
                that the cross-module duplicate-key rule can be enforced.

        Raises:
            CatalogDeclarationError: On the first violation found. Validation
                order: for each module (dict iteration order), for each of
                its descriptors (list order), every single-list rule is
                checked before moving to the next descriptor. Only after
                every single-list rule has passed for every declaration is
                the cross-module duplicate-key rule checked, so a malformed
                single list is always reported before a cross-module
                collision.

        Note:
            Performs no database access -- this is what makes
            `catalogs:sync --dry-run` safe and cheap.
        """
        seen_keys: dict[str, str] = {}

        for module_id, (module_type, descriptors) in declarations.items():
            for descriptor in descriptors:
                self._validate_namespace(module_id, module_type, descriptor)
                self._validate_code_format(module_id, descriptor)
                self._validate_duplicate_code(module_id, descriptor)
                self._validate_labels(module_id, descriptor)
                self._validate_zero_items(module_id, descriptor)
                self._validate_size_limit(module_id, descriptor)
                self._validate_lock_extensible_conflict(module_id, descriptor)

        for module_id, (_module_type, descriptors) in declarations.items():
            for descriptor in descriptors:
                if descriptor.key in seen_keys:
                    # Deterministic choice: the second module encountered
                    # (this one) is named as the offending module.
                    raise CatalogDeclarationError(
                        module=module_id,
                        key=descriptor.key,
                        rule="duplicate_key_across_modules",
                    )
                seen_keys[descriptor.key] = module_id

    def _validate_namespace(
        self, module_id: str, module_type: str, descriptor: "CatalogDescriptor"
    ) -> None:
        expected_prefix = "core." if module_type == "core" else f"{module_id}."
        if not descriptor.key.startswith(expected_prefix):
            raise CatalogDeclarationError(
                module=module_id, key=descriptor.key, rule="namespace"
            )

    def _validate_code_format(
        self, module_id: str, descriptor: "CatalogDescriptor"
    ) -> None:
        for item in descriptor.items:
            if not _CODE_PATTERN.match(item.code) or item.code.startswith(
                _RESERVED_CODE_PREFIX
            ):
                raise CatalogDeclarationError(
                    module=module_id, key=descriptor.key, rule="code_format"
                )

    def _validate_duplicate_code(
        self, module_id: str, descriptor: "CatalogDescriptor"
    ) -> None:
        seen_codes: set[str] = set()
        for item in descriptor.items:
            if item.code in seen_codes:
                raise CatalogDeclarationError(
                    module=module_id, key=descriptor.key, rule="duplicate_code"
                )
            seen_codes.add(item.code)

    def _validate_labels(self, module_id: str, descriptor: "CatalogDescriptor") -> None:
        self._validate_label_dict(module_id, descriptor, descriptor.labels)
        if descriptor.description is not None:
            self._validate_label_dict(module_id, descriptor, descriptor.description)
        for item in descriptor.items:
            self._validate_label_dict(module_id, descriptor, item.labels)

    def _validate_label_dict(
        self, module_id: str, descriptor: "CatalogDescriptor", labels: dict[str, str]
    ) -> None:
        if set(labels.keys()) != _ALLOWED_LABEL_LANGUAGES:
            raise CatalogDeclarationError(
                module=module_id, key=descriptor.key, rule="labels"
            )

        for value in labels.values():
            trimmed = value.strip() if isinstance(value, str) else ""
            if not trimmed:
                raise CatalogDeclarationError(
                    module=module_id, key=descriptor.key, rule="labels"
                )
            if len(trimmed) > _MAX_LABEL_LENGTH:
                raise CatalogDeclarationError(
                    module=module_id, key=descriptor.key, rule="labels"
                )
            if "<" in trimmed or ">" in trimmed:
                raise CatalogDeclarationError(
                    module=module_id, key=descriptor.key, rule="labels"
                )

    def _validate_zero_items(
        self, module_id: str, descriptor: "CatalogDescriptor"
    ) -> None:
        if len(descriptor.items) == 0:
            raise CatalogDeclarationError(
                module=module_id, key=descriptor.key, rule="zero_items"
            )

    def _validate_size_limit(
        self, module_id: str, descriptor: "CatalogDescriptor"
    ) -> None:
        if len(descriptor.items) > _MAX_ITEMS:
            raise CatalogDeclarationError(
                module=module_id, key=descriptor.key, rule="size_limit"
            )

    def _validate_lock_extensible_conflict(
        self, module_id: str, descriptor: "CatalogDescriptor"
    ) -> None:
        if descriptor.is_locked and descriptor.is_extensible:
            raise CatalogDeclarationError(
                module=module_id, key=descriptor.key, rule="lock_extensible_conflict"
            )
