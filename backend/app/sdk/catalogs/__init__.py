"""aiutox_sdk.catalogs — public catalogs surface for cross-module access (ISSUE-015).

Business modules must use this facade instead of importing
``app.core.catalogs`` internals directly (forbidden by the module isolation
contract, CLAUDE.backend.md Section 8). Every function here opens a
``CatalogService`` from the given ``db`` session (and the fail-open catalog
cache) and delegates to it -- these are thin wrappers, not a parallel
implementation.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.catalogs.cache import get_catalog_cache
from app.core.catalogs.service import CatalogService, ResolvedItem

__all__ = ["require", "get_items", "labels_for"]


def _service(db: Session) -> CatalogService:
    return CatalogService(db, cache=get_catalog_cache())


def require(
    db: Session,
    tenant_id: UUID,
    list_key: str,
    code: str | None,
    current: str | None = None,
    field: str | None = None,
) -> None:
    """Validate a stored/incoming catalog code (C12, C13, AC-API-29, RULE-011).

    A no-op when ``code`` is ``None``. Accepts a currently selectable code,
    or a code equal to ``current`` (the record's existing stored value) even
    if that code is no longer selectable -- the read-time grandfathering
    counterpart to catalog selectability, so an existing record is not
    blocked from unrelated updates just because one of its catalog-backed
    fields has since been deprecated or hidden.

    Args:
        db: The active database session.
        tenant_id: The requesting tenant.
        list_key: The catalog list the code belongs to.
        code: The code to validate, or ``None`` to skip validation.
        current: The record's existing stored value, if any (grandfathering).
        field: Optional field name, included in the error ``details`` only.

    Raises:
        APIException: "CATALOG_CODE_INVALID" (422) if ``code`` is neither
            selectable nor grandfathered.
    """
    _service(db).require(tenant_id, list_key, code, current=current, field=field)


def get_items(db: Session, tenant_id: UUID, list_key: str) -> list[ResolvedItem]:
    """Thin wrapper over ``CatalogService.resolve_items`` returning just the items."""
    return _service(db).get_items(tenant_id, list_key)


def labels_for(
    db: Session, tenant_id: UUID, list_key: str, codes: list[str], lang: str
) -> dict[str, str]:
    """Resolve display labels for stored codes, including hidden/deprecated ones.

    For each code, returns ``labels[lang]``, falling back to
    ``labels["es"]``, falling back to the raw ``code`` itself when no labels
    are found at all. Resolves hidden and deprecated codes too (E-12), so a
    stored value keeps displaying correctly even after governance or sync
    makes it non-selectable.

    Args:
        db: The active database session.
        tenant_id: The requesting tenant.
        list_key: The catalog list the codes belong to.
        codes: The stored codes to label.
        lang: The preferred language key (e.g. "en").

    Returns:
        A ``{code: label}`` mapping, one entry per requested code.
    """
    return _service(db).labels_for(tenant_id, list_key, codes, lang)
