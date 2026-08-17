/**
 * React hooks for file management
 *
 * Provides CRUD operations and state management for files
 * using React Query for intelligent caching and state management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFiles,
  getFile,
  uploadFile,
  updateFile,
  deleteFile,
  downloadFile,
  getFileContent,
  getFilePreview,
  listFileVersions,
  createFileVersion,
  downloadFileVersion,
  restoreFileVersion,
  updateFilePermissions,
} from "../api/files.api";
import type {
  File,
  FileUpdate,
  FilePermissionRequest,
  FilesListParams,
  FileUploadParams,
} from "../types/file.types";

const EMPTY_FILES: File[] = [];

// Query keys for React Query
export const fileKeys = {
  all: ["files"] as const,
  lists: () => [...fileKeys.all, "list"] as const,
  list: (params?: FilesListParams) => [...fileKeys.lists(), params] as const,
  details: () => [...fileKeys.all, "detail"] as const,
  detail: (id: string) => [...fileKeys.details(), id] as const,
  versions: (fileId: string) =>
    [...fileKeys.detail(fileId), "versions"] as const,
};

/**
 * Hook to list files with pagination
 * Uses React Query for intelligent caching and automatic refetching
 */
export function useFiles(params?: FilesListParams) {
  const {
    data: response,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: fileKeys.list(params),
    queryFn: () => listFiles(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    files: response?.data ?? EMPTY_FILES,
    loading,
    error: error,
    pagination:
      response?.meta &&
      typeof response.meta === "object" &&
      "total" in response.meta
        ? {
            total: (response.meta as { total: number }).total,
            page: (response.meta as { page: number }).page,
            page_size: (response.meta as { page_size: number }).page_size,
            total_pages: (response.meta as { total_pages: number }).total_pages,
          }
        : null,
    refresh: () => refetch(),
  };
}

/**
 * Hook to get a single file by ID
 * Uses React Query for intelligent caching
 */
export function useFile(fileId: string | null) {
  const {
    data: response,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: fileKeys.detail(fileId || ""),
    queryFn: () => {
      if (!fileId) {
        throw new Error("File ID is required");
      }
      return getFile(fileId);
    },
    enabled: !!fileId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    file: response?.data || null,
    loading,
    error: error,
    refresh: () => refetch(),
  };
}

/**
 * Hook to upload a file
 * Uses React Query mutation for optimistic updates
 */
export function useFileUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: FileUploadParams) => {
      return uploadFile(params.file, {
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        folder_id: params.folder_id,
        description: params.description,
        permissions: params.permissions,
        onProgress: params.onProgress,
      });
    },
    onSuccess: () => {
      // Invalidate files list to refetch
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
    },
  });
}

/**
 * Hook to update a file
 */
export function useFileUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      data,
    }: {
      fileId: string;
      data: FileUpdate;
    }) => {
      return updateFile(fileId, data);
    },
    onSuccess: (response, variables) => {
      // Update cache for specific file
      queryClient.setQueryData(fileKeys.detail(variables.fileId), response);
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
    },
  });
}

/**
 * Hook to delete a file
 */
export function useFileDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      return deleteFile(fileId);
    },
    onSuccess: (_, fileId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: fileKeys.detail(fileId) });
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
    },
  });
}

/**
 * Hook to download a file
 */
export function useFileDownload() {
  return useMutation({
    mutationFn: async (fileId: string) => {
      return downloadFile(fileId);
    },
  });
}

/**
 * Hook to get file preview/thumbnail
 * Note: This is a helper hook. For actual preview, use getFilePreview directly
 * or create a custom query with the fileId
 */
export function useFilePreview(
  fileId: string | null,
  params?: {
    width?: number;
    height?: number;
    quality?: number;
  }
) {
  return useQuery({
    queryKey: ["files", "preview", fileId, params],
    queryFn: async () => {
      if (!fileId) {
        throw new Error("File ID is required");
      }
      return getFilePreview(fileId, params);
    },
    enabled: !!fileId,
    staleTime: 1000 * 60 * 5, // 5 minutes (previews don't change often)
  });
}

/**
 * Hook to get file content (for text-based previews)
 */
export function useFileContent(fileId: string | null) {
  return useQuery({
    queryKey: ["files", "content", fileId],
    queryFn: async () => {
      if (!fileId) {
        throw new Error("File ID is required");
      }
      return getFileContent(fileId);
    },
    enabled: !!fileId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to list file versions
 */
export function useFileVersions(fileId: string | null) {
  const {
    data: response,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: fileKeys.versions(fileId || ""),
    queryFn: () => {
      if (!fileId) {
        throw new Error("File ID is required");
      }
      return listFileVersions(fileId);
    },
    enabled: !!fileId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    versions: response?.data || [],
    loading,
    error: error,
    refresh: () => refetch(),
  };
}

/**
 * Hook to create file version
 */
export function useFileVersionCreate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      file,
      changeDescription,
      onProgress,
    }: {
      fileId: string;
      file: File | Blob;
      changeDescription?: string | null;
      onProgress?: (progress: number) => void;
    }) => {
      return createFileVersion(fileId, file, {
        change_description: changeDescription,
        onProgress,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate versions list
      queryClient.invalidateQueries({
        queryKey: fileKeys.versions(variables.fileId),
      });
      // Invalidate file detail
      queryClient.invalidateQueries({
        queryKey: fileKeys.detail(variables.fileId),
      });
    },
  });
}

/**
 * Hook to download file version
 */
export function useFileVersionDownload() {
  return useMutation({
    mutationFn: async ({
      fileId,
      versionId,
    }: {
      fileId: string;
      versionId: string;
    }) => {
      return downloadFileVersion(fileId, versionId);
    },
  });
}

/**
 * Hook to restore file version
 */
export function useFileVersionRestore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      versionId,
      changeDescription,
    }: {
      fileId: string;
      versionId: string;
      changeDescription?: string | null;
    }) => {
      return restoreFileVersion(fileId, versionId, changeDescription);
    },
    onSuccess: (_, variables) => {
      // Invalidate versions list
      queryClient.invalidateQueries({
        queryKey: fileKeys.versions(variables.fileId),
      });
      // Invalidate file detail
      queryClient.invalidateQueries({
        queryKey: fileKeys.detail(variables.fileId),
      });
    },
  });
}

/**
 * Hook to update file permissions
 */
export function useFilePermissionsUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      permissions,
    }: {
      fileId: string;
      permissions: FilePermissionRequest[];
    }) => {
      return updateFilePermissions(fileId, permissions);
    },
    onSuccess: (_, variables) => {
      // Invalidate file detail to refetch permissions
      queryClient.invalidateQueries({
        queryKey: fileKeys.detail(variables.fileId),
      });
    },
  });
}
