"""Pydantic schemas for the catalogs API."""

from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, model_validator

from app.core.input_guards import reject_control_chars_in_text

# SEC-230-02: a change reason is free text bound into a TEXT column. Line
# breaks stay legal; NUL and the other control characters are refused at the
# edge (422 VALIDATION_ERROR) instead of failing the version write with 500.
ChangeReason = Annotated[str, AfterValidator(reject_control_chars_in_text)]


class ViewerCapabilitiesOut(BaseModel):
    """Serialized form of ``policy.ViewerCapabilities`` (contract C10)."""

    model_config = ConfigDict(from_attributes=True)

    can_view_admin: bool
    can_govern: bool
    can_manage: bool
    can_add_items: bool


class CatalogItemOut(BaseModel):
    """Serialized form of ``service.ResolvedItem`` (contract C11, ISSUE-014)."""

    model_config = ConfigDict(from_attributes=True)

    code: str
    labels: dict[str, str]
    sort_order: int
    attributes: dict[str, Any]
    is_system: bool
    is_selectable: bool


class CatalogItemsResponse(BaseModel):
    """Serialized form of ``service.ResolvedList`` (contract C11, ISSUE-014)."""

    model_config = ConfigDict(from_attributes=True)

    list_key: str
    is_deprecated: bool
    items: list[CatalogItemOut]


class ResolvedListOut(BaseModel):
    """One resolved list inside a ``/resolve`` response (ISSUE-015, AC-API-07).

    Deliberately narrower than ``CatalogItemsResponse`` (no
    ``is_deprecated``) -- matches the AC's literal ``{list_key, items}``
    shape for this endpoint.
    """

    model_config = ConfigDict(from_attributes=True)

    list_key: str
    items: list[CatalogItemOut]


class CatalogResolveResponse(BaseModel):
    """Serialized response for ``GET /catalogs/resolve`` (ISSUE-015, AC-API-07)."""

    model_config = ConfigDict(from_attributes=True)

    lists: list[ResolvedListOut]
    not_found: list[str]


class CatalogListOut(BaseModel):
    """One catalog list row for the admin list/detail views (ISSUE-016, C13).

    Carries exactly the MODULE-SPEC Section 11 "Shared Schemas" fields.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    key: str
    owner_module: str
    labels: dict[str, str]
    description: dict[str, str] | None
    tenant_can_manage: bool
    is_extensible: bool
    is_locked: bool
    manage_permission: str | None
    is_deprecated: bool
    item_count: int
    modified_count: int
    updated_at: datetime
    viewer_capabilities: ViewerCapabilitiesOut


class CatalogAdminItemOut(CatalogItemOut):
    """A catalog item as shown in the admin item view (ISSUE-016, C13).

    Extends ``CatalogItemOut`` with the admin-only fields per MODULE-SPEC
    Section 11.
    """

    id: str
    default_labels: dict[str, str]
    default_sort_order: int
    is_hidden: bool
    is_modified: bool
    is_deprecated: bool
    created_at: datetime
    updated_at: datetime


class CatalogAdminItemsResponse(BaseModel):
    """Serialized response for ``GET /catalogs/{list_key}/admin-items`` (ISSUE-016, C13)."""

    model_config = ConfigDict(from_attributes=True)

    items: list[CatalogAdminItemOut]
    list: CatalogListOut


class CatalogItemUpdateIn(BaseModel):
    """Request body for ``PATCH /catalogs/{list_key}/items/{code}`` (ISSUE-017, C14).

    At least one of ``labels`` / ``is_hidden`` must be given (MS Section 11) --
    a body with both omitted is rejected as ``VALIDATION_ERROR`` by the
    model validator below.
    """

    model_config = ConfigDict(extra="forbid")

    labels: dict[str, str] | None = None
    is_hidden: bool | None = None
    change_reason: ChangeReason | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _require_at_least_one_field(self) -> "CatalogItemUpdateIn":
        if self.labels is None and self.is_hidden is None:
            raise ValueError("At least one of labels or is_hidden must be given.")
        return self


class CatalogItemCreateIn(BaseModel):
    """Request body for ``POST /catalogs/{list_key}/items`` (ISSUE-019, C16).

    ``extra="forbid"`` is what rejects a ``code`` field in the body with 422
    ``VALIDATION_ERROR`` (AC-API-16) -- the server always generates the code,
    it is never accepted from the client.
    """

    model_config = ConfigDict(extra="forbid")

    labels: dict[str, str]
    change_reason: ChangeReason | None = Field(default=None, max_length=500)


class CatalogOrderIn(BaseModel):
    """Request body for ``PUT /catalogs/{list_key}/order`` (ISSUE-018, C15).

    ``codes`` must be an exact permutation of the tenant's current effective
    item codes for this list (validated by the service, not here).
    """

    model_config = ConfigDict(extra="forbid")

    codes: list[str]
    change_reason: ChangeReason | None = Field(default=None, max_length=500)


class CatalogResetIn(BaseModel):
    """Request body for ``POST /catalogs/{list_key}/items/{code}/reset`` (ISSUE-020, C17).

    Only an optional ``change_reason`` is accepted -- the reset itself never
    takes any other input, but the body still uses ``extra="forbid"`` for
    consistency with the other three mutation endpoints.
    """

    model_config = ConfigDict(extra="forbid")

    change_reason: ChangeReason | None = Field(default=None, max_length=500)


class CatalogGovernanceIn(BaseModel):
    """Request body for ``PATCH /catalogs/{list_key}/governance`` (ISSUE-021, C18).

    Superuser-only. ``extra="forbid"`` rejects ``is_locked`` /
    ``manage_permission`` in the body with 422 ``VALIDATION_ERROR`` --
    RULE-007 makes these module-owned and never governance-writable.
    """

    model_config = ConfigDict(extra="forbid")

    tenant_can_manage: bool | None = None
    is_extensible: bool | None = None
    change_reason: ChangeReason = Field(min_length=10, max_length=500)
    expected_updated_at: datetime

    @model_validator(mode="after")
    def _at_least_one_flag(self) -> "CatalogGovernanceIn":
        if self.tenant_can_manage is None and self.is_extensible is None:
            raise ValueError(
                "at least one of tenant_can_manage or is_extensible is required"
            )
        return self


class ChangedByOut(BaseModel):
    """Who made a version-row change, anonymized across tenants (SEC-06).

    Resolution rule (MS Section 11 "Shared Schemas", verbatim): a version
    row's ``changed_by`` of ``None`` means the whole ``changed_by`` field on
    the response is ``None`` (a system/sync change, no acting user). When
    there is an acting user, this schema discloses their identity only if
    their tenant matches the viewer's tenant; otherwise ``id``/``full_name``
    are ``None`` and ``is_platform_actor`` is ``True`` -- never leaking the
    other tenant's user id or name.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID | None
    full_name: str | None
    is_platform_actor: bool


class CatalogItemVersionOut(BaseModel):
    """One row of an item's append-only history (ISSUE-022, AC-API-25).

    ``scope`` is derived from whether the row's own ``tenant_id`` is
    ``None`` ("system") or set ("tenant") -- it is not a stored column.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    version_number: int
    change_type: str
    before: dict[str, Any] | None
    after: dict[str, Any] | None
    batch_id: str | None
    scope: str
    changed_by: ChangedByOut | None
    change_reason: str | None
    created_at: datetime


class CatalogListVersionOut(BaseModel):
    """One row of a list's append-only history (ISSUE-022, AC-API-26).

    List versions are global (no per-tenant scope), so this schema has no
    ``scope``/``batch_id`` fields -- MS Section 9: "identical for all
    tenants".
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    version_number: int
    change_type: str
    before: dict[str, Any] | None
    after: dict[str, Any] | None
    changed_by: ChangedByOut | None
    change_reason: str | None
    created_at: datetime


class CatalogOrderResultOut(BaseModel):
    """Serialized response for ``PUT /catalogs/{list_key}/order`` (ISSUE-018, C15).

    Mirrors MODULE-SPEC Section 11's ``PUT /order`` response shape:
    ``{"items": [...], "batch_id": "uuid | null"}``.
    """

    model_config = ConfigDict(from_attributes=True)

    items: list[CatalogAdminItemOut]
    batch_id: str | None
