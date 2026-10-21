/**
 * API service for Folders module
 *
 * Handles CRUD operations for folders
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";

export interface Folder {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  parent_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  path: string | null;
  depth: number;
}

export interface FolderTreeItem extends Folder {
  children: FolderTreeItem[];
  file_count: number;
}

export interface FolderCreate {
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface FolderUpdate {
  name?: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Create folder
 * POST /api/v1/folders
 *
 * Requires: files.manage permission
 */
export async function createFolder(
  data: FolderCreate
): Promise<StandardResponse<Folder>> {
  const response = await apiClient.post<StandardResponse<Folder>>(
    "/folders",
    data
  );
  return response.data;
}

/**
 * List folders
 * GET /api/v1/folders
 *
 * Requires: files.view permission
 */
export async function listFolders(params?: {
  parent_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
}): Promise<StandardListResponse<Folder>> {
  const response = await apiClient.get<StandardListResponse<Folder>>(
    "/folders",
    {
      params: {
        parent_id: params?.parent_id,
        entity_type: params?.entity_type,
        entity_id: params?.entity_id,
      },
    }
  );
  return response.data;
}

/**
 * Get folder tree
 * GET /api/v1/folders/tree
 *
 * Requires: files.view permission
 */
export async function getFolderTree(params?: {
  parent_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
}): Promise<StandardListResponse<FolderTreeItem>> {
  try {
    const response = await apiClient.get<StandardListResponse<FolderTreeItem>>(
      "/folders/tree",
      {
        params: {
          parent_id: params?.parent_id,
          entity_type: params?.entity_type,
          entity_id: params?.entity_id,
        },
      }
    );
    return response.data;
  } catch (error: unknown) {
    // Improve error message
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as {
        response?: { status?: number; data?: { error?: { message?: string } } };
      };
      if (axiosError.response?.status === 403) {
        throw new Error(
          "No tienes permisos para ver carpetas. Se requiere el permiso 'files.view'."
        );
      }
      if (axiosError.response?.status === 404) {
        throw new Error("El endpoint de carpetas no está disponible.");
      }
      if (axiosError.response?.data?.error?.message) {
        throw new Error(axiosError.response.data.error.message);
      }
    }
    throw error;
  }
}

/**
 * Get folder by ID
 * GET /api/v1/folders/{folder_id}
 *
 * Requires: files.view permission
 */
export async function getFolder(
  folderId: string
): Promise<StandardResponse<Folder>> {
  const response = await apiClient.get<StandardResponse<Folder>>(
    `/folders/${folderId}`
  );
  return response.data;
}

/**
 * Update folder
 * PUT /api/v1/folders/{folder_id}
 *
 * Requires: files.manage permission
 */
export async function updateFolder(
  folderId: string,
  data: FolderUpdate
): Promise<StandardResponse<Folder>> {
  const response = await apiClient.put<StandardResponse<Folder>>(
    `/folders/${folderId}`,
    data
  );
  return response.data;
}

/**
 * Delete folder
 * DELETE /api/v1/folders/{folder_id}
 *
 * Requires: files.manage permission
 */
export async function deleteFolder(folderId: string): Promise<void> {
  await apiClient.delete(`/folders/${folderId}`);
}

export interface FolderPermission {
  id: string;
  folder_id: string;
  target_type: "user" | "role" | "organization";
  target_id: string;
  can_view: boolean;
  can_create_files: boolean;
  can_create_folders: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get folder permissions
 * GET /api/v1/folders/{folder_id}/permissions
 *
 * Requires: folders.view permission
 */
export async function getFolderPermissions(
  folderId: string
): Promise<StandardListResponse<FolderPermission>> {
  const response = await apiClient.get<StandardListResponse<FolderPermission>>(
    `/folders/${folderId}/permissions`
  );
  return response.data;
}
