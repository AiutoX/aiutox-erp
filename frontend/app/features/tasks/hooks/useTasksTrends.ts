/**
 * Hook for fetching and managing tasks trends
 * Provides reactive data fetching with TanStack Query
 */

import { useQuery } from "@tanstack/react-query";
import { tasksStatisticsApi } from "../api/statistics.api";

/**
 * Hook for fetching tasks trends
 * @param period - Time period for trends (7d, 30d, 90d)
 * @returns Query result with tasks trends data
 */
export function useTasksTrends(period: string = "30d") {
  return useQuery({
    queryKey: ["tasks", "trends", period],
    queryFn: () => tasksStatisticsApi.getTrends(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for fetching tasks trends with enabled control
 * @param period - Time period for trends (7d, 30d, 90d)
 * @param enabled - Whether the query should be enabled
 * @returns Query result with tasks trends data
 */
export function useTasksTrendsControlled(
  period: string = "30d",
  enabled = true
) {
  return useQuery({
    queryKey: ["tasks", "trends", period],
    queryFn: () => tasksStatisticsApi.getTrends(period),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
