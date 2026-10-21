/**
 * Widget registry + preference hooks — TanStack Query, mirrors
 * useReporting.ts's conventions.
 */

import { useQuery } from "@tanstack/react-query";
import { getAvailableWidgets, getMyWidgets } from "../api/widgets.api";

const STALE = 1000 * 60 * 5; // 5 minutes

export function useAvailableWidgets() {
  return useQuery({
    queryKey: ["widgets", "available"],
    queryFn: getAvailableWidgets,
    staleTime: STALE,
    retry: 2,
  });
}

export function useMyWidgets() {
  return useQuery({
    queryKey: ["widgets", "my-widgets"],
    queryFn: getMyWidgets,
    staleTime: STALE,
    retry: 2,
  });
}
