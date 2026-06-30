/**
 * Task Comments API
 * API client for task comments
 * Sprint 2.4 - Fase 2
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

export interface TaskComment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  mentions: string[];
}

/**
 * Agregar comentario a tarea
 */
export async function addComment(
  taskId: string,
  content: string,
  mentions?: string[]
): Promise<StandardResponse<TaskComment>> {
  const commentData = {
    content,
    mentions: mentions || [],
  };

  const response = await apiClient.post(
    `/tasks/${taskId}/comments`,
    commentData
  );
  return response.data;
}

/**
 * Actualizar comentario
 */
export async function updateComment(
  taskId: string,
  commentId: string,
  content: string
): Promise<StandardResponse<TaskComment>> {
  const commentData = {
    content,
  };

  const response = await apiClient.put(
    `/tasks/${taskId}/comments/${commentId}`,
    commentData
  );
  return response.data;
}

/**
 * Eliminar comentario
 */
export async function deleteComment(
  taskId: string,
  commentId: string
): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}/comments/${commentId}`);
}

/**
 * Listar comentarios de tarea
 */
export async function listComments(
  taskId: string
): Promise<StandardListResponse<TaskComment>> {
  const response = await apiClient.get(`/tasks/${taskId}/comments`);
  return response.data;
}
