/**
 * Hook for synchronizing saved_filter_id with URL query parameters.
 * Enables sharing filtered views via URL and bookmarking.
 */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";

const SAVED_FILTER_ID_PARAM = "saved_filter_id";

/**
 * Hook for URL synchronization with saved filter ID
 * @returns Object with current filter ID and methods to update it
 */
export function useFilterUrlSync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterId, setFilterId] = useState<string | null>(() => {
    return searchParams.get(SAVED_FILTER_ID_PARAM);
  });

  /**
   * Update filter ID in URL
   */
  const updateFilterId = useCallback(
    (newFilterId: string | null) => {
      setFilterId(newFilterId);

      const newSearchParams = new URLSearchParams(searchParams);

      if (newFilterId) {
        newSearchParams.set(SAVED_FILTER_ID_PARAM, newFilterId);
      } else {
        newSearchParams.delete(SAVED_FILTER_ID_PARAM);
      }

      setSearchParams(newSearchParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  /**
   * Clear filter ID from URL
   */
  const clearFilterId = useCallback(() => {
    updateFilterId(null);
  }, [updateFilterId]);

  /**
   * Get filter ID from URL (on mount or when URL changes)
   */
  useEffect(() => {
    const urlFilterId = searchParams.get(SAVED_FILTER_ID_PARAM);
    if (urlFilterId !== filterId) {
      setFilterId(urlFilterId);
    }
  }, [searchParams, filterId]);

  return {
    filterId,
    updateFilterId,
    clearFilterId,
  };
}
