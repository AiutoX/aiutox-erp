/**
 * Hook for managing templates
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { templatesAPI } from "../api/templates.api";
import type {
  TemplateCreate,
  TemplateUpdate,
  TemplateRenderRequest,
} from "../types/template.types";

const TEMPLATES_QUERY_KEY = ["templates"];

export const useTemplates = (params?: {
  category?: string;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: [TEMPLATES_QUERY_KEY, params],
    queryFn: () => templatesAPI.list(params),
  });
};

export const useTemplate = (templateId: string) => {
  return useQuery({
    queryKey: [TEMPLATES_QUERY_KEY, templateId],
    queryFn: () => templatesAPI.get(templateId),
    enabled: !!templateId,
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TemplateCreate) => templatesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
    },
  });
};

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: string;
      data: TemplateUpdate;
    }) => templatesAPI.update(templateId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [TEMPLATES_QUERY_KEY, variables.templateId],
      });
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => templatesAPI.delete(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
    },
  });
};

export const useRenderTemplate = () => {
  return useMutation({
    mutationFn: ({
      templateId,
      request,
    }: {
      templateId: string;
      request: TemplateRenderRequest;
    }) => templatesAPI.render(templateId, request),
  });
};

export const useRenderHistory = (
  templateId: string,
  params?: { skip?: number; limit?: number }
) => {
  return useQuery({
    queryKey: [TEMPLATES_QUERY_KEY, templateId, "renders", params],
    queryFn: () => templatesAPI.getRenderHistory(templateId, params),
    enabled: !!templateId,
  });
};
