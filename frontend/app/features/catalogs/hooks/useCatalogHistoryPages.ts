/**
 * Page accumulation shared by `useCatalogListHistory` and
 * `useCatalogItemHistory` (ISSUE-038, AC-UI-25 "pagination loads older
 * entries").
 *
 * No feature of this codebase uses `useInfiniteQuery`, so the history uses a
 * "Cargar más" button over plain per-page queries: pages 1..N are each their
 * own `useQueries` entry, keyed by the caller's `queryKeyForPage(page)`, and
 * `loadMore()` adds page N+1. The entries are the loaded pages in order
 * (newest first, as the server returns them), de-duplicated by `id` in case
 * a new version shifted a row onto the next page between two fetches.
 *
 * Callers key every page under `catalogListQueryKey(listKey)`, so the item
 * and governance mutations' per-list invalidation refetches every loaded
 * page of an open history sheet.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useCallback, useMemo, useState } from "react";
import { useQueries, type QueryKey } from "@tanstack/react-query";
import type { StandardListResponse } from "~/lib/api/types/common.types";
import type { FetchCatalogVersionsParams } from "../types/catalogsAdmin.types";

/** AC-API-25/26: the version endpoints' default page size. */
export const CATALOG_HISTORY_PAGE_SIZE = 20;

export interface CatalogHistoryPages<T> {
  /** Every loaded entry, newest first. */
  entries: T[];
  /** The first page has not loaded yet. */
  isLoading: boolean;
  /** The first page failed. */
  isError: boolean;
  /** A page after the first is loading. */
  isFetchingMore: boolean;
  /** A page after the first failed (the loaded entries stay on screen). */
  isLoadMoreError: boolean;
  /** The server reports older pages that are not loaded yet. */
  hasMore: boolean;
  /** Loads the next older page; a no-op while one is loading or none is left. */
  loadMore: () => void;
  /** Refetches every failed page. */
  retry: () => void;
}

interface UseCatalogHistoryPagesOptions<T> {
  queryKeyForPage: (page: number) => QueryKey;
  fetchPage: (
    params: FetchCatalogVersionsParams
  ) => Promise<StandardListResponse<T>>;
  enabled: boolean;
}

export function useCatalogHistoryPages<T extends { id: string }>({
  queryKeyForPage,
  fetchPage,
  enabled,
}: UseCatalogHistoryPagesOptions<T>): CatalogHistoryPages<T> {
  const [pageCount, setPageCount] = useState(1);

  const results = useQueries({
    queries: Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1;
      return {
        queryKey: queryKeyForPage(page),
        queryFn: () =>
          fetchPage({ page, page_size: CATALOG_HISTORY_PAGE_SIZE }),
        enabled,
      };
    }),
  });

  const first = results[0];
  const last = results[results.length - 1];
  const laterPages = results.slice(1);

  const entries = useMemo(() => {
    const seen = new Set<string>();
    const merged: T[] = [];
    for (const result of results) {
      for (const entry of result.data?.data ?? []) {
        if (seen.has(entry.id)) continue;
        seen.add(entry.id);
        merged.push(entry);
      }
    }
    return merged;
  }, [results]);

  const totalPages = last?.data?.meta.total_pages ?? 0;
  const isFetchingMore = laterPages.some((result) => result.isPending);
  const isLoadMoreError = laterPages.some((result) => result.isError);
  const hasMore = Boolean(last?.isSuccess) && pageCount < totalPages;

  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingMore) return;
    setPageCount((count) => count + 1);
  }, [hasMore, isFetchingMore]);

  const retry = useCallback(() => {
    for (const result of results) {
      if (result.isError) void result.refetch();
    }
  }, [results]);

  return {
    entries,
    isLoading: Boolean(first?.isPending) && enabled,
    isError: Boolean(first?.isError),
    isFetchingMore,
    isLoadMoreError,
    hasMore,
    loadMore,
    retry,
  };
}
