/**
 * TanStack Query hooks for the catalogs frontend library (contract C24,
 * ISSUE-027). Query keys are arrays per CLAUDE.frontend.md Section 7.
 */

import { useState } from "react";
import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { fetchCatalogItems, fetchCatalogsResolve } from "./api";
import type { CatalogItem } from "./types";

const CATALOG_STALE_TIME_MS = 1000 * 60 * 5; // 5 minutes (PERF-06)

export interface UseCatalogOptions {
  /**
   * Codes to grandfather into the response (MODULE-SPEC s6 / AC-LIB-03): the
   * record's STORED value(s) that may no longer be selectable. Never the live
   * selection of a control -- that would make every pick a new request.
   */
  includeCodes?: string[];
  enabled?: boolean;
}

/**
 * Fetches the effective items of one catalog list for the current tenant.
 * Query key: `["catalogs", listKey]`, or
 * `["catalogs", listKey, "include", sortedIncludeCodes]` when grandfathering
 * codes (the plain call is the one the backend serves from Redis).
 */
export function useCatalog(
  listKey: string,
  opts?: UseCatalogOptions
): UseQueryResult<CatalogItem[]> {
  const includeCodes = opts?.includeCodes ?? [];
  const sortedIncludeCodes = [...includeCodes].sort();

  return useQuery({
    queryKey:
      sortedIncludeCodes.length > 0
        ? ["catalogs", listKey, "include", sortedIncludeCodes]
        : ["catalogs", listKey],
    queryFn: async () => {
      const result = await fetchCatalogItems(listKey, {
        includeCodes:
          sortedIncludeCodes.length > 0 ? sortedIncludeCodes : undefined,
      });
      return result.items;
    },
    staleTime: CATALOG_STALE_TIME_MS,
    // Keep the previous data only across refetches of the SAME list; another
    // list's options must never be offered while this one loads.
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === listKey
        ? keepPreviousData(previousData)
        : undefined,
    enabled: opts?.enabled ?? true,
  });
}

export interface CatalogForSelection {
  data: CatalogItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * The items a select control renders: the plain (Redis-served) list, plus --
 * only when a code the record already STORES is missing from it -- one extra
 * `include_codes` request for exactly those codes (grandfathering, AC-LIB-03).
 *
 * The stored codes are latched from the first non-empty value the control
 * sees, so later picks never change a query key, trigger a request or swap
 * the control for a spinner. The latch is tied to `listKey`: when the list
 * changes it restarts from the value given with the new list.
 */
export function useCatalogForSelection(
  listKey: string,
  currentCodes: string[]
): CatalogForSelection {
  const [latch, setLatch] = useState({
    listKey,
    codes: [...currentCodes].sort(),
  });
  let stored = latch.codes;
  if (latch.listKey !== listKey) {
    // Another list: codes stored for the previous one mean nothing here.
    stored = [...currentCodes].sort();
    setLatch({ listKey, codes: stored });
  } else if (stored.length === 0 && currentCodes.length > 0) {
    stored = [...currentCodes].sort();
    setLatch({ listKey, codes: stored });
  }

  const base = useCatalog(listKey);
  const missing = base.data
    ? stored.filter(
        (code) =>
          !base.data.some((item) => item.code === code && item.is_selectable)
      )
    : [];
  const grandfathered = useCatalog(listKey, {
    includeCodes: missing,
    enabled: missing.length > 0,
  });

  if (missing.length === 0) {
    return {
      data: base.data,
      isLoading: base.isLoading,
      isError: base.isError,
      refetch: () => void base.refetch(),
    };
  }
  return {
    data: grandfathered.data,
    isLoading: grandfathered.isLoading,
    isError: grandfathered.isError,
    refetch: () => void grandfathered.refetch(),
  };
}

/**
 * Resolves several catalog lists in a single call. Returns a map keyed by
 * `list_key`. Query key: `["catalogs", "resolve", keys]`.
 */
export function useCatalogs(
  keys: string[]
): UseQueryResult<Record<string, CatalogItem[]>> {
  return useQuery({
    queryKey: ["catalogs", "resolve", keys],
    queryFn: async () => {
      const result = await fetchCatalogsResolve(keys);
      const map: Record<string, CatalogItem[]> = {};
      for (const list of result.lists) {
        map[list.list_key] = list.items;
      }
      return map;
    },
    staleTime: CATALOG_STALE_TIME_MS,
    enabled: keys.length > 0,
  });
}

/**
 * Returns a `code -> label` resolver for DISPLAYING stored values (a table
 * column, a detail dialog). The plain list only carries selectable items, so
 * the codes that are not in it (hidden or deprecated by the tenant) are
 * requested once through `include_codes` -- an existing record always shows
 * its label (RULE-011). A code no catalog knows resolves to itself.
 */
export function useCatalogLabelResolver(
  listKey: string,
  codes: string[]
): (code: string) => string {
  const { language } = useTranslation();
  const base = useCatalog(listKey);
  const missing = base.data
    ? [...new Set(codes)]
        .filter((code) => code && !base.data.some((item) => item.code === code))
        .sort()
    : [];
  const withStored = useCatalog(listKey, {
    includeCodes: missing,
    enabled: missing.length > 0,
  });
  const items = missing.length > 0 ? (withStored.data ?? base.data) : base.data;

  return (code: string) => {
    const item = items?.find((candidate) => candidate.code === code);
    return item ? resolveLabel(item.labels, language, code) : code;
  };
}

/**
 * Resolves the effective label for one stored code, including a code the
 * tenant hid (requested through `include_codes`, RULE-011), or returns the
 * code itself if no catalog knows it. Built on `useCatalogLabelResolver`.
 */
export function useCatalogLabel(
  listKey: string,
  code: string | null | undefined
): string {
  const labelFor = useCatalogLabelResolver(listKey, code ? [code] : []);

  return code ? labelFor(code) : "";
}

/**
 * Resolves the effective label for a code given its `labels` map and the
 * current UI language, per MODULE-SPEC Section 6 "Form User" formula:
 * `labels[lang] ?? labels.es ?? code`.
 */
export function resolveLabel(
  labels: Record<string, string>,
  lang: string,
  code: string
): string {
  return labels[lang] ?? labels.es ?? code;
}
