/**
 * Hook for fetching and managing tasks statistics
 * Provides reactive data fetching with TanStack Query
 */

import { useQuery } from "@tanstack/react-query";
import { tasksStatisticsApi, type TimeFilter } from "../api/statistics.api";

/**
 * Hook for fetching tasks statistics
 * @param filters - Optional filters for statistics
 * @returns Query result with tasks statistics data
 */
export function useTasksStatistics(filters?: TimeFilter) {
  return useQuery({
    queryKey: ["tasks", "statistics", filters],
    queryFn: () => tasksStatisticsApi.getStatistics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for fetching tasks statistics with enabled control
 * @param filters - Optional filters for statistics
 * @param enabled - Whether the query should be enabled
 * @returns Query result with tasks statistics data
 */
export function useTasksStatisticsControlled(
  filters?: TimeFilter,
  enabled = true
) {
  return useQuery({
    queryKey: ["tasks", "statistics", filters],
    queryFn: () => tasksStatisticsApi.getStatistics(filters),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
