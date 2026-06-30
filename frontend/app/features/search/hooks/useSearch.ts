import { useQuery } from "@tanstack/react-query";

import {
  getRecentSearches,
  getSearchSuggestions,
  search,
  type SearchQueryParams,
} from "../api/search.api";

const STALE_TIME = 1000 * 60 * 5;

export function useSearch(params: SearchQueryParams, enabled = true) {
  return useQuery({
    queryKey: ["search", params],
    queryFn: () => search(params),
    staleTime: STALE_TIME,
    enabled: enabled && !!params.query,
  });
}

export function useSearchSuggestions(query: string, limit = 5) {
  return useQuery({
    queryKey: ["search", "suggestions", query, limit],
    queryFn: () => getSearchSuggestions(query, limit),
    staleTime: STALE_TIME,
    enabled: !!query,
  });
}

export function useRecentSearches(limit = 5) {
  return useQuery({
    queryKey: ["search", "recent", limit],
    queryFn: () => getRecentSearches(limit),
    staleTime: STALE_TIME,
  });
}
