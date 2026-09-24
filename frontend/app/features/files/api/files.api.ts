/**
 * API service for Files module
 *
 * Handles CRUD operations for files, versions, and permissions
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  File,
  FileUpdate,
  FileVersion,
  FilePermission,
  FilePermissionRequest,
  FilesListParams,
} from "../types/file.types";

/**
 * Upload file
 * POST /api/v1/files/upload
 *
 * Requires: files.manage permission
 */
export async function uploadFile(
  file: File | Blob,
  params?: {
    entity_type?: string | null;
    entity_id?: string | null;
    folder_id?: string | null;
    description?: string | null;
    permissions?: FilePermissionRequest[] | null;
    onProgress?: (progress: number) => void;
  }
): Promise<StandardResponse<File>> {
  const formData = new FormData();
  formData.append("file", file as Blob);

  if (params?.entity_type) {
    formData.append("entity_type", params.entity_type);
  }
  if (params?.entity_id) {
    formData.append("entity_id", params.entity_id);
  }
  if (params?.folder_id) {
    formData.append("folder_id", params.folder_id);
  }
  if (params?.description) {
    formData.append("description", params.description);
  }
  if (params?.permissions && params.permissions.length > 0) {
    formData.append("permissions", JSON.stringify(params.permissions));
  }

  const response = await apiClient.post<StandardResponse<File>>(
    "/files/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // Aumentar timeout a 60 segundos
      onUploadProgress: (progressEvent) => {
        if (params?.onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          params.onProgress(progress);
        }
      },
    }
  );
  return response.data;
}

/**
 * Get file by ID
 * GET /api/v1/files/{file_id}
 *
 * Requires: files.view permission
 */
export async function getFile(fileId: string): Promise<StandardResponse<File>> {
  const response = await apiClient.get<StandardResponse<File>>(
    `/files/${fileId}`
  );
  return response.data;
}

/**
 * List files
 * GET /api/v1/files
 *
 * Requires: files.view permission
 */
export async function listFiles(
  params?: FilesListParams
): Promise<StandardListResponse<File>> {
  const response = await apiClient.get<StandardListResponse<File>>("/files", {
    params: {
      page: params?.page || 1,
      page_size: params?.page_size || 20,
      entity_type: params?.entity_type,
      entity_id: params?.entity_id,
      folder_id: params?.folder_id,
      tags: params?.tags,
    },
  });
  return response.data;
}

/**
 * Download file
 * GET /api/v1/files/{file_id}/download
 *
 * Requires: files.view permission
 */
export async function downloadFile(fileId: string): Promise<Blob> {
  const response = await apiClient.get(`/files/${fileId}/download`, {
    responseType: "blob",
  });
  return response.data;
}

/**
 * Get file content (raw text content for text-based previews)
 * GET /api/v1/files/{file_id}/content
 *
 * Requires: files.view permission
 */
export async function getFileContent(fileId: string): Promise<string> {
  const response = await apiClient.get(`/files/${fileId}/content`, {
    responseType: "text",
  });
  return response.data;
}

/**
 * Get file preview/thumbnail
 * GET /api/v1/files/{file_id}/preview
 *
 * Requires: files.view permission
 */
export async function getFilePreview(
  fileId: string,
  params?: {
    width?: number;
    height?: number;
    quality?: number;
  }
): Promise<Blob> {
  const response = await apiClient.get(`/files/${fileId}/preview`, {
    params: {
      width: params?.width || 200,
      height: params?.height || 200,
      quality: params?.quality || 80,
    },
    responseType: "blob",
  });
  return response.data;
}

/**
 * Update file
 * PUT /api/v1/files/{file_id}
 *
 * Requires: files.manage permission
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
 *
 * Requires: files.manage permission
 */
export async function deleteFile(fileId: string): Promise<void> {
  await apiClient.delete(`/files/${fileId}`);
}

/**
 * List file versions
 * GET /api/v1/files/{file_id}/versions
 *
 * Requires: files.view permission
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
 *
 * Requires: files.manage permission
 */
export async function createFileVersion(
  fileId: string,
  file: File | Blob,
  params?: {
    change_description?: string | null;
    onProgress?: (progress: number) => void;
  }
): Promise<StandardResponse<FileVersion>> {
  const formData = new FormData();
  formData.append("file", file as Blob);
  if (params?.change_description) {
    formData.append("change_description", params.change_description);
  }

  const response = await apiClient.post<StandardResponse<FileVersion>>(
    `/files/${fileId}/versions`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (params?.onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          params.onProgress(progress);
        }
      },
    }
  );
  return response.data;
}

/**
 * Download file version
 * GET /api/v1/files/{file_id}/versions/{version_id}/download
 *
 * Requires: files.view permission
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
 * Restore file version
 * POST /api/v1/files/{file_id}/versions/{version_id}/restore
 *
 * Requires: files.manage permission
 */
export async function restoreFileVersion(
  fileId: string,
  versionId: string,
  changeDescription?: string | null
): Promise<StandardResponse<FileVersion>> {
  const response = await apiClient.post<StandardResponse<FileVersion>>(
    `/files/${fileId}/versions/${versionId}/restore`,
    null,
    {
      params: {
        change_description: changeDescription,
      },
    }
  );
  return response.data;
}

/**
 * Get file permissions
 * GET /api/v1/files/{file_id}/permissions
 *
 * Requires: files.view permission
 */
export async function getFilePermissions(
  fileId: string
): Promise<StandardListResponse<FilePermission>> {
  const response = await apiClient.get<StandardListResponse<FilePermission>>(
    `/files/${fileId}/permissions`
  );
  return response.data;
}

/**
 * Update file permissions
 * PUT /api/v1/files/{file_id}/permissions
 *
 * Requires: files.manage permission
 */
export async function updateFilePermissions(
  fileId: string,
  permissions: FilePermissionRequest[]
): Promise<StandardListResponse<FilePermission>> {
  const response = await apiClient.put<StandardListResponse<FilePermission>>(
    `/files/${fileId}/permissions`,
    permissions
  );
  return response.data;
}

/**
 * Tag type (from tags module)
 */
export interface Tag {
  id: string;
  tenant_id: string;
  name: string;
  color: string | null;
  description: string | null;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get file tags
 * GET /api/v1/files/{file_id}/tags
 *
 * Requires: files.view permission
 */
export async function getFileTags(
  fileId: string
): Promise<StandardListResponse<Tag>> {
  const response = await apiClient.get<StandardListResponse<Tag>>(
    `/files/${fileId}/tags`
  );
  return response.data;
}

/**
 * Add tags to file
 * POST /api/v1/files/{file_id}/tags
 *
 * Requires: files.manage permission
 */
export async function addFileTags(
  fileId: string,
  tagIds: string[]
): Promise<StandardListResponse<Tag>> {
  const response = await apiClient.post<StandardListResponse<Tag>>(
    `/files/${fileId}/tags`,
    null,
    {
      params: {
        tag_ids: tagIds,
      },
    }
  );
  return response.data;
}

/**
 * Remove tag from file
 * DELETE /api/v1/files/{file_id}/tags/{tag_id}
 *
 * Requires: files.manage permission
 */
export async function removeFileTag(
  fileId: string,
  tagId: string
): Promise<void> {
  await apiClient.delete(`/files/${fileId}/tags/${tagId}`);
}
