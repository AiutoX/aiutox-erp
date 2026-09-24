/**
 * Webhooks API client for Tasks module
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  WebhookCreate,
  WebhookUpdate,
  Webhook,
  WebhookTestResponse,
  WebhookEventRegistry,
} from "../types/webhook.types";

const WEBHOOKS_BASE_URL = "/integrations/webhooks";

export const webhooksApi = {
  /**
   * Get all webhooks for current tenant
   */
  getWebhooks: async (): Promise<StandardListResponse<Webhook>> => {
    const response =
      await apiClient.get<StandardListResponse<Webhook>>(WEBHOOKS_BASE_URL);
    return response.data;
  },

  /**
   * Get webhook by ID
   */
  getWebhook: async (id: string): Promise<StandardResponse<Webhook>> => {
    const response = await apiClient.get<StandardResponse<Webhook>>(
      `${WEBHOOKS_BASE_URL}/${id}`
    );
    return response.data;
  },

  /**
   * Create new webhook
   */
  createWebhook: async (
    data: WebhookCreate
  ): Promise<StandardResponse<Webhook>> => {
    const response = await apiClient.post<StandardResponse<Webhook>>(
      WEBHOOKS_BASE_URL,
      data
    );
    return response.data;
  },

  /**
   * Update webhook
   */
  updateWebhook: async (
    id: string,
    data: WebhookUpdate
  ): Promise<StandardResponse<Webhook>> => {
    const response = await apiClient.put<StandardResponse<Webhook>>(
      `${WEBHOOKS_BASE_URL}/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete webhook
   */
  deleteWebhook: async (id: string): Promise<StandardResponse<null>> => {
    const response = await apiClient.delete<StandardResponse<null>>(
      `${WEBHOOKS_BASE_URL}/${id}`
    );
    return response.data;
  },

  /**
   * Test webhook
   */
  testWebhook: async (
    id: string
  ): Promise<StandardResponse<WebhookTestResponse>> => {
    const response = await apiClient.post<
      StandardResponse<WebhookTestResponse>
    >(`${WEBHOOKS_BASE_URL}/${id}/test`);
    return response.data;
  },

  /**
   * Toggle webhook enabled status
   */
  toggleWebhook: async (
    id: string,
    enabled: boolean
  ): Promise<StandardResponse<Webhook>> => {
    const response = await apiClient.patch<StandardResponse<Webhook>>(
      `${WEBHOOKS_BASE_URL}/${id}`,
      { enabled }
    );
    return response.data;
  },

  /**
   * Get available webhook events from all active modules
   */
  getAvailableEvents: async (): Promise<
    StandardResponse<WebhookEventRegistry>
  > => {
    const response = await apiClient.get<
      StandardResponse<WebhookEventRegistry>
    >(`${WEBHOOKS_BASE_URL}/events`);
    return response.data;
  },
};
