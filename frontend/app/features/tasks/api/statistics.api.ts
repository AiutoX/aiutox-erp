/**
 * API client for tasks statistics and reporting
 * Provides methods to fetch statistics, trends, and custom states metrics
 */

import api from "~/lib/api/client";

export interface TimeFilter {
  date_from?: string;
  date_to?: string;
  status?: string;
  priority?: string;
}

export interface TasksStatisticsResponse {
  total_tasks: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_custom_state: Record<string, number>;
  completion_rate: number;
  completed_tasks: number;
  overdue_tasks: number;
}

export interface TrendDataPoint {
  period: string;
  created: number;
  completed: number;
}

export interface TasksTrendsResponse {
  period: string;
  data_points: TrendDataPoint[];
}

export interface CustomStateMetrics {
  state_id: string;
  state_name: string;
  state_type: string;
  state_color: string;
  task_count: number;
  avg_time_in_state_hours: number | null;
}

export const tasksStatisticsApi = {
  /**
   * Get tasks statistics overview
   * @param filters - Optional filters for statistics
   * @returns Promise with tasks statistics
   */
  getStatistics: async (
    filters?: TimeFilter
  ): Promise<TasksStatisticsResponse> => {
    const params = new URLSearchParams();

    if (filters?.date_from) {
      params.append("date_from", filters.date_from);
    }
    if (filters?.date_to) {
      params.append("date_to", filters.date_to);
    }
    if (filters?.status) {
      params.append("status", filters.status);
    }
    if (filters?.priority) {
      params.append("priority", filters.priority);
    }

    const url = `/tasks/statistics/overview${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Get tasks trends over time
   * @param period - Time period for trends (7d, 30d, 90d)
   * @returns Promise with tasks trends
   */
  getTrends: async (period: string = "30d"): Promise<TasksTrendsResponse> => {
    const response = await api.get(`/tasks/statistics/trends?period=${period}`);
    return response.data;
  },

  /**
   * Get custom states metrics
   * @returns Promise with custom states metrics
   */
  getCustomStatesMetrics: async (): Promise<CustomStateMetrics[]> => {
    const response = await api.get("/tasks/statistics/custom-states");
    return response.data;
  },
};
