/**
 * TanStack Query hook for one catalog item's history (ISSUE-038, AC-UI-25,
 * AC-API-25, contract C19): `GET /catalogs/{listKey}/items/{code}/versions`,
 * 20 per page, newest first, with "Cargar más" accumulation
 * (`useCatalogHistoryPages`). The item history includes every tenant action
 * on the item (H-01).
 *
 * Query key per page:
 * `["catalogs-admin", listKey, "items", code, "versions", { page }]` --
 * under `catalogListQueryKey(listKey)`, so the item mutations
 * (ISSUE-035..037) refresh it.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useCallback } from "react";
import { fetchCatalogItemVersions } from "../api/catalogsAdmin";
import type {
  CatalogItemVersion,
  FetchCatalogVersionsParams,
} from "../types/catalogsAdmin.types";
import {
  useCatalogHistoryPages,
  type CatalogHistoryPages,
} from "./useCatalogHistoryPages";
import { catalogListQueryKey } from "./useUpdateGovernance";

/** TanStack Query key of one page of an item's history. */
export function catalogItemHistoryQueryKey(
  listKey: string,
  code: string,
  page: number
) {
  return [
    ...catalogListQueryKey(listKey),
    "items",
    code,
    "versions",
    { page },
  ] as const;
}

/** Disabled while `listKey` or `code` is empty. */
export function useCatalogItemHistory(
  listKey: string,
  code: string
): CatalogHistoryPages<CatalogItemVersion> {
  const queryKeyForPage = useCallback(
    (page: number) => catalogItemHistoryQueryKey(listKey, code, page),
    [listKey, code]
  );
  const fetchPage = useCallback(
    (params: FetchCatalogVersionsParams) =>
      fetchCatalogItemVersions(listKey, code, params),
    [listKey, code]
  );

  return useCatalogHistoryPages({
    queryKeyForPage,
    fetchPage,
    enabled: listKey.length > 0 && code.length > 0,
  });
}
