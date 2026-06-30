/**
 * Task Status Definitions API
 * API client for customizable task statuses
 * Sprint 2 - Fase 2
 */

import apiClient from "~/lib/api/client";

interface StandardResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

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

export interface TaskStatusDefinition {
  id: string;
  tenant_id: string;
  name: string;
  type: "open" | "in_progress" | "closed";
  color: string;
  is_system: boolean;
  order: number;
}

export interface TaskStatusDefinitionCreate {
  name: string;
  type: "open" | "in_progress" | "closed";
  color: string;
  order?: number;
}

export interface TaskStatusDefinitionUpdate {
  name?: string;
  type?: "open" | "in_progress" | "closed";
  color?: string;
  order?: number;
}

/**
 * Obtener todas las definiciones de estado
 */
export async function listStatusDefinitions(): Promise<
  StandardListResponse<TaskStatusDefinition>
> {
  const response = await apiClient.get("/api/v1/tasks/status-definitions");
  return response.data;
}

/**
 * Crear nueva definición de estado
 */
export async function createStatusDefinition(
  data: TaskStatusDefinitionCreate
): Promise<StandardResponse<TaskStatusDefinition>> {
  const response = await apiClient.post(
    "/api/v1/tasks/status-definitions",
    data
  );
  return response.data;
}

/**
 * Actualizar definición de estado
 */
export async function updateStatusDefinition(
  statusId: string,
  data: TaskStatusDefinitionUpdate
): Promise<StandardResponse<TaskStatusDefinition>> {
  const response = await apiClient.put(
    `/api/v1/tasks/status-definitions/${statusId}`,
    data
  );
  return response.data;
}

/**
 * Eliminar definición de estado
 */
export async function deleteStatusDefinition(statusId: string): Promise<void> {
  await apiClient.delete(`/api/v1/tasks/status-definitions/${statusId}`);
}

/**
 * Reordenar definiciones de estado
 */
export async function reorderStatusDefinitions(
  statusOrders: Record<string, number>
): Promise<StandardListResponse<TaskStatusDefinition>> {
  const params = new URLSearchParams();
  Object.entries(statusOrders).forEach(([id, order]) => {
    params.append("status_orders", `${id}:${order}`);
  });

  const response = await apiClient.post(
    `/api/v1/tasks/status-definitions/reorder?${params.toString()}`
  );
  return response.data;
}
