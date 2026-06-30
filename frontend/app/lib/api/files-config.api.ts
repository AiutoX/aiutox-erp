/**
 * API services for files configuration endpoints
 */

import apiClient from "./client";
import type { StandardResponse } from "./types/common.types";

export interface StorageConfig {
  backend: "local" | "s3" | "hybrid";
  s3?: {
    bucket_name: string;
    access_key_id: string;
    secret_access_key: string;
    region: string;
  };
  local?: {
    base_path: string;
  };
}

export interface StorageConfigUpdate {
  backend: "local" | "s3" | "hybrid";
  s3?: {
    bucket_name: string;
    access_key_id: string;
    secret_access_key: string;
    region: string;
  };
  local?: {
    base_path: string;
  };
}

export interface S3ConnectionTestRequest {
  bucket_name: string;
  access_key_id: string;
  secret_access_key: string;
  region: string;
}

export interface S3ConnectionTestResponse {
  success: boolean;
  message: string;
  bucket_name?: string;
  region?: string;
}

export interface StorageStats {
  total_space_used: number;
  total_files: number;
  total_versions: number;
  total_folders: number;
  mime_distribution: Record<string, number>;
  entity_distribution: Record<string, number>;
  files_with_permissions: number;
  folders_with_permissions: number;
  file_permission_distribution: Record<string, number>;
  folder_permission_distribution: Record<string, number>;
}

export interface FileLimits {
  max_file_size: number;
  allowed_mime_types: string[];
  blocked_mime_types: string[];
  max_versions_per_file: number;
  retention_days: number | null;
}

export interface FileLimitsUpdate {
  max_file_size?: number;
  allowed_mime_types?: string[];
  blocked_mime_types?: string[];
  max_versions_per_file?: number;
  retention_days?: number | null;
}

export interface ThumbnailConfig {
  default_width: number;
  default_height: number;
  quality: number;
  cache_enabled: boolean;
  max_cache_size: number;
}

export interface ThumbnailConfigUpdate {
  default_width?: number;
  default_height?: number;
  quality?: number;
  cache_enabled?: boolean;
  max_cache_size?: number;
}

/**
 * Get storage configuration
 * GET /api/v1/config/files/storage
 *
 * Requires: system.configure permission
 */
export async function getStorageConfig(): Promise<
  StandardResponse<StorageConfig>
> {
  const response = await apiClient.get<StandardResponse<StorageConfig>>(
    "/config/files/storage"
  );
  return response.data;
}

/**
 * Update storage configuration
 * PUT /api/v1/config/files/storage
 *
 * Requires: system.configure permission
 */
export async function updateStorageConfig(
  config: StorageConfigUpdate
): Promise<StandardResponse<StorageConfig>> {
  const response = await apiClient.put<StandardResponse<StorageConfig>>(
    "/config/files/storage",
    config
  );
  return response.data;
}

/**
 * Test S3 connection
 * POST /api/v1/config/files/storage/test
 *
 * Requires: system.configure permission
 */
export async function testS3Connection(
  config: S3ConnectionTestRequest
): Promise<StandardResponse<S3ConnectionTestResponse>> {
  const response = await apiClient.post<
    StandardResponse<S3ConnectionTestResponse>
  >("/config/files/storage/test", config);
  return response.data;
}

/**
 * Get storage statistics
 * GET /api/v1/config/files/stats
 *
 * Requires: system.configure permission
 */
export async function getStorageStats(): Promise<
  StandardResponse<StorageStats>
> {
  const response = await apiClient.get<StandardResponse<StorageStats>>(
    "/config/files/stats"
  );
  return response.data;
}

/**
 * Get file limits configuration
 * GET /api/v1/config/files/limits
 *
 * Requires: system.configure permission
 */
export async function getFileLimits(): Promise<StandardResponse<FileLimits>> {
  const response = await apiClient.get<StandardResponse<FileLimits>>(
    "/config/files/limits"
  );
  return response.data;
}

/**
 * Update file limits configuration
 * PUT /api/v1/config/files/limits
 *
 * Requires: system.configure permission
 */
export async function updateFileLimits(
  limits: FileLimitsUpdate
): Promise<StandardResponse<FileLimits>> {
  const response = await apiClient.put<StandardResponse<FileLimits>>(
    "/config/files/limits",
    limits
  );
  return response.data;
}

/**
 * Get thumbnail configuration
 * GET /api/v1/config/files/thumbnails
 *
 * Requires: system.configure permission
 */
export async function getThumbnailConfig(): Promise<
  StandardResponse<ThumbnailConfig>
> {
  const response = await apiClient.get<StandardResponse<ThumbnailConfig>>(
    "/config/files/thumbnails"
  );
  return response.data;
}

/**
 * Update thumbnail configuration
 * PUT /api/v1/config/files/thumbnails
 *
 * Requires: system.configure permission
 */
export async function updateThumbnailConfig(
  config: ThumbnailConfigUpdate
): Promise<StandardResponse<ThumbnailConfig>> {
  const response = await apiClient.put<StandardResponse<ThumbnailConfig>>(
    "/config/files/thumbnails",
    config
  );
  return response.data;
}
