/**
 * React hooks for folder management
 *
 * Provides CRUD operations and state management for folders
 * using React Query for intelligent caching and state management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFolders,
  getFolderTree,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
  type FolderCreate,
  type FolderUpdate,
} from "../api/folders.api";

// Query keys for React Query
export const folderKeys = {
  all: ["folders"] as const,
  lists: () => [...folderKeys.all, "list"] as const,
  list: (params?: {
    parent_id?: string | null;
    entity_type?: string | null;
    entity_id?: string | null;
  }) => [...folderKeys.lists(), params] as const,
  tree: (params?: {
    parent_id?: string | null;
    entity_type?: string | null;
    entity_id?: string | null;
  }) => [...folderKeys.all, "tree", params] as const,
  details: () => [...folderKeys.all, "detail"] as const,
  detail: (id: string) => [...folderKeys.details(), id] as const,
};

/**
 * Hook to list folders
 */
export function useFolders(params?: {
  parent_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
}) {
  const {
    data: response,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: folderKeys.list(params),
    queryFn: () => listFolders(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    folders: response?.data || [],
    loading,
    error: error,
    refresh: () => refetch(),
  };
}

/**
 * Hook to get folder tree
 */
export function useFolderTree(params?: {
  parent_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
}) {
  const {
    data: response,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: folderKeys.tree(params),
    queryFn: () => getFolderTree(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1, // Only retry once
    retryOnMount: false, // Don't retry on mount if already failed
  });

  return {
    tree: response?.data || [],
    loading,
    error: error,
    refresh: () => refetch(),
  };
}

/**
 * Hook to get a single folder by ID
 */
export function useFolder(folderId: string | null) {
  const {
    data: response,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: folderKeys.detail(folderId || ""),
    queryFn: () => {
      if (!folderId) {
        throw new Error("Folder ID is required");
      }
      return getFolder(folderId);
    },
    enabled: !!folderId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    folder: response?.data || null,
    loading,
    error: error,
    refresh: () => refetch(),
  };
}

/**
 * Hook to create a folder
 */
export function useFolderCreate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FolderCreate) => {
      return createFolder(data);
    },
    onSuccess: () => {
      // Invalidate folders list and tree to refetch
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [folderKeys.all[0], "tree"] });
    },
  });
}

/**
 * Hook to update a folder
 */
export function useFolderUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      folderId,
      data,
    }: {
      folderId: string;
      data: FolderUpdate;
    }) => {
      return updateFolder(folderId, data);
    },
    onSuccess: (response, variables) => {
      // Update cache for specific folder
      queryClient.setQueryData(folderKeys.detail(variables.folderId), response);
      // Invalidate lists and tree to refetch
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [folderKeys.all[0], "tree"] });
    },
  });
}

/**
 * Hook to delete a folder
 */
export function useFolderDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderId: string) => {
      return deleteFolder(folderId);
    },
    onSuccess: (_, folderId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: folderKeys.detail(folderId) });
      // Invalidate lists and tree to refetch
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [folderKeys.all[0], "tree"] });
    },
  });
}
