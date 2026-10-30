/**
 * API service for SavedFilters.
 * Handles all HTTP requests to the backend /api/v1/views/filters endpoints.
 */

import apiClient from "../../../lib/api/client";
import type {
  SavedFilter,
  SavedFilterCreate,
  SavedFilterUpdate,
  SavedFiltersListParams,
  StandardListResponse,
  StandardResponse,
} from "../types/savedFilter.types";

/**
 * Get list of saved filters
 */
export async function getSavedFilters(
  params?: SavedFiltersListParams
): Promise<StandardListResponse<SavedFilter>> {
  const response = await apiClient.get<StandardListResponse<SavedFilter>>(
    "/views/filters",
    {
      params: {
        module: params?.module,
        is_shared: params?.is_shared,
        page: params?.page || 1,
        page_size: params?.page_size || 20,
      },
    }
  );

  return response.data;
}

/**
 * Get a single saved filter by ID
 */
export async function getSavedFilter(
  filterId: string
): Promise<StandardResponse<SavedFilter>> {
  const response = await apiClient.get<StandardResponse<SavedFilter>>(
    `/views/filters/${filterId}`
  );
  return response.data;
}

/**
 * Create a new saved filter
 */
export async function createSavedFilter(
  filterData: SavedFilterCreate
): Promise<StandardResponse<SavedFilter>> {
  const response = await apiClient.post<StandardResponse<SavedFilter>>(
    "/views/filters",
    filterData
  );
  return response.data;
}

/**
 * Update an existing saved filter
 */
export async function updateSavedFilter(
  filterId: string,
  filterData: SavedFilterUpdate
): Promise<StandardResponse<SavedFilter>> {
  const response = await apiClient.put<StandardResponse<SavedFilter>>(
    `/views/filters/${filterId}`,
    filterData
  );
  return response.data;
}

/**
 * Delete a saved filter
 */
export async function deleteSavedFilter(filterId: string): Promise<void> {
  await apiClient.delete(`/views/filters/${filterId}`);
}
