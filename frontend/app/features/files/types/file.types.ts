/**
 * TypeScript types for Files module
 *
 * Aligned with backend schemas:
 * - app/schemas/file.py
 * - app/models/file.py
 */

/**
 * Storage backend types
 */
export type StorageBackend = "local" | "s3" | "hybrid";

/**
 * File entity types that can have files attached
 */
export type FileEntityType =
  | "product"
  | "organization"
  | "contact"
  | "user"
  | "order"
  | "invoice"
  | "activity"
  | "task";

/**
 * File interface
 */
export interface File {
  id: string;
  tenant_id: string;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  extension: string | null;
  storage_backend: StorageBackend;
  storage_path: string;
  storage_url: string | null;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  version_number: number;
  is_current: boolean;
  folder_id: string | null;
  uploaded_by: string | null;
  uploaded_by_user: {
    id: string;
    email: string;
    full_name: string;
  } | null;
  tags: Array<{
    id: string;
    name: string;
    color: string | null;
    description: string | null;
  }> | null;
  deleted_at: string | null; // ISO datetime string
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

/**
 * File version interface
 */
export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  storage_path: string;
  storage_backend: StorageBackend;
  size: number;
  mime_type: string;
  change_description: string | null;
  created_by: string | null;
  created_at: string; // ISO datetime string
}

/**
 * File permission interface
 */
export interface FilePermission {
  id: string;
  file_id: string;
  target_type: "user" | "role" | "organization";
  target_id: string;
  can_view: boolean;
  can_download: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

/**
 * File create/update types
 */
export interface FileCreate {
  name: string;
  description?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
}

export interface FileUpdate {
  name?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * File permission request
 */
export interface FilePermissionRequest {
  target_type: "user" | "role" | "organization";
  target_id: string;
  can_view?: boolean;
  can_download?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

/**
 * File version create
 */
export interface FileVersionCreate {
  change_description?: string | null;
}

/**
 * Parameters for listing files
 */
export interface FilesListParams {
  page?: number;
  page_size?: number;
  entity_type?: string | null;
  entity_id?: string | null;
  folder_id?: string | null;
  tags?: string | null; // Comma-separated tag IDs
}

/**
 * File upload parameters
 */
export interface FileUploadParams {
  file: File | Blob;
  entity_type?: string | null;
  entity_id?: string | null;
  folder_id?: string | null;
  description?: string | null;
  permissions?: FilePermissionRequest[] | null;
  onProgress?: (progress: number) => void;
}
