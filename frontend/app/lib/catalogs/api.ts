/**
 * API functions for the catalogs frontend library.
 *
 * All HTTP goes through `apiClient` (never raw axios/fetch), per
 * CLAUDE.frontend.md Section 7. `apiClient`'s baseURL already includes
 * `/api/v1`, so paths here are relative to it (backend mounts the catalogs
 * router at `/catalogs` — see backend/app/api/v1/lazy_router.py).
 */

import apiClient from "~/lib/api/client";
import type { StandardResponse } from "~/lib/api/types/common.types";
import type { CatalogItemsResponse, CatalogResolveResponse } from "./types";

/**
 * axios's default `paramsSerializer` encodes array params as
 * `key[]=a&key[]=b` (bracket notation). FastAPI's `list[str] = Query(...)`
 * (see backend/app/core/catalogs/router.py) expects repeated bare keys:
 * `key=a&key=b`. This serializer produces the bare-key form so array query
 * params match the backend contract. Scoped to this file's two calls only —
 * never applied globally on `apiClient`.
 */
function serializeRepeatedParams(params: Record<string, unknown>): string {
  const pairs: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        pairs.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`
        );
      }
    } else {
      pairs.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      );
    }
  }

  return pairs.join("&");
}

export interface FetchCatalogItemsOptions {
  includeCodes?: string[];
  includeHidden?: boolean;
}

/**
 * `GET /catalogs/{list_key}/items` — effective, selectability-annotated
 * items of a catalog list for the current tenant (ISSUE-014, AC-API-01..06).
 */
export async function fetchCatalogItems(
  listKey: string,
  opts?: FetchCatalogItemsOptions
): Promise<CatalogItemsResponse> {
  const response = await apiClient.get<StandardResponse<CatalogItemsResponse>>(
    `/catalogs/${listKey}/items`,
    {
      params: {
        include_codes: opts?.includeCodes,
        include_hidden: opts?.includeHidden,
      },
      paramsSerializer: serializeRepeatedParams,
    }
  );
  return response.data.data;
}

/**
 * `GET /catalogs/resolve` — resolves 1..20 catalog lists in one call
 * (ISSUE-015, AC-API-07, C12).
 */
export async function fetchCatalogsResolve(
  keys: string[]
): Promise<CatalogResolveResponse> {
  const response = await apiClient.get<
    StandardResponse<CatalogResolveResponse>
  >("/catalogs/resolve", {
    params: { keys },
    paramsSerializer: serializeRepeatedParams,
  });
  return response.data.data;
}
