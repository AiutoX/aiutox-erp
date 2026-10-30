/**
 * TanStack Query hook for one catalog list's admin items (ISSUE-034,
 * AC-API-10, contract C13).
 *
 * Query key: `["catalogs-admin", listKey, { includeDeprecated, q }]`. It
 * starts with `catalogListQueryKey(listKey)` (ISSUE-033), so the governance
 * mutation's per-list invalidation also refreshes the items table. Later
 * item mutations (ISSUE-035..037) should invalidate
 * `catalogListQueryKey(listKey)` to refresh every variant of this query.
 *
 * AiutoX ERP Core -- Frankpach
 */

import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { StandardResponse } from "~/lib/api/types/common.types";
import { fetchCatalogAdminItems } from "../api/catalogsAdmin";
import type {
  CatalogAdminItemsResponse,
  FetchCatalogAdminItemsParams,
} from "../types/catalogsAdmin.types";

/** PERF-06: catalog data changes rarely -- 5 minutes stale time. */
const CATALOG_ADMIN_ITEMS_STALE_TIME_MS = 1000 * 60 * 5;

/** TanStack Query key of one list's admin items for one parameter set. */
export function catalogAdminItemsQueryKey(
  listKey: string,
  params: FetchCatalogAdminItemsParams = {}
) {
  return [
    "catalogs-admin",
    listKey,
    {
      includeDeprecated: params.includeDeprecated ?? false,
      q: params.q ?? "",
    },
  ] as const;
}

/**
 * Fetches `GET /catalogs/{listKey}/admin-items`. Disabled while `listKey`
 * is empty. The previous result stays on screen while a new parameter set
 * (e.g. toggling "Mostrar inactivos") loads.
 */
export function useCatalogAdminItems(
  listKey: string | null | undefined,
  params: FetchCatalogAdminItemsParams = {}
): UseQueryResult<StandardResponse<CatalogAdminItemsResponse>> {
  const key = listKey ?? "";
  const includeDeprecated = params.includeDeprecated ?? false;
  const q = params.q ?? "";

  return useQuery({
    queryKey: catalogAdminItemsQueryKey(key, { includeDeprecated, q }),
    queryFn: () => fetchCatalogAdminItems(key, { includeDeprecated, q }),
    enabled: key.length > 0,
    staleTime: CATALOG_ADMIN_ITEMS_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}
