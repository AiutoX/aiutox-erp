/**
 * API services for file management endpoints
 */

import apiClient from "./client";
import type {
  StandardResponse,
  StandardListResponse,
} from "./types/common.types";

export interface File {
  id: string;
  tenant_id: string;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  extension: string | null;
  storage_backend: string;
  storage_path: string;
  storage_url: string | null;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  version_number: number;
  is_current: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  storage_path: string;
  storage_backend: string;
  size: number;
  mime_type: string;
  change_description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface FilePermission {
  id: string;
  file_id: string;
  target_type: string;
  target_id: string;
  can_view: boolean;
  can_download: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

export interface FileUpdate {
  name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface FilePermissionRequest {
  target_type: string;
  target_id: string;
  can_view?: boolean;
  can_download?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

/**
 * Upload a file
 * POST /api/v1/files/upload
 */
export async function uploadFile(
  file: globalThis.File,
  options?: {
    entity_type?: string;
    entity_id?: string;
    description?: string;
  }
): Promise<StandardResponse<File>> {
  const formData = new FormData();
  formData.append("file", file);

  const params = new URLSearchParams();
  if (options?.entity_type) params.append("entity_type", options.entity_type);
  if (options?.entity_id) params.append("entity_id", options.entity_id);
  if (options?.description) params.append("description", options.description);

  // Note: Don't set Content-Type header manually - axios will set it automatically
  // with the correct boundary for multipart/form-data
  const response = await apiClient.post<StandardResponse<File>>(
    `/files/upload?${params.toString()}`,
    formData
  );
  return response.data;
}

/**
 * List files
 * GET /api/v1/files
 */
export async function listFiles(params?: {
  page?: number;
  page_size?: number;
  entity_type?: string;
  entity_id?: string;
}): Promise<StandardListResponse<File>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.page_size)
    queryParams.append("page_size", params.page_size.toString());
  if (params?.entity_type)
    queryParams.append("entity_type", params.entity_type);
  if (params?.entity_id) queryParams.append("entity_id", params.entity_id);

  const response = await apiClient.get<StandardListResponse<File>>(
    `/files?${queryParams.toString()}`
  );
  return response.data;
}

/**
 * Get file information
 * GET /api/v1/files/{file_id}
 */
export async function getFile(fileId: string): Promise<StandardResponse<File>> {
  const response = await apiClient.get<StandardResponse<File>>(
    `/files/${fileId}`
  );
  return response.data;
}

/**
 * Download file
 * GET /api/v1/files/{file_id}/download
 */
export async function downloadFile(fileId: string): Promise<Blob> {
  const response = await apiClient.get(`/files/${fileId}/download`, {
    responseType: "blob",
  });
  return response.data;
}

/**
 * Get file preview/thumbnail
 * GET /api/v1/files/{file_id}/preview
 */
export async function getFilePreview(
  fileId: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
  }
): Promise<Blob> {
  const params = new URLSearchParams();
  if (options?.width) params.append("width", options.width.toString());
  if (options?.height) params.append("height", options.height.toString());
  if (options?.quality) params.append("quality", options.quality.toString());

  const response = await apiClient.get<Blob>(
    `/files/${fileId}/preview?${params.toString()}`,
    {
      responseType: "blob",
    }
  );
  return response.data;
}

/**
 * Update file
 * PUT /api/v1/files/{file_id}
 */
export async function updateFile(
  fileId: string,
  data: FileUpdate
): Promise<StandardResponse<File>> {
  const response = await apiClient.put<StandardResponse<File>>(
    `/files/${fileId}`,
    data
  );
  return response.data;
}

/**
 * Delete file
 * DELETE /api/v1/files/{file_id}
 */
export async function deleteFile(fileId: string): Promise<void> {
  await apiClient.delete(`/files/${fileId}`);
}

/**
 * List file versions
 * GET /api/v1/files/{file_id}/versions
 */
export async function listFileVersions(
  fileId: string
): Promise<StandardListResponse<FileVersion>> {
  const response = await apiClient.get<StandardListResponse<FileVersion>>(
    `/files/${fileId}/versions`
  );
  return response.data;
}

/**
 * Create file version
 * POST /api/v1/files/{file_id}/versions
 */
export async function createFileVersion(
  fileId: string,
  file: globalThis.File,
  changeDescription?: string
): Promise<StandardResponse<FileVersion>> {
  const formData = new FormData();
  formData.append("file", file);

  const params = new URLSearchParams();
  if (changeDescription) params.append("change_description", changeDescription);

  // Note: Don't set Content-Type header manually - axios will set it automatically
  // with the correct boundary for multipart/form-data
  const response = await apiClient.post<StandardResponse<FileVersion>>(
    `/files/${fileId}/versions?${params.toString()}`,
    formData
  );
  return response.data;
}

/**
 * Download file version
 * GET /api/v1/files/{file_id}/versions/{version_id}/download
 */
export async function downloadFileVersion(
  fileId: string,
  versionId: string
): Promise<Blob> {
  const response = await apiClient.get(
    `/files/${fileId}/versions/${versionId}/download`,
    {
      responseType: "blob",
    }
  );
  return response.data;
}

/**
 * Update file permissions
 * PUT /api/v1/files/{file_id}/permissions
 */
export async function updateFilePermissions(
  fileId: string,
  permissions: FilePermissionRequest[]
): Promise<StandardListResponse<FilePermission>> {
  const response = await apiClient.put<StandardListResponse<FilePermission>>(
    `/files/${fileId}/permissions`,
    { permissions }
  );
  return response.data;
}
