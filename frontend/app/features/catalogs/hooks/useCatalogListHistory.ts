/**
 * TanStack Query hook for one catalog list's history (ISSUE-038, AC-UI-25,
 * AC-API-26, contract C19): `GET /catalogs/{listKey}/versions`, 20 per page,
 * newest first, with "Cargar más" accumulation (`useCatalogHistoryPages`).
 *
 * Query key per page: `["catalogs-admin", listKey, "versions", { page }]` --
 * under `catalogListQueryKey(listKey)`, so the governance mutation
 * (ISSUE-033) and the item mutations (ISSUE-035..037) refresh it.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useCallback } from "react";
import { fetchCatalogListVersions } from "../api/catalogsAdmin";
import type {
  CatalogListVersion,
  FetchCatalogVersionsParams,
} from "../types/catalogsAdmin.types";
import {
  useCatalogHistoryPages,
  type CatalogHistoryPages,
} from "./useCatalogHistoryPages";
import { catalogListQueryKey } from "./useUpdateGovernance";

/** TanStack Query key of one page of a list's history. */
export function catalogListHistoryQueryKey(listKey: string, page: number) {
  return [...catalogListQueryKey(listKey), "versions", { page }] as const;
}

/** Disabled while `listKey` is empty. */
export function useCatalogListHistory(
  listKey: string
): CatalogHistoryPages<CatalogListVersion> {
  const queryKeyForPage = useCallback(
    (page: number) => catalogListHistoryQueryKey(listKey, page),
    [listKey]
  );
  const fetchPage = useCallback(
    (params: FetchCatalogVersionsParams) =>
      fetchCatalogListVersions(listKey, params),
    [listKey]
  );

  return useCatalogHistoryPages({
    queryKeyForPage,
    fetchPage,
    enabled: listKey.length > 0,
  });
}
