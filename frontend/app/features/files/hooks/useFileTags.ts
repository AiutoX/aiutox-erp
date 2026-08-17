/**
 * React hooks for file tags management
 *
 * Provides operations for managing tags on files
 * using React Query for intelligent caching and state management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFileTags, addFileTags, removeFileTag } from "../api/files.api";
import { fileKeys } from "./useFiles";

/**
 * Hook to get tags for a file
 */
export function useFileTags(fileId: string) {
  const {
    data: response,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...fileKeys.detail(fileId), "tags"],
    queryFn: () => getFileTags(fileId),
    enabled: !!fileId,
  });

  return {
    tags: response?.data || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to add tags to a file
 */
export function useAddFileTags(fileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagIds: string[]) => addFileTags(fileId, tagIds),
    onSuccess: () => {
      // Invalidate file tags query
      queryClient.invalidateQueries({
        queryKey: [...fileKeys.detail(fileId), "tags"],
      });
      // Invalidate file detail query to refresh tags in file object
      queryClient.invalidateQueries({
        queryKey: fileKeys.detail(fileId),
      });
      // Invalidate files list to refresh tags in list
      queryClient.invalidateQueries({
        queryKey: fileKeys.lists(),
      });
    },
  });
}

/**
 * Hook to remove a tag from a file
 */
export function useRemoveFileTag(fileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) => removeFileTag(fileId, tagId),
    onSuccess: () => {
      // Invalidate file tags query
      queryClient.invalidateQueries({
        queryKey: [...fileKeys.detail(fileId), "tags"],
      });
      // Invalidate file detail query to refresh tags in file object
      queryClient.invalidateQueries({
        queryKey: fileKeys.detail(fileId),
      });
      // Invalidate files list to refresh tags in list
      queryClient.invalidateQueries({
        queryKey: fileKeys.lists(),
      });
    },
  });
}
