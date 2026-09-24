import apiClient from "~/lib/api/client";
import type { StandardListResponse } from "~/lib/api/types/common.types";

/**
 * Single search result — matches the backend's corrected contract exactly
 * (SearchResultItem in backend/app/core/search/schemas.py). No adapter layer
 * needed: the backend already returns this flat shape with camelCase
 * createdAt/updatedAt via a Pydantic alias.
 * See docs/04-modules/core/search/MODULE-SPEC.md Section 11.
 */
export interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  url: string;
  icon?: string;
  metadata?: Record<string, unknown>;
  score?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchQueryParams {
  query: string;
  limit?: number;
  offset?: number;
  types?: string[];
}

/** One entry in the searchable-types catalog (GET /search/searchable-types). */
export interface SearchableType {
  entity_type: string;
  label: string;
  icon: string | null;
  module_id: string;
}

/**
 * Search across all indexed entities the user is allowed to see.
 */
export async function search(
  params: SearchQueryParams
): Promise<StandardListResponse<SearchResultItem>> {
  const { query, limit = 20, offset = 0, types } = params;

  const response = await apiClient.post<StandardListResponse<SearchResultItem>>(
    "/search",
    {
      query,
      entity_types: types && types.length > 0 ? types : undefined,
      limit,
      offset,
    }
  );

  return response.data;
}

/**
 * Get search suggestions for the given query.
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<string[]> {
  if (!query) return [];

  const response = await apiClient.get<{
    data: Array<{ text: string; entity_type: string; entity_id: string }>;
  }>("/search/suggestions", {
    params: { query, limit },
  });

  return response.data.data.map((s) => s.text);
}

/**
 * Live catalog of entity types this tenant can currently search — replaces
 * the previously hardcoded entity-registry.ts. Cache this at a long
 * staleTime in the calling component/hook: it changes only when a module's
 * SearchProvider registration changes, not per search.
 */
export async function getSearchableTypes(): Promise<SearchableType[]> {
  const response = await apiClient.get<{ data: SearchableType[] }>(
    "/search/searchable-types"
  );
  return response.data.data;
}
