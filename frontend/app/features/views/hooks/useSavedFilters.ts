/**
 * React hook for managing SavedFilters.
 * Provides CRUD operations and state management for saved filters.
 */

import { useCallback, useEffect, useState } from "react";
import {
  createSavedFilter,
  deleteSavedFilter,
  getSavedFilter,
  getSavedFilters,
  updateSavedFilter,
} from "../api/savedFilters.api";
import type {
  SavedFilter,
  SavedFilterCreate,
  SavedFilterUpdate,
  SavedFiltersListParams,
} from "../types/savedFilter.types";

interface UseSavedFiltersState {
  filters: SavedFilter[];
  defaultFilter: SavedFilter | null;
  loading: boolean;
  error: Error | null;
}

interface UseSavedFiltersReturn extends UseSavedFiltersState {
  // List operations
  listFilters: (params?: SavedFiltersListParams) => Promise<void>;
  refreshFilters: () => Promise<void>;

  // CRUD operations
  getFilter: (filterId: string) => Promise<SavedFilter | null>;
  createFilter: (filterData: SavedFilterCreate) => Promise<SavedFilter | null>;
  updateFilter: (
    filterId: string,
    filterData: SavedFilterUpdate
  ) => Promise<SavedFilter | null>;
  removeFilter: (filterId: string) => Promise<boolean>;

  // Utility
  getDefaultFilter: (module: string) => SavedFilter | null;
  getMyFilters: (module: string) => SavedFilter[];
  getSharedFilters: (module: string) => SavedFilter[];
}

/**
 * Hook for managing saved filters
 * @param module - Optional module name to filter by
 * @param autoLoad - Whether to automatically load filters on mount (default: true)
 */
export function useSavedFilters(
  module?: string,
  autoLoad: boolean = true
): UseSavedFiltersReturn {
  const [state, setState] = useState<UseSavedFiltersState>({
    filters: [],
    defaultFilter: null,
    loading: false,
    error: null,
  });

  /**
   * List saved filters
   */
  const listFilters = useCallback(
    async (params?: SavedFiltersListParams) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const paramsWithModule = {
          ...params,
          module: params?.module || module,
        };

        const response = await getSavedFilters(paramsWithModule);
        const filters = response.data;

        // Find default filter
        const defaultFilter =
          filters.find((f) => f.is_default && f.module === module) || null;

        setState({
          filters,
          defaultFilter,
          loading: false,
          error: null,
        });
      } catch (error) {
        // Determine if this is a real error that should be shown to the user
        // Network errors, CORS errors, and server errors (5xx) are real errors
        // Empty responses (no filters) are not errors
        let errorToSet: Error | null = null;

        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          const errObj = error as unknown as Record<string, unknown>;
          const isAxiosError = Boolean(errObj.isAxiosError);
          const responseObj =
            errObj.response && typeof errObj.response === "object"
              ? (errObj.response as Record<string, unknown>)
              : null;
          const status = responseObj?.status as number | undefined;

          // Check for network errors (no response from server)
          if (
            errorMessage.includes("network") ||
            errorMessage.includes("network error")
          ) {
            errorToSet = error;
          }
          // Check for CORS errors
          else if (
            errorMessage.includes("cors") ||
            errorMessage.includes("blocked by cors")
          ) {
            errorToSet = error;
          }
          // Check for server errors (5xx)
          else if (isAxiosError && status && status >= 500) {
            errorToSet = error;
          }
          // Check for client errors (4xx) - these are also real errors
          else if (isAxiosError && status && status >= 400 && status < 500) {
            errorToSet = error;
          }
          // Other errors (timeout, etc.)
          else if (
            errorMessage.includes("timeout") ||
            errorMessage.includes("failed")
          ) {
            errorToSet = error;
          }
          // If it's an AxiosError but we don't know the status, it's likely a real error
          else if (isAxiosError) {
            errorToSet = error;
          }
          // For other errors, check if they seem like real errors
          else if (
            !errorMessage.includes("empty") &&
            errorMessage.includes("error")
          ) {
            errorToSet = error;
          }
        } else {
          // Non-Error objects are treated as real errors
          errorToSet = error as Error;
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          // Only set error if it's a real error (network, server error, etc.)
          // Empty response (no filters) is not an error
          error: errorToSet,
        }));
      }
    },
    [module]
  );

  /**
   * Refresh filters list
   */
  const refreshFilters = useCallback(async () => {
    await listFilters({ module });
  }, [listFilters, module]);

  /**
   * Get a single filter by ID
   */
  const getFilter = useCallback(
    async (filterId: string): Promise<SavedFilter | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await getSavedFilter(filterId);
        return response.data;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error ? error : new Error("Failed to get filter"),
        }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    []
  );

  /**
   * Create a new filter
   */
  const createFilter = useCallback(
    async (filterData: SavedFilterCreate): Promise<SavedFilter | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await createSavedFilter(filterData);
        const newFilter = response.data;

        // Update local state
        setState((prev) => {
          const updatedFilters = [...prev.filters, newFilter];
          const defaultFilter =
            newFilter.is_default && newFilter.module === module
              ? newFilter
              : prev.defaultFilter;

          return {
            filters: updatedFilters,
            defaultFilter,
            loading: false,
            error: null,
          };
        });

        return newFilter;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error
              : new Error("Failed to create filter"),
        }));
        return null;
      }
    },
    [module]
  );

  /**
   * Update an existing filter
   */
  const updateFilter = useCallback(
    async (
      filterId: string,
      filterData: SavedFilterUpdate
    ): Promise<SavedFilter | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await updateSavedFilter(filterId, filterData);
        const updatedFilter = response.data;

        // Update local state
        setState((prev) => {
          const updatedFilters = prev.filters.map((f) =>
            f.id === filterId ? updatedFilter : f
          );
          const defaultFilter =
            updatedFilter.is_default && updatedFilter.module === module
              ? updatedFilter
              : prev.defaultFilter?.id === filterId
                ? null
                : prev.defaultFilter;

          return {
            filters: updatedFilters,
            defaultFilter,
            loading: false,
            error: null,
          };
        });

        return updatedFilter;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error
              : new Error("Failed to update filter"),
        }));
        return null;
      }
    },
    [module]
  );

  /**
   * Delete a filter
   */
  const removeFilter = useCallback(
    async (filterId: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        await deleteSavedFilter(filterId);

        // Update local state
        setState((prev) => {
          const updatedFilters = prev.filters.filter((f) => f.id !== filterId);
          const defaultFilter =
            prev.defaultFilter?.id === filterId ? null : prev.defaultFilter;

          return {
            filters: updatedFilters,
            defaultFilter,
            loading: false,
            error: null,
          };
        });

        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error
              : new Error("Failed to delete filter"),
        }));
        return false;
      }
    },
    []
  );

  /**
   * Get default filter for a module
   */
  const getDefaultFilter = useCallback(
    (moduleName: string): SavedFilter | null => {
      if (state.defaultFilter && state.defaultFilter.module === moduleName) {
        return state.defaultFilter;
      }
      return (
        state.filters.find((f) => f.is_default && f.module === moduleName) ||
        null
      );
    },
    [state.defaultFilter, state.filters]
  );

  /**
   * Get user's own filters for a module
   */
  const getMyFilters = useCallback(
    (moduleName: string): SavedFilter[] => {
      return state.filters.filter(
        (f) => f.module === moduleName && !f.is_shared && !f.is_default
      );
    },
    [state.filters]
  );

  /**
   * Get shared filters for a module
   */
  const getSharedFilters = useCallback(
    (moduleName: string): SavedFilter[] => {
      return state.filters.filter(
        (f) => f.module === moduleName && f.is_shared
      );
    },
    [state.filters]
  );

  // Auto-load filters on mount if enabled
  useEffect(() => {
    if (autoLoad && module) {
      listFilters({ module });
    }
  }, [autoLoad, module, listFilters]);

  return {
    ...state,
    listFilters,
    refreshFilters,
    getFilter,
    createFilter,
    updateFilter,
    removeFilter,
    getDefaultFilter,
    getMyFilters,
    getSharedFilters,
  };
}
