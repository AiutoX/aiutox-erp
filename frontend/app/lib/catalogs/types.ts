/**
 * Types for the catalogs frontend library.
 *
 * Mirrors backend/app/core/catalogs/schemas.py verbatim (contract C24,
 * ISSUE-014/015). Do not add fields here that the backend does not return.
 */

/** One effective catalog item, annotated with tenant selectability (contract C11). */
export interface CatalogItem {
  code: string;
  labels: Record<string, string>;
  sort_order: number;
  attributes: Record<string, unknown>;
  is_system: boolean;
  is_selectable: boolean;
}

/** Response body of `GET /catalogs/{list_key}/items` (contract C11, ISSUE-014). */
export interface CatalogItemsResponse {
  list_key: string;
  is_deprecated: boolean;
  items: CatalogItem[];
}

/** One resolved list inside a `/resolve` response — no `is_deprecated` (ISSUE-015). */
export interface ResolvedList {
  list_key: string;
  items: CatalogItem[];
}

/** Response body of `GET /catalogs/resolve` (contract C12, ISSUE-015, AC-API-07). */
export interface CatalogResolveResponse {
  lists: ResolvedList[];
  not_found: string[];
}

/**
 * Accessibility attributes every shared select forwards to its focusable
 * trigger (in every branch), so a `<label htmlFor>` resolves to the control
 * and a field error is announced with it.
 */
export interface SelectFieldA11yProps {
  /** DOM id of the trigger; match the field's `<label htmlFor>`. */
  id?: string;
  "aria-invalid"?: boolean | "true" | "false";
  /** Id(s) of the element(s) describing the field, e.g. its error message. */
  "aria-describedby"?: string;
}
