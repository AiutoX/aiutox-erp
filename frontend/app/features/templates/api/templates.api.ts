/**
 * Template API client
 */

import apiClient from "~/lib/api/client";
import type {
  Template,
  TemplateCreate,
  TemplateUpdate,
  TemplateListResponse,
  TemplateRenderRequest,
  TemplateRenderResponse,
  RenderedTemplate,
} from "../types/template.types";

const BASE_PATH = "/api/v1/templates";

export const templatesAPI = {
  /**
   * List all templates
   */
  list: async (params?: {
    category?: string;
    is_active?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<TemplateListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append("category", params.category);
    if (params?.is_active !== undefined)
      queryParams.append("is_active", String(params.is_active));
    queryParams.append("skip", String(params?.skip || 0));
    queryParams.append("limit", String(params?.limit || 100));

    const response = await apiClient.get<TemplateListResponse>(
      `${BASE_PATH}?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Get a specific template
   */
  get: async (templateId: string): Promise<Template> => {
    const response = await apiClient.get<Template>(
      `${BASE_PATH}/${templateId}`
    );
    return response.data;
  },

  /**
   * Create a new template
   */
  create: async (data: TemplateCreate): Promise<Template> => {
    const response = await apiClient.post<Template>(BASE_PATH, data);
    return response.data;
  },

  /**
   * Update a template
   */
  update: async (
    templateId: string,
    data: TemplateUpdate
  ): Promise<Template> => {
    const response = await apiClient.put<Template>(
      `${BASE_PATH}/${templateId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a template
   */
  delete: async (templateId: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${templateId}`);
  },

  /**
   * Render a template
   */
  render: async (
    templateId: string,
    request: TemplateRenderRequest
  ): Promise<TemplateRenderResponse> => {
    const response = await apiClient.post<TemplateRenderResponse>(
      `${BASE_PATH}/${templateId}/render`,
      request
    );
    return response.data;
  },

  /**
   * Get render history
   */
  getRenderHistory: async (
    templateId: string,
    params?: { skip?: number; limit?: number }
  ): Promise<{ data: RenderedTemplate[]; total: number }> => {
    const queryParams = new URLSearchParams();
    queryParams.append("skip", String(params?.skip || 0));
    queryParams.append("limit", String(params?.limit || 100));

    const response = await apiClient.get<{
      data: RenderedTemplate[];
      total: number;
    }>(`${BASE_PATH}/${templateId}/renders?${queryParams.toString()}`);
    return response.data;
  },
};
