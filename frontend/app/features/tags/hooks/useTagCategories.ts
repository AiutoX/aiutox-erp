/**
 * React Query hooks for Tag Categories
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTagCategories,
  getTagCategory,
  createTagCategory,
  updateTagCategory,
  deleteTagCategory,
  type TagCategoryCreate,
  type TagCategoryUpdate,
} from "../api/tags.api";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";

/**
 * Query key factory for tag categories
 */
export const tagCategoryKeys = {
  all: ["tagCategories"] as const,
  lists: () => [...tagCategoryKeys.all, "list"] as const,
  list: () => [...tagCategoryKeys.lists()] as const,
  details: () => [...tagCategoryKeys.all, "detail"] as const,
  detail: (id: string) => [...tagCategoryKeys.details(), id] as const,
};

/**
 * Hook to list tag categories
 */
export function useTagCategories() {
  return useQuery({
    queryKey: tagCategoryKeys.list(),
    queryFn: () => listTagCategories(),
    select: (data) => data.data || [],
  });
}

/**
 * Hook to get a single tag category
 */
export function useTagCategory(categoryId: string | null) {
  return useQuery({
    queryKey: tagCategoryKeys.detail(categoryId!),
    queryFn: () => getTagCategory(categoryId!),
    enabled: !!categoryId,
    select: (data) => data.data,
  });
}

/**
 * Hook to create a tag category
 */
export function useCreateTagCategory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (categoryData: TagCategoryCreate) =>
      createTagCategory(categoryData),
    onSuccess: (_data) => {
      // Invalidate tag categories list
      queryClient.invalidateQueries({ queryKey: tagCategoryKeys.lists() });
      showToast(
        t("tags.category.createSuccess") || "Tag category created successfully",
        "success"
      );
    },
    onError: (error: Error) => {
      showToast(
        t("tags.category.createError") ||
          `Error creating tag category: ${error.message}`,
        "error"
      );
    },
  });
}

/**
 * Hook to update a tag category
 */
export function useUpdateTagCategory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      categoryId,
      categoryData,
    }: {
      categoryId: string;
      categoryData: TagCategoryUpdate;
    }) => updateTagCategory(categoryId, categoryData),
    onSuccess: (_data, variables) => {
      // Invalidate tag categories list and detail
      queryClient.invalidateQueries({ queryKey: tagCategoryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: tagCategoryKeys.detail(variables.categoryId),
      });
      showToast(
        t("tags.category.updateSuccess") || "Tag category updated successfully",
        "success"
      );
    },
    onError: (error: Error) => {
      showToast(
        t("tags.category.updateError") ||
          `Error updating tag category: ${error.message}`,
        "error"
      );
    },
  });
}

/**
 * Hook to delete a tag category
 */
export function useDeleteTagCategory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (categoryId: string) => deleteTagCategory(categoryId),
    onSuccess: () => {
      // Invalidate tag categories list
      queryClient.invalidateQueries({ queryKey: tagCategoryKeys.lists() });
      showToast(
        t("tags.category.deleteSuccess") || "Tag category deleted successfully",
        "success"
      );
    },
    onError: (error: Error) => {
      showToast(
        t("tags.category.deleteError") ||
          `Error deleting tag category: ${error.message}`,
        "error"
      );
    },
  });
}
