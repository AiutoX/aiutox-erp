import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "~/lib/api/client";
import { useToast } from "~/hooks/useToast";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  priority: string;
  estimated_duration: number;
  checklist_items: string[];
  tags: string[];
  category: string | null;
  created_by_id: string | null;
  tenant_id: string | null;
  is_public: boolean;
  usage_count: number;
  created_at: string;
}

export interface CreateTaskFromTemplateData {
  template_id: string;
  overrides?: {
    title?: string;
    description?: string;
    priority?: string;
    assigned_to_id?: string;
    due_date?: string;
    tags?: string[];
  };
}

export function useTemplates(options?: {
  category?: string;
  tags?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["task-templates", options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.category) params.append("category", options.category);
      if (options?.tags) params.append("tags", options.tags);
      if (options?.limit) params.append("limit", options.limit.toString());

      const response = await apiClient.get(
        `/api/v1/tasks/templates?${params.toString()}`
      );
      return response.data.data as TaskTemplate[];
    },
  });
}

export function useTemplateCategories() {
  return useQuery({
    queryKey: ["task-template-categories"],
    queryFn: async () => {
      const response = await apiClient.get(
        "/api/v1/tasks/templates/categories"
      );
      return response.data.data as string[];
    },
  });
}

export function usePopularTemplates(limit: number = 5) {
  return useQuery({
    queryKey: ["task-templates-popular", limit],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/v1/tasks/templates/popular?limit=${limit}`
      );
      return response.data.data as TaskTemplate[];
    },
  });
}

export function useCreateTaskFromTemplate() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: CreateTaskFromTemplateData) => {
      const response = await apiClient.post(
        `/api/v1/tasks/templates/${data.template_id}/create-task`,
        data.overrides || {}
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(
        t("tasks.templates.createSuccess"),
        t("tasks.templates.createSuccessDescription")
      );
    },
    onError: (error: unknown) => {
      const msg =
        error && typeof error === "object" && "response" in error
          ? (
              (error as Record<string, unknown>).response as Record<
                string,
                unknown
              >
            )?.data
            ? String(
                (
                  (error as Record<string, unknown>).response as Record<
                    string,
                    Record<string, unknown>
                  >
                ).data?.message ?? ""
              )
            : ""
          : "";
      toast.error(
        t("tasks.templates.createError"),
        msg || t("tasks.templates.createErrorDescription")
      );
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      priority?: string;
      estimated_duration?: number;
      checklist_items?: string[];
      tags?: string[];
      category?: string;
      is_public?: boolean;
    }) => {
      const response = await apiClient.post("/api/v1/tasks/templates", data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-templates"] });
      toast.success(
        t("tasks.templates.saveSuccess"),
        t("tasks.templates.saveSuccessDescription")
      );
    },
    onError: (error: unknown) => {
      const msg =
        error && typeof error === "object" && "response" in error
          ? (
              (error as Record<string, unknown>).response as Record<
                string,
                unknown
              >
            )?.data
            ? String(
                (
                  (error as Record<string, unknown>).response as Record<
                    string,
                    Record<string, unknown>
                  >
                ).data?.message ?? ""
              )
            : ""
          : "";
      toast.error(
        t("tasks.templates.saveError"),
        msg || t("tasks.templates.saveErrorDescription")
      );
    },
  });
}
