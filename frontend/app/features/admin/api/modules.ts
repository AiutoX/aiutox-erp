import apiClient from "~/lib/api/client";
import type { StandardListResponse } from "~/lib/api/types/common.types";
import type { ModuleInfo } from "../types/modules";

export const modulesApi = {
  /**
   * List all tenant modules with their current state
   */
  async listModules(): Promise<ModuleInfo[]> {
    const response = await apiClient.get<StandardListResponse<ModuleInfo>>(
      "/api/v1/admin/modules"
    );
    // response.data is StandardListResponse<ModuleInfo> with data array
    const responseData = response.data;
    return responseData?.data || [];
  },

  /**
   * Install a module for the current tenant
   */
  async installModule(
    moduleId: string,
    version: string = "1.0.0",
    tier: "basic" | "pro" | "enterprise" = "basic"
  ): Promise<{
    module: string;
    version: string;
    tier: string;
    install_order: string[];
  }> {
    const response = await apiClient.post<{
      module: string;
      version: string;
      tier: string;
      install_order: string[];
    }>(`/api/v1/admin/modules/${moduleId}/install`, {
      version,
      tier,
    });
    return response.data;
  },

  /**
   * Disable a module (reversible)
   */
  async disableModule(moduleId: string): Promise<{
    module: string;
    state: string;
  }> {
    const response = await apiClient.post<{
      module: string;
      state: string;
    }>(`/api/v1/admin/modules/${moduleId}/disable`);
    return response.data;
  },

  /**
   * Enable a disabled module
   */
  async enableModule(moduleId: string): Promise<{
    module: string;
    state: string;
  }> {
    const response = await apiClient.post<{
      module: string;
      state: string;
    }>(`/api/v1/admin/modules/${moduleId}/enable`);
    return response.data;
  },

  /**
   * Request uninstall of a module (90-day grace period)
   */
  async uninstallRequestModule(moduleId: string): Promise<{
    module: string;
    state: string;
    grace_deadline: string | null;
  }> {
    const response = await apiClient.post<{
      module: string;
      state: string;
      grace_deadline: string | null;
    }>(`/api/v1/admin/modules/${moduleId}/uninstall-request`);
    return response.data;
  },

  /**
   * Cancel uninstall request and reactivate module
   */
  async reactivateModule(moduleId: string): Promise<{
    module: string;
    state: string;
  }> {
    const response = await apiClient.post<{
      module: string;
      state: string;
    }>(`/api/v1/admin/modules/${moduleId}/reactivate`);
    return response.data;
  },

  /**
   * Export module data to a ZIP archive (grace_period → exported)
   */
  async exportModule(moduleId: string): Promise<{
    module: string;
    state: string;
    file_id: string;
    filename: string;
    record_count: number;
  }> {
    const response = await apiClient.post<{
      module: string;
      state: string;
      file_id: string;
      filename: string;
      record_count: number;
    }>(`/api/v1/admin/modules/${moduleId}/export`);
    return response.data;
  },

  /**
   * Irreversibly delete all module data (exported → uninstalled)
   */
  async hardUninstallModule(moduleId: string): Promise<{
    module: string;
    state: string;
    deleted_records: Record<string, number>;
  }> {
    const response = await apiClient.post<{
      module: string;
      state: string;
      deleted_records: Record<string, number>;
    }>(`/api/v1/admin/modules/${moduleId}/hard-uninstall`);
    return response.data;
  },
};
