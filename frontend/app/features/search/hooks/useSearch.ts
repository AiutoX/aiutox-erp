import { useQuery } from "@tanstack/react-query";

import {
  getSearchableTypes,
  getSearchSuggestions,
  search,
  type SearchQueryParams,
} from "../api/search.api";

const STALE_TIME = 1000 * 60 * 5;
// searchable-types only changes when a module's SearchProvider registration
// changes (a deploy-time event), never per search — cache much longer than
// search results themselves, per the interface design's stated intent
// (docs/dev/artifacts/search/06-interface-design.md, Workflow 1).
const SEARCHABLE_TYPES_STALE_TIME = 1000 * 60 * 30;

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

export function useSearchableTypes(enabled = true) {
  return useQuery({
    queryKey: ["search", "searchable-types"],
    queryFn: () => getSearchableTypes(),
    staleTime: SEARCHABLE_TYPES_STALE_TIME,
    enabled,
  });
}
