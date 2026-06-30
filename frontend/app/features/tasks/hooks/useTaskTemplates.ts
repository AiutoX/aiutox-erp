/**
 * Hooks for Task Templates
 * Provides React Query hooks for template operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "~/lib/api/client";
import type { TaskTemplate, TaskTemplateCreate } from "../types/task.types";

/**
 * Hook to fetch all task templates
 */
export function useTaskTemplates() {
  return useQuery({
    queryKey: ["task-templates"],
    queryFn: async () => {
      const response = await apiClient.get("/api/v1/tasks/templates");
      return response.data.data as TaskTemplate[];
    },
  });
}

/**
 * Hook to fetch a single task template by ID
 */
export function useTaskTemplate(templateId: string) {
  return useQuery({
    queryKey: ["task-template", templateId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/v1/tasks/templates/${templateId}`
      );
      return response.data.data as TaskTemplate;
    },
    enabled: !!templateId,
  });
}

/**
 * Hook to create a task from a template
 */
export function useCreateTaskFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      taskData,
    }: {
      templateId: string;
      taskData?: Partial<{
        title: string;
        description: string;
        assigned_to_id: string;
        due_date: string;
        start_at: string;
        end_at: string;
      }>;
    }) => {
      const response = await apiClient.post(
        `/api/v1/tasks/from-template/${templateId}`,
        taskData || {}
      );
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate tasks list to refetch
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    },
  });
}

/**
 * Hook to create a new template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateData: TaskTemplateCreate) => {
      const response = await apiClient.post(
        "/api/v1/tasks/templates",
        templateData
      );
      return response.data.data as TaskTemplate;
    },
    onSuccess: () => {
      // Invalidate templates list to refetch
      void queryClient.invalidateQueries({ queryKey: ["task-templates"] });
    },
  });
}

/**
 * Hook to update a template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      templateData,
    }: {
      templateId: string;
      templateData: Partial<TaskTemplateCreate>;
    }) => {
      const response = await apiClient.put(
        `/api/v1/tasks/templates/${templateId}`,
        templateData
      );
      return response.data.data as TaskTemplate;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific template and list
      void queryClient.invalidateQueries({
        queryKey: ["task-template", variables.templateId],
      });
      void queryClient.invalidateQueries({ queryKey: ["task-templates"] });
    },
  });
}

/**
 * Hook to delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiClient.delete(
        `/api/v1/tasks/templates/${templateId}`
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate templates list to refetch
      void queryClient.invalidateQueries({ queryKey: ["task-templates"] });
    },
  });
}
