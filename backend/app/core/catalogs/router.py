"""HTTP surface for the catalogs module (ISSUE-014).

The read path lives here: ``GET /resolve`` (ISSUE-015), ``GET /`` and
``GET /{list_key}`` and ``GET /{list_key}/admin-items`` (ISSUE-016), and
``GET /{list_key}/items`` (ISSUE-014). ``/resolve`` is registered first
since it is a static segment and must never risk being shadowed by the
dynamic single-segment ``/{list_key}`` route added by this issue. Mutation
endpoints (ISSUE-017+) are added to this same file by later issues.
"""

import re
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Request
from pydantic import AfterValidator
from sqlalchemy.orm import Session

from app.core.auth.dependencies import get_current_user, get_user_permissions
from app.core.catalogs.cache import get_catalog_cache
from app.core.catalogs.policy import (
    CatalogPolicy,
    require_superuser,
)
from app.core.catalogs.schemas import (
    CatalogAdminItemOut,
    CatalogAdminItemsResponse,
    CatalogGovernanceIn,
    CatalogItemCreateIn,
    CatalogItemOut,
    CatalogItemsResponse,
    CatalogItemUpdateIn,
    CatalogItemVersionOut,
    CatalogListOut,
    CatalogListVersionOut,
    CatalogOrderIn,
    CatalogOrderResultOut,
    CatalogResetIn,
    CatalogResolveResponse,
    ResolvedListOut,
)
from app.core.catalogs.service import CatalogService
from app.core.db.deps import get_db
from app.core.exceptions import APIException
from app.core.input_guards import reject_control_chars
from app.core.logging import get_client_info
from app.core.users.models import User
from app.schemas.common import PaginationMeta, StandardListResponse, StandardResponse

router = APIRouter()

_MAX_INCLUDE_CODES = 20
_MAX_RESOLVE_KEYS = 20
_LIST_KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$")
_SORT_BY_VALUES = ("owner_module", "key")
_SORT_DIR_VALUES = ("asc", "desc")

# SEC-230-02: every path or query string that reaches an SQL parameter is
# guarded against control characters at the edge (NUL makes the driver
# raise, which surfaced as a 500 in the phase 230 audit).
_NoControlChars = AfterValidator(reject_control_chars)
_ListKeyPath = Annotated[str, Path(max_length=128), _NoControlChars]
_CodePath = Annotated[str, Path(max_length=64), _NoControlChars]


def get_catalog_service(db: Annotated[Session, Depends(get_db)]) -> CatalogService:
    """Dependency factory: CatalogService wired to the fail-open catalog cache."""
    return CatalogService(db, cache=get_catalog_cache())


@router.get(
    "/resolve",
    response_model=StandardResponse[CatalogResolveResponse],
    summary="Resolve several catalog lists in one call",
    description=(
        "Resolves 1..20 catalog lists in a single call, each with the same "
        "effective-items semantics as GET /{list_key}/items. Keys that do "
        "not exist are returned in `not_found` instead of raising."
    ),
)
async def resolve_catalogs(
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[CatalogService, Depends(get_catalog_service)],
    keys: Annotated[list[str] | None, Query()] = None,
) -> StandardResponse[CatalogResolveResponse]:
    """`GET /catalogs/resolve` (ISSUE-015, AC-API-07)."""
    if not keys or len(keys) > _MAX_RESOLVE_KEYS:
        raise APIException(
            "VALIDATION_ERROR",
            f"keys accepts between 1 and {_MAX_RESOLVE_KEYS} entries.",
            status_code=422,
        )

    for key in keys:
        if not _LIST_KEY_PATTERN.match(key):
            raise APIException(
                "VALIDATION_ERROR",
                f"'{key}' is not a valid catalog list key.",
                status_code=422,
            )

    found, not_found = service.resolve_many(
        tenant_id=current_user.tenant_id, list_keys=keys
    )

    response_data = CatalogResolveResponse(
        lists=[
            ResolvedListOut(
                list_key=resolved.list_key,
                items=[
                    CatalogItemOut(
                        code=item.code,
                        labels=item.labels,
                        sort_order=item.sort_order,
                        attributes=item.attributes,
                        is_system=item.is_system,
                        is_selectable=item.is_selectable,
                    )
                    for item in resolved.items
                ],
            )
            for resolved in found
        ],
        not_found=not_found,
    )
    return StandardResponse(data=response_data)


@router.get(
    "",
    response_model=StandardListResponse[CatalogListOut],
    summary="List governable catalogs",
    description=(
        "Lists every catalog the current viewer may govern or manage, with "
        "per-row viewer capabilities. Access requires catalogs.manage, "
        "is_superuser, or holding any list's own manage_permission (in "
        "which case the result is filtered to just those lists)."
    ),
)
async def list_catalogs(
    current_user: Annotated[User, Depends(get_current_user)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CatalogService, Depends(get_catalog_service)],
    owner_module: Annotated[str | None, Query(max_length=64), _NoControlChars] = None,
    q: Annotated[str | None, Query(max_length=100), _NoControlChars] = None,
    include_deprecated: bool = Query(default=False),
    sort_by: str = Query(default="owner_module"),
    sort_dir: str = Query(default="asc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
) -> StandardListResponse[CatalogListOut]:
    """`GET /catalogs` (ISSUE-016, AC-API-08/09)."""
    if sort_by not in _SORT_BY_VALUES:
        raise APIException(
            "VALIDATION_ERROR",
            f"sort_by must be one of {list(_SORT_BY_VALUES)}.",
            status_code=422,
        )
    if sort_dir not in _SORT_DIR_VALUES:
        raise APIException(
            "VALIDATION_ERROR",
            f"sort_dir must be one of {list(_SORT_DIR_VALUES)}.",
            status_code=422,
        )

    policy = CatalogPolicy(current_user, user_permissions)
    # AC-API-08's "otherwise 403" applies only when no access path exists at
    # all -- blanket access or any list's own manage_permission -- never
    # because this call's filters happen to match nothing (review P2-3).
    if not service.has_any_list_access(policy):
        raise APIException(
            "AUTH_INSUFFICIENT_PERMISSIONS",
            "You do not have permission to administer any catalog.",
            status_code=403,
        )

    rows, total = service.list_lists(
        tenant_id=current_user.tenant_id,
        viewer=policy,
        owner_module=owner_module,
        q=q,
        include_deprecated=include_deprecated,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
    )

    total_pages = (total + page_size - 1) // page_size if total else 0
    return StandardListResponse(
        data=rows,
        meta=PaginationMeta(
            total=total, page=page, page_size=page_size, total_pages=total_pages
        ),
    )


@router.get(
    "/{list_key}",
    response_model=StandardResponse[CatalogListOut],
    summary="Get one catalog's admin detail",
    description=(
        "Returns the admin detail view of one catalog list. Requires "
        "can_view_admin for this specific list."
    ),
)
async def get_catalog(
    list_key: _ListKeyPath,
    current_user: Annotated[User, Depends(get_current_user)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CatalogService, Depends(get_catalog_service)],
) -> StandardResponse[CatalogListOut]:
    """`GET /catalogs/{list_key}` (ISSUE-016, AC-API-10)."""
    lst = service.get_admin_list_or_404(list_key, current_user.tenant_id)
    policy = CatalogPolicy(current_user, user_permissions)
    policy.assert_can_view_admin(lst)

    row = service.get_list(
        tenant_id=current_user.tenant_id, viewer=policy, list_key=list_key, lst=lst
    )
    return StandardResponse(data=row)


@router.get(
    "/{list_key}/admin-items",
    response_model=StandardResponse[CatalogAdminItemsResponse],
    summary="Get one catalog's full admin item view",
    description=(
        "Returns the list detail plus every item's full admin view "
        "(defaults, overrides, hidden/deprecated flags). Requires "
        "can_view_admin for this list. Not paginated."
    ),
)
async def get_catalog_admin_items(
    list_key: _ListKeyPath,
    current_user: Annotated[User, Depends(get_current_user)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CatalogService, Depends(get_catalog_service)],
    include_deprecated: bool = Query(default=False),
    q: Annotated[str | None, Query(max_length=100), _NoControlChars] = None,
) -> StandardResponse[CatalogAdminItemsResponse]:
    """`GET /catalogs/{list_key}/admin-items` (ISSUE-016, AC-API-10)."""
    lst = service.get_admin_list_or_404(list_key, current_user.tenant_id)
    policy = CatalogPolicy(current_user, user_permissions)
    policy.assert_can_view_admin(lst)

    response_data = service.admin_items(
        tenant_id=current_user.tenant_id,
        viewer=policy,
        list_key=list_key,
        include_deprecated=include_deprecated,
        q=q,
        lst=lst,
    )
    return StandardResponse(data=response_data)


@router.get(
    "/{list_key}/items",
    response_model=StandardResponse[CatalogItemsResponse],
    summary="Get effective catalog items",
    description=(
        "Returns the effective, selectability-annotated items of a catalog "
        "list for the current tenant, merging system items with tenant "
        "overrides."
    ),
)
async def get_catalog_items(
    list_key: _ListKeyPath,
    current_user: Annotated[User, Depends(get_current_user)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CatalogService, Depends(get_catalog_service)],
    include_hidden: bool = Query(default=False),
    include_codes: Annotated[
        list[Annotated[str, _NoControlChars]] | None, Query()
    ] = None,
) -> StandardResponse[CatalogItemsResponse]:
    """`GET /catalogs/{list_key}/items` (AC-API-01..06)."""
    if include_codes is not None and len(include_codes) > _MAX_INCLUDE_CODES:
        raise APIException(
            "VALIDATION_ERROR",
            f"include_codes accepts at most {_MAX_INCLUDE_CODES} codes.",
            status_code=422,
        )

    if include_hidden:
        lst = service.repository.get_list_by_key(list_key)
        if lst is None:
            raise APIException(
                "CATALOG_LIST_NOT_FOUND",
                f"Catalog list '{list_key}' does not exist.",
                status_code=404,
            )
        policy = CatalogPolicy(current_user, user_permissions)
        policy.assert_can_view_admin(lst)
        # The row is already loaded for the admin gate: reuse it (P2-13).
        resolved = service.resolve_list(
            lst,
            current_user.tenant_id,
            include_hidden=include_hidden,
            include_codes=include_codes,
        )
    else:
        resolved = service.resolve_items(
            tenant_id=current_user.tenant_id,
            list_key=list_key,
            include_hidden=include_hidden,
            include_codes=include_codes,
        )

    response_data = CatalogItemsResponse(
        list_key=resolved.list_key,
        is_deprecated=resolved.is_deprecated,
        items=[
            CatalogItemOut(
                code=item.code,
                labels=item.labels,
                sort_order=item.sort_order,
                attributes=item.attributes,
                is_system=item.is_system,
                is_selectable=item.is_selectable,
            )
            for item in resolved.items
        ],
    )
    return StandardResponse(data=response_data)


@router.post(
    "/{list_key}/items",
    response_model=StandardResponse[CatalogAdminItemOut],
    status_code=201,
    summary="Add a tenant item with a generated code",
    description=(
        "Adds a labelled item to this tenant's view of the catalog list, "
        "generating a stable, collision-free `x_` code from the label. "
        "Requires can_add_items for this list."
    ),
)
async def add_catalog_item(
    list_key: _ListKeyPath,
    body: CatalogItemCreateIn,
    current_user: Annotated[User, Depends(get_current_user)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CatalogService, Depends(get_catalog_service)],
) -> StandardResponse[CatalogAdminItemOut]:
    """`POST /catalogs/{list_key}/items` (ISSUE-019, AC-API-15/16)."""
    policy = CatalogPolicy(current_user, user_permissions)

    result = service.add_item(
        tenant_id=current_user.tenant_id,
        viewer=policy,
        list_key=list_key,
        labels=body.labels,
        reason=body.change_reason,
        actor_id=current_user.id,
    )
    return StandardResponse(data=result)


@router.patch(
    "/{list_key}/items/{code}",
    response_model=StandardResponse[CatalogAdminItemOut],
    summary="Relabel and/or hide a catalog item for this tenant",
    description=(
        "Updates this tenant's labels and/or visibility of one catalog "
        "item -- a system item's change is stored as this tenant's "
        "override, a tenant-owned item is updated in place. Every mutation "
        "is versioned. Requires can_manage for this list."
    ),
)
async def update_catalog_item(
    list_key: _ListKeyPath,
    code: _CodePath,
    body: CatalogItemUpdateIn,
    current_user: Annotated[User, Depends(get_current_user)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CatalogService, Depends(get_catalog_service)],
) -> StandardResponse[CatalogAdminItemOut]:
    """`PATCH /catalogs/{list_key}/items/{code}` (ISSUE-017, AC-API-11/12/13)."""
    policy = CatalogPolicy(current_user, user_permissions)

    result = service.update_item(
        tenant_id=current_user.tenant_id,
        viewer=policy,
        list_key=list_key,
        code=code,
        labels=body.labels,
        is_hidden=body.is_hidden,
        reason=body.change_reason,
        actor_id=current_user.id,
    )
    return StandardResponse(data=result)


@router.put(
    "/{list_key}/order",
    response_model=StandardResponse[CatalogOrderResultOut],
    summary="Reorder this tenant's effective items of a catalog list",
    description=(
        "Accepts the tenant's full ordered code list and assigns spaced "
        "sort_order values, versioning every changed item under one "
        "batch_id. Rejects any list that is not an exact permutation of "
        "the tenant's current effective items. Requires can_manage for "
        "this list."
    ),
)
async def reorder_catalog_items(
    list_key: _ListKeyPath,
    body: CatalogOrderIn,
    current_user: Annotated[User, Depends(get_current_user)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CatalogService, Depends(get_catalog_service)],
) -> StandardResponse[CatalogOrderResultOut]:
    """`PUT /catalogs/{list_key}/order` (ISSUE-018, AC-API-14)."""
    policy = CatalogPolicy(current_user, user_permissions)

    items, batch_id = service.reorder(
        tenant_id=current_user.tenant_id,
        viewer=policy,
        list_key=list_key,
        codes=body.codes,
        reason=body.change_reason,
        actor_id=current_user.id,
    )
    result = CatalogOrderResultOut(
        items=items, batch_id=str(batch_id) if batch_id is not None else None
    )
    return StandardResponse(data=result)


@router.post(
    "/{list_key}/items/{code}/reset",
    response_model=StandardResponse[CatalogAdminItemOut],
    summary="Reset a catalog item to the module default",
    description=(
        "Deletes this tenant's override of a system item, restoring the "
        "module's default labels, order and visibility. Versioned as a "
        "'reset' change. Requires can_manage for this list."
    ),
)
async def reset_catalog_item(
    list_key: _ListKeyPath,
    code: _CodePath,
    body: CatalogResetIn,
    current_user: Annotated[User, Depends(get_current_user)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CatalogService, Depends(get_catalog_service)],
) -> StandardResponse[CatalogAdminItemOut]:
    """`POST /catalogs/{list_key}/items/{code}/reset` (ISSUE-020, AC-API-17)."""
    policy = CatalogPolicy(current_user, user_permissions)

    result = service.reset_item(
        tenant_id=current_user.tenant_id,
        viewer=policy,
        list_key=list_key,
        code=code,
        reason=body.change_reason,
        actor_id=current_user.id,
    )
    return StandardResponse(data=result)


@router.patch(
    "/{list_key}/governance",
    response_model=StandardResponse[CatalogListOut],
    summary="Change a catalog's platform governance flags",
    description=(
        "Superuser-only. Flips tenant_can_manage / is_extensible for every "
        "tenant at once, with a mandatory reason and optimistic concurrency "
        "against updated_at. Never satisfied by a tenant owner's `*` "
        "wildcard -- only the is_superuser column grants this (RULE-008)."
    ),
)
async def update_catalog_governance(
    list_key: _ListKeyPath,
    body: CatalogGovernanceIn,
    request: Request,
    current_user: Annotated[User, Depends(require_superuser)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CatalogService, Depends(get_catalog_service)],
) -> StandardResponse[CatalogListOut]:
    """`PATCH /catalogs/{list_key}/governance` (ISSUE-021, AC-API-20..24, E-01)."""
    ip_address, user_agent = get_client_info(request)
    result, adjusted, version_number = service.update_governance(
        viewer_user=current_user,
        list_key=list_key,
        tenant_can_manage=body.tenant_can_manage,
        is_extensible=body.is_extensible,
        reason=body.change_reason,
        expected_updated_at=body.expected_updated_at,
        viewer_permissions=user_permissions,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return StandardResponse(
        data=result,
        meta={"adjusted": adjusted, "version_number": version_number},
    )


@router.get(
    "/{list_key}/items/{code}/versions",
    response_model=StandardListResponse[CatalogItemVersionOut],
    summary="Get one item's append-only version history",
    description=(
        "Returns the version history of one catalog item, newest first, "
        "paginated. A tenant only ever sees its own tenant-scoped rows plus "
        "system-level rows. changed_by is anonymized for an actor of "
        "another tenant. Requires can_view_admin for this list."
    ),
)
async def get_catalog_item_versions(
    list_key: _ListKeyPath,
    code: _CodePath,
    current_user: Annotated[User, Depends(get_current_user)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CatalogService, Depends(get_catalog_service)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> StandardListResponse[CatalogItemVersionOut]:
    """`GET /catalogs/{list_key}/items/{code}/versions` (ISSUE-022, AC-API-25)."""
    policy = CatalogPolicy(current_user, user_permissions)

    rows, total = service.item_history(
        tenant_id=current_user.tenant_id,
        viewer=policy,
        list_key=list_key,
        code=code,
        page=page,
        page_size=page_size,
    )

    total_pages = (total + page_size - 1) // page_size if total else 0
    return StandardListResponse(
        data=rows,
        meta=PaginationMeta(
            total=total, page=page, page_size=page_size, total_pages=total_pages
        ),
    )


@router.get(
    "/{list_key}/versions",
    response_model=StandardListResponse[CatalogListVersionOut],
    summary="Get one catalog list's append-only version history",
    description=(
        "Returns the version history of one catalog list, newest first, "
        "paginated. List versions are global (identical for every tenant); "
        "changed_by is anonymized for an actor of another tenant. Requires "
        "can_view_admin for this list."
    ),
)
async def get_catalog_list_versions(
    list_key: _ListKeyPath,
    current_user: Annotated[User, Depends(get_current_user)],
    user_permissions: Annotated[set[str], Depends(get_user_permissions)],
    service: Annotated[CatalogService, Depends(get_catalog_service)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> StandardListResponse[CatalogListVersionOut]:
    """`GET /catalogs/{list_key}/versions` (ISSUE-022, AC-API-26)."""
    policy = CatalogPolicy(current_user, user_permissions)

    rows, total = service.list_history(
        tenant_id=current_user.tenant_id,
        viewer=policy,
        list_key=list_key,
        page=page,
        page_size=page_size,
    )

    total_pages = (total + page_size - 1) // page_size if total else 0
    return StandardListResponse(
        data=rows,
        meta=PaginationMeta(
            total=total, page=page, page_size=page_size, total_pages=total_pages
        ),
    )
