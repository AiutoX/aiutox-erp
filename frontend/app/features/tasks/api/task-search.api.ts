/**
 * Task Search API
 * API client for advanced task search
 * Sprint 2.5 - Fase 2
 */

import apiClient from "~/lib/api/client";
import type { Task } from "../types/task.types";

interface StandardListResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
  message?: string;
}

interface StandardResponse<T> {
  data: T;
  message?: string;
}

export interface TaskSearchParams {
  q?: string;
  tag_ids?: string[];
  status?: string;
  priority?: string;
  limit?: number;
}

export interface PopularTag {
  tag_id: string;
  count: number;
}

/**
 * Búsqueda avanzada de tareas
 */
export async function searchTasks(
  params: TaskSearchParams
): Promise<StandardListResponse<Task>> {
  const searchParams = new URLSearchParams();

  if (params.q) searchParams.append("q", params.q);
  if (params.status) searchParams.append("status", params.status);
  if (params.priority) searchParams.append("priority", params.priority);
  if (params.limit) searchParams.append("limit", params.limit.toString());
  if (params.tag_ids && params.tag_ids.length > 0) {
    params.tag_ids.forEach((id) => searchParams.append("tag_ids", id));
  }

  const response = await apiClient.get(
    `/api/v1/tasks/search?${searchParams.toString()}`
  );
  return response.data;
}

/**
 * Obtener tags populares
 */
export async function getPopularTags(
  limit: number = 20
): Promise<StandardListResponse<PopularTag>> {
  const response = await apiClient.get(
    `/api/v1/tasks/tags/popular?limit=${limit}`
  );
  return response.data;
}

/**
 * Obtener sugerencias de tags
 */
export async function suggestTags(
  query: string,
  limit: number = 10
): Promise<StandardResponse<string[]>> {
  const response = await apiClient.get(
    `/api/v1/tasks/tags/suggest?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  return response.data;
}
