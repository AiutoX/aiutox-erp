import apiClient from "~/lib/api/client";
import type { StandardResponse } from "~/lib/api/types/common.types";

export interface GeneralSettings extends Record<string, unknown> {
  timezone: string;
  date_format: string;
  time_format: "12h" | "24h";
  currency: string;
  language: string;
}

export interface ModuleConfigResponse {
  module: string;
  config: Record<string, unknown>;
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
  const response =
    await apiClient.get<StandardResponse<GeneralSettings>>("/config/general");
  return response.data.data;
}

export async function updateGeneralSettings(
  values: GeneralSettings
): Promise<GeneralSettings> {
  const response = await apiClient.put<StandardResponse<GeneralSettings>>(
    "/config/general",
    values
  );
  return response.data.data;
}

export async function getThemeConfig(): Promise<ModuleConfigResponse> {
  const response =
    await apiClient.get<StandardResponse<ModuleConfigResponse>>(
      "/config/app_theme"
    );
  return response.data.data;
}

export async function setThemeConfig(
  config: Record<string, unknown>
): Promise<ModuleConfigResponse> {
  const response = await apiClient.post<StandardResponse<ModuleConfigResponse>>(
    "/config/app_theme",
    config
  );
  return response.data.data;
}

export async function updateThemeConfigProperty(
  key: string,
  value: string
): Promise<Record<string, unknown>> {
  const response = await apiClient.put<
    StandardResponse<Record<string, unknown>>
  >(`/config/app_theme/${key}`, { value });
  return response.data.data;
}
