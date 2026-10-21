/**
 * Types for the catalogs admin screen (ISSUE-031, contract C27).
 *
 * Mirrors backend/app/core/catalogs/schemas.py `CatalogListOut` and
 * `ViewerCapabilitiesOut` field-for-field -- the payload of each row of
 * `GET /catalogs` (ISSUE-016). Do not add fields the backend does not return.
 *
 * AiutoX ERP Core -- Frankpach
 */

/** Per-row capabilities of the current viewer on one catalog list. */
export interface CatalogViewerCapabilities {
  can_view_admin: boolean;
  can_govern: boolean;
  can_manage: boolean;
  can_add_items: boolean;
}

/** One catalog list as returned by `GET /catalogs` (`CatalogListOut`). */
export interface CatalogListAdmin {
  id: string;
  key: string;
  owner_module: string;
  labels: Record<string, string>;
  description: Record<string, string> | null;
  tenant_can_manage: boolean;
  is_extensible: boolean;
  is_locked: boolean;
  manage_permission: string | null;
  is_deprecated: boolean;
  item_count: number;
  modified_count: number;
  /** ISO 8601 datetime string. */
  updated_at: string;
  viewer_capabilities: CatalogViewerCapabilities;
}

/** Query parameters accepted by `GET /catalogs` (backend router defaults apply when omitted). */
export interface FetchCatalogListsParams {
  owner_module?: string;
  q?: string;
  include_deprecated?: boolean;
  sort_by?: "owner_module" | "key";
  sort_dir?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

/**
 * One item of a catalog list as returned by
 * `GET /catalogs/{list_key}/admin-items` (`CatalogAdminItemOut`, ISSUE-016,
 * contract C13). `labels` / `sort_order` are the tenant's effective values;
 * `default_labels` / `default_sort_order` are the declared ones.
 * (ISSUE-034, appended additively.)
 */
export interface CatalogAdminItem {
  id: string;
  code: string;
  labels: Record<string, string>;
  sort_order: number;
  attributes: Record<string, unknown>;
  is_system: boolean;
  is_selectable: boolean;
  default_labels: Record<string, string>;
  default_sort_order: number;
  is_hidden: boolean;
  is_modified: boolean;
  is_deprecated: boolean;
  /** ISO 8601 datetime string. */
  created_at: string;
  /** ISO 8601 datetime string. */
  updated_at: string;
}

/** Payload of `GET /catalogs/{list_key}/admin-items` (`CatalogAdminItemsResponse`). */
export interface CatalogAdminItemsResponse {
  items: CatalogAdminItem[];
  list: CatalogListAdmin;
}

/**
 * Body of `PATCH /catalogs/{list_key}/items/{code}` -- mirrors backend
 * `CatalogItemUpdateIn` (`extra="forbid"`, at least one of `labels` /
 * `is_hidden`). Omitted fields are not sent (ISSUE-035, C14).
 */
export interface CatalogItemUpdateBody {
  labels?: { es: string; en: string };
  is_hidden?: boolean;
  /** At most 500 characters, recorded in the item's history. */
  change_reason?: string;
}

/**
 * Body of `POST /catalogs/{list_key}/items` -- mirrors backend
 * `CatalogItemCreateIn` (`extra="forbid"`, ISSUE-037, C16). There is no
 * `code`: the server always generates it (RULE-012, AC-API-16).
 */
export interface CatalogItemCreateBody {
  labels: { es: string; en: string };
  /** At most 500 characters, recorded in the item's history. */
  change_reason?: string;
}

/** Body of `POST /catalogs/{list_key}/items/{code}/reset` -- backend `CatalogResetIn` (ISSUE-035, C17). */
export interface CatalogItemResetBody {
  /** At most 500 characters, recorded in the item's history. */
  change_reason?: string;
}

/**
 * Body of `PUT /catalogs/{list_key}/order` -- backend `CatalogOrderIn`
 * (`extra="forbid"`, ISSUE-036, C15). `codes` must be an exact permutation of
 * every non-deprecated effective code of the list, hidden items included.
 */
export interface CatalogOrderBody {
  codes: string[];
  /** At most 500 characters, recorded in the items' history. */
  change_reason?: string;
}

/** Payload of `PUT /catalogs/{list_key}/order`; `batch_id` is null when the order did not change. */
export interface CatalogOrderResponse {
  items: CatalogAdminItem[];
  batch_id: string | null;
}

/** Client-side parameters of `fetchCatalogAdminItems` / `useCatalogAdminItems`. */
export interface FetchCatalogAdminItemsParams {
  /** Maps to `include_deprecated` (backend default `false`). */
  includeDeprecated?: boolean;
  /** Maps to `q` (backend max length 100); omitted from the request when empty. */
  q?: string;
}

/**
 * Who made a version-row change -- backend `ChangedByOut` (ISSUE-022, C19,
 * SEC-06). A user of another tenant (a platform actor) comes back with `id`
 * and `full_name` set to null and `is_platform_actor` true. ISSUE-038.
 */
export interface CatalogVersionChangedBy {
  id: string | null;
  full_name: string | null;
  is_platform_actor: boolean;
}

/**
 * One row of an item's history -- backend `CatalogItemVersionOut`
 * (`GET /catalogs/{list_key}/items/{code}/versions`, AC-API-25). `changed_by`
 * is null for a sync-authored version. `change_type` is kept a plain string:
 * the UI falls back to the raw value for a type it does not know. ISSUE-038.
 */
export interface CatalogItemVersion {
  id: string;
  version_number: number;
  change_type: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  batch_id: string | null;
  /** "system" (sync-authored) or "tenant" (the viewer's organization). */
  scope: string;
  changed_by: CatalogVersionChangedBy | null;
  change_reason: string | null;
  /** ISO 8601 datetime string. */
  created_at: string;
}

/**
 * One row of a list's history -- backend `CatalogListVersionOut`
 * (`GET /catalogs/{list_key}/versions`, AC-API-26). Same as an item version
 * minus `scope` / `batch_id`: list versions are global. ISSUE-038.
 */
export interface CatalogListVersion {
  id: string;
  version_number: number;
  change_type: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changed_by: CatalogVersionChangedBy | null;
  change_reason: string | null;
  /** ISO 8601 datetime string. */
  created_at: string;
}

/** Pagination of both version endpoints (backend: `page` >= 1, `page_size` 1..100, default 20). */
export interface FetchCatalogVersionsParams {
  page: number;
  page_size: number;
}
