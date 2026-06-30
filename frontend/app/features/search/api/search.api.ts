import apiClient from "~/lib/api/client";
import type { StandardListResponse } from "~/lib/api/types/common.types";

export interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  url: string;
  icon?: string;
  metadata?: Record<string, unknown>;
  score?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchQueryParams {
  query: string;
  limit?: number;
  offset?: number;
  types?: string[];
  filters?: Record<string, unknown>;
}

/**
 * Search across all available resources
 */
export async function search(
  params: SearchQueryParams
): Promise<StandardListResponse<SearchResultItem>> {
  const { query, limit = 10, offset = 0, types, filters } = params;

  const response = await apiClient.get<StandardListResponse<SearchResultItem>>(
    "/search",
    {
      params: {
        q: query,
        limit,
        offset,
        types: types?.join(","),
        ...filters,
      },
    }
  );

  return response.data;
}

/**
 * Get search suggestions for the given query
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<string[]> {
  const response = await apiClient.get<{ data: string[] }>(
    "/search/suggestions",
    {
      params: { q: query, limit },
    }
  );

  return response.data.data;
}

/**
 * Get recent searches for the current user
 */
export async function getRecentSearches(limit: number = 5): Promise<string[]> {
  const response = await apiClient.get<{ data: string[] }>("/search/recent", {
    params: { limit },
  });

  return response.data.data;
}

/**
 * Save a search query to the user's recent searches
 */
export async function saveRecentSearch(query: string): Promise<void> {
  await apiClient.post("/search/recent", { query });
}

/**
 * Clear the user's search history
 */
export async function clearSearchHistory(): Promise<void> {
  await apiClient.delete("/search/recent");
}
