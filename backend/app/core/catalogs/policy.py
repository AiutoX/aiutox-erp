"""Authorization policy for catalog lists (contract C10).

``CatalogPolicy`` is the single place that decides what a viewer may do with
a ``CatalogList``. It is pure: it computes booleans from the list and the
user/permissions it was given, and never queries the database.

The four capability formulas (MODULE-SPEC "Calculated Fields") are frozen:

- ``can_view_admin = is_superuser or has(catalogs.manage)
  or (manage_permission and has(manage_permission))``
- ``can_govern = is_superuser and not deprecated``
- ``can_manage = (has(catalogs.manage) or (manage_permission and
  has(manage_permission))) and tenant_can_manage and not deprecated``
- ``can_add_items = can_manage and is_extensible and not is_locked``

``can_govern`` depends on the ``is_superuser`` column only, never on a
permission string, so a tenant owner's ``*`` wildcard does not grant it
(RULE-008).
"""

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request

from app.core.auth.dependencies import get_current_user
from app.core.auth.permissions import has_permission
from app.core.catalogs.models import CatalogList
from app.core.exceptions import APIException
from app.core.logging import security_logger
from app.core.users.models import User

CATALOGS_MANAGE_PERMISSION = "catalogs.manage"


@dataclass(frozen=True)
class ViewerCapabilities:
    """What the current viewer may do with one catalog list."""

    can_view_admin: bool
    can_govern: bool
    can_manage: bool
    can_add_items: bool


class CatalogPolicy:
    """Computes and enforces catalog capabilities for one viewer."""

    def __init__(self, user: User, permissions: set[str]) -> None:
        self.user = user
        self.permissions = permissions

    def _is_superuser(self) -> bool:
        return bool(self.user.is_superuser)

    def _has_manage_permission(self, lst: CatalogList) -> bool:
        """True if the viewer holds catalogs.manage or the list's own permission."""
        if has_permission(self.permissions, CATALOGS_MANAGE_PERMISSION):
            return True
        return lst.manage_permission is not None and has_permission(
            self.permissions, lst.manage_permission
        )

    def capabilities(self, lst: CatalogList) -> ViewerCapabilities:
        """Compute the viewer's capabilities for ``lst`` (frozen C10 formulas)."""
        is_superuser = self._is_superuser()
        has_manage = self._has_manage_permission(lst)
        not_deprecated = lst.deprecated_at is None

        can_manage = has_manage and bool(lst.tenant_can_manage) and not_deprecated
        return ViewerCapabilities(
            can_view_admin=is_superuser or has_manage,
            can_govern=is_superuser and not_deprecated,
            can_manage=can_manage,
            can_add_items=(
                can_manage and bool(lst.is_extensible) and not bool(lst.is_locked)
            ),
        )

    def assert_can_manage(self, lst: CatalogList) -> None:
        """Raise unless the viewer may edit this tenant's view of ``lst``.

        Check order is FROZEN (C10): permission, then closed
        (``tenant_can_manage``), then deprecated. Being a superuser does not
        count as a permission here (AC-API-19).
        """
        if not self._has_manage_permission(lst):
            raise APIException(
                "AUTH_INSUFFICIENT_PERMISSIONS",
                "You do not have permission to manage this catalog.",
                status_code=403,
            )
        if not lst.tenant_can_manage:
            raise APIException(
                "CATALOG_TENANT_MANAGE_DISABLED",
                "This catalog is not open for tenant management.",
                status_code=403,
            )
        if lst.deprecated_at is not None:
            raise _list_deprecated()

    def assert_can_add(self, lst: CatalogList) -> None:
        """Raise unless the viewer may add a tenant item to ``lst``.

        Runs ``assert_can_manage`` first (inheriting its three checks and
        codes), then locked, then not extensible.
        """
        self.assert_can_manage(lst)
        if lst.is_locked:
            raise APIException(
                "CATALOG_LIST_LOCKED",
                "This catalog is locked.",
                status_code=409,
            )
        if not lst.is_extensible:
            raise APIException(
                "CATALOG_LIST_NOT_EXTENSIBLE",
                "This catalog does not accept new items.",
                status_code=409,
            )

    def assert_can_govern(self, lst: CatalogList) -> None:
        """Raise unless the viewer may change the governance of ``lst``.

        Order: not superuser, then deprecated. Only the ``is_superuser``
        column counts; no permission string (not even ``*``) grants
        governance (RULE-008).
        """
        if not self._is_superuser():
            raise _governance_forbidden()
        if lst.deprecated_at is not None:
            raise _list_deprecated()

    def assert_can_view_admin(self, lst: CatalogList) -> None:
        """Raise unless the viewer may open the admin view of ``lst``."""
        if not (self._is_superuser() or self._has_manage_permission(lst)):
            raise APIException(
                "AUTH_INSUFFICIENT_PERMISSIONS",
                "You do not have permission to administer this catalog.",
                status_code=403,
            )


def _list_deprecated() -> APIException:
    return APIException(
        "CATALOG_LIST_DEPRECATED",
        "This catalog is deprecated.",
        status_code=409,
    )


def _governance_forbidden() -> APIException:
    return APIException(
        "CATALOG_GOVERNANCE_FORBIDDEN",
        "Only a platform superuser can change catalog governance.",
        status_code=403,
    )


def require_superuser(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """FastAPI dependency: return the current user if a platform superuser.

    Raises 403 ``CATALOG_GOVERNANCE_FORBIDDEN`` otherwise, after logging the
    denial at WARNING (ids and path only, never the email -- same visibility
    as ``require_permission`` denials). Only the ``is_superuser`` column
    counts, never a permission wildcard (RULE-008).
    """
    if not current_user.is_superuser:
        security_logger.warning(
            "CATALOG_GOVERNANCE_FORBIDDEN: superuser required user_id=%s "
            "tenant_id=%s path=%s",
            current_user.id,
            current_user.tenant_id,
            request.url.path,
        )
        raise _governance_forbidden()
    return current_user
