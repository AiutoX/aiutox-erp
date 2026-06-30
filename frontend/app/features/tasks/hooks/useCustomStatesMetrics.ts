/**
 * Hook for fetching and managing custom states metrics
 * Provides reactive data fetching with TanStack Query
 */

import { useQuery } from "@tanstack/react-query";
import { tasksStatisticsApi } from "../api/statistics.api";

/**
 * Hook for fetching custom states metrics
 * @returns Query result with custom states metrics data
 */
export function useCustomStatesMetrics() {
  return useQuery({
    queryKey: ["tasks", "custom-states-metrics"],
    queryFn: () => tasksStatisticsApi.getCustomStatesMetrics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for fetching custom states metrics with enabled control
 * @param enabled - Whether the query should be enabled
 * @returns Query result with custom states metrics data
 */
export function useCustomStatesMetricsControlled(enabled = true) {
  return useQuery({
    queryKey: ["tasks", "custom-states-metrics"],
    queryFn: () => tasksStatisticsApi.getCustomStatesMetrics(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
