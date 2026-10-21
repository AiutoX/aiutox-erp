/**
 * TanStack Query hook for the admin catalog lists (ISSUE-031, contract C27).
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { StandardListResponse } from "~/lib/api/types/common.types";
import {
  CATALOG_LISTS_QUERY_KEY,
  fetchCatalogLists,
} from "../api/catalogsAdmin";
import type { CatalogListAdmin } from "../types/catalogsAdmin.types";

/** PERF-06: catalog metadata changes rarely -- 5 minutes stale time. */
const CATALOG_LISTS_STALE_TIME_MS = 1000 * 60 * 5;

export function useCatalogLists(): UseQueryResult<
  StandardListResponse<CatalogListAdmin>
> {
  return useQuery({
    queryKey: CATALOG_LISTS_QUERY_KEY,
    queryFn: () => fetchCatalogLists(),
    staleTime: CATALOG_LISTS_STALE_TIME_MS,
  });
}
