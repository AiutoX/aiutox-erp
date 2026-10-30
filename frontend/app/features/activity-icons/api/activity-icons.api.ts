/**
 * Activity Icons API Client
 * API client for activity icon configuration endpoints
 */

import apiClient from "~/lib/api/client";
import type {
  ActivityIconConfig,
  ActivityIconConfigBulkUpdate,
  ActivityIconConfigCreate,
  ActivityIconConfigUpdate,
  DefaultIconConfig,
} from "../types/activity-icon.types";

export const activityIconsApi = {
  /**
   * Get all activity icon configurations for the current tenant
   */
  getIcons: async (): Promise<ActivityIconConfig[]> => {
    const response = await apiClient.get<{ data: ActivityIconConfig[] }>(
      "/activity-icons"
    );
    return response.data.data;
  },

  /**
   * Get default icon configurations
   */
  getDefaults: async (): Promise<
    Record<string, Record<string, DefaultIconConfig>>
  > => {
    const response = await apiClient.get<{
      data: Record<string, Record<string, DefaultIconConfig>>;
    }>("/activity-icons/defaults");
    return response.data.data;
  },

  /**
   * Create a new activity icon configuration
   */
  createIcon: async (
    data: ActivityIconConfigCreate
  ): Promise<ActivityIconConfig> => {
    const response = await apiClient.post<{ data: ActivityIconConfig }>(
      "/activity-icons",
      data
    );
    return response.data.data;
  },

  /**
   * Bulk update activity icon configurations
   */
  bulkUpdateIcons: async (
    data: ActivityIconConfigBulkUpdate
  ): Promise<ActivityIconConfig[]> => {
    const response = await apiClient.put<{ data: ActivityIconConfig[] }>(
      "/activity-icons/bulk",
      data
    );
    return response.data.data;
  },

  /**
   * Update a specific activity icon configuration
   */
  updateIcon: async (
    configId: string,
    data: ActivityIconConfigUpdate
  ): Promise<ActivityIconConfig> => {
    const response = await apiClient.put<{ data: ActivityIconConfig }>(
      `/activity-icons/${configId}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete an activity icon configuration
   */
  deleteIcon: async (configId: string): Promise<void> => {
    await apiClient.delete(`/activity-icons/${configId}`);
  },
};
