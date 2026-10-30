/**
 * The `?list=` query-string contract of the catalogs admin screen
 * (ISSUE-031, AC-UI-02, contract C27).
 *
 * `/config/catalogs?list=<catalog key>` identifies the selected catalog.
 * - `selectList(key)` pushes a history entry so browser back/forward walks
 *   through previous selections; pass `{ replace: true }` for automatic
 *   selections (desktop auto-select) that must not add an entry.
 * - `clearSelection()` removes the param (narrow-screen "back to list").
 * Other query params are preserved, so later issues may add their own.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useCallback } from "react";
import { useSearchParams } from "react-router";

export const CATALOG_LIST_SEARCH_PARAM = "list";

export interface SelectCatalogListOptions {
  replace?: boolean;
}

export interface SelectedCatalogList {
  selectedKey: string | null;
  selectList: (key: string, options?: SelectCatalogListOptions) => void;
  clearSelection: () => void;
}

export function useSelectedCatalogList(): SelectedCatalogList {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedKey = searchParams.get(CATALOG_LIST_SEARCH_PARAM) || null;

  const selectList = useCallback(
    (key: string, options?: SelectCatalogListOptions) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(CATALOG_LIST_SEARCH_PARAM, key);
          return next;
        },
        { replace: options?.replace ?? false }
      );
    },
    [setSearchParams]
  );

  const clearSelection = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(CATALOG_LIST_SEARCH_PARAM);
      return next;
    });
  }, [setSearchParams]);

  return { selectedKey, selectList, clearSelection };
}
