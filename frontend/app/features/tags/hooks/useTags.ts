/**
 * React Query hooks for Tags
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
  type TagCreate,
  type TagUpdate,
} from "../api/tags.api";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";

/**
 * Query key factory for tags
 */
export const tagKeys = {
  all: ["tags"] as const,
  lists: () => [...tagKeys.all, "list"] as const,
  list: (params?: { category_id?: string | null; search?: string | null }) =>
    [...tagKeys.lists(), params] as const,
  details: () => [...tagKeys.all, "detail"] as const,
  detail: (id: string) => [...tagKeys.details(), id] as const,
};

/**
 * Hook to list tags
 */
export function useTags(params?: {
  category_id?: string | null;
  search?: string | null;
}) {
  return useQuery({
    queryKey: tagKeys.list(params),
    queryFn: () => listTags(params),
    select: (data) => data.data || [],
  });
}

/**
 * Hook to get a single tag
 */
export function useTag(tagId: string | null) {
  return useQuery({
    queryKey: tagKeys.detail(tagId!),
    queryFn: () => getTag(tagId!),
    enabled: !!tagId,
    select: (data) => data.data,
  });
}

/**
 * Hook to create a tag
 */
export function useCreateTag() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (tagData: TagCreate) => createTag(tagData),
    onSuccess: (_data) => {
      // Invalidate tags list
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      showToast(
        t("tags.createSuccess") || "Tag created successfully",
        "success"
      );
    },
    onError: (error: Error) => {
      showToast(
        t("tags.createError") || `Error creating tag: ${error.message}`,
        "error"
      );
    },
  });
}

/**
 * Hook to update a tag
 */
export function useUpdateTag() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ tagId, tagData }: { tagId: string; tagData: TagUpdate }) =>
      updateTag(tagId, tagData),
    onSuccess: (_data, variables) => {
      // Invalidate tags list and detail
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: tagKeys.detail(variables.tagId),
      });
      showToast(
        t("tags.updateSuccess") || "Tag updated successfully",
        "success"
      );
    },
    onError: (error: Error) => {
      showToast(
        t("tags.updateError") || `Error updating tag: ${error.message}`,
        "error"
      );
    },
  });
}

/**
 * Hook to delete a tag
 */
export function useDeleteTag() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (tagId: string) => deleteTag(tagId),
    onSuccess: () => {
      // Invalidate tags list
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      showToast(
        t("tags.deleteSuccess") || "Tag deleted successfully",
        "success"
      );
    },
    onError: (error: Error) => {
      showToast(
        t("tags.deleteError") || `Error deleting tag: ${error.message}`,
        "error"
      );
    },
  });
}
