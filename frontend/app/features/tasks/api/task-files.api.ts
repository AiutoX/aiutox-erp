/**
 * Task Files API
 * API client for task file attachments
 * Sprint 3 - Fase 2
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

export interface TaskFileAttachment {
  file_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  attached_at: string;
  attached_by: string;
}

/**
 * Adjuntar archivo a tarea
 */
export async function attachFileToTask(
  taskId: string,
  fileId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  fileUrl: string
): Promise<StandardResponse<TaskFileAttachment>> {
  console.warn("*** attachFileToTask API called ***");
  console.warn("taskId:", taskId);
  console.warn("fileId:", fileId);
  console.warn("fileName:", fileName);
  console.warn("fileSize:", fileSize);
  console.warn("fileType:", fileType);
  console.warn("fileUrl:", fileUrl);

  const params = new URLSearchParams();
  params.append("file_id", fileId);
  params.append("file_name", fileName);
  params.append("file_size", fileSize.toString());
  params.append("file_type", fileType);
  params.append("file_url", fileUrl);

  const fullUrl = `/tasks/${taskId}/files?${params.toString()}`;
  console.warn("Full URL:", fullUrl);

  try {
    console.warn("=== Calling apiClient.post ===");
    const response = await apiClient.post(
      fullUrl,
      {},
      {
        timeout: 60000, // Aumentar timeout a 60 segundos
      }
    );
    console.warn("=== attachFileToTask response ===");
    console.warn("Response:", response);
    console.warn("Response data:", response.data);
    return response.data;
  } catch (error) {
    console.error("=== attachFileToTask error ===");
    console.error("Error:", error);
    throw error;
  }
}

/**
 * Desadjuntar archivo de tarea
 */
export async function detachFileFromTask(
  taskId: string,
  fileId: string
): Promise<void> {
  try {
    const response = await apiClient.delete(`/tasks/${taskId}/files/${fileId}`);
    if (response.status !== 204 && import.meta.env.DEV) {
      console.debug("[task-files] Unexpected delete status:", response.status);
    }
  } catch (error) {
    console.error("detachFileFromTask API error:", error);
    throw error;
  }
}

/**
 * Listar archivos de tarea
 */
export async function listTaskFiles(
  taskId: string
): Promise<StandardListResponse<TaskFileAttachment>> {
  const response = await apiClient.get(`/tasks/${taskId}/files`);
  return response.data;
}
