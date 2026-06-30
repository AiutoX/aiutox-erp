/**
 * Import/Export API
 * API functions for Import/Export module
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  ImportJob,
  ImportJobCreate,
  ImportJobUpdate,
  ExportJob,
  ExportJobCreate,
  ExportJobUpdate,
  ImportTemplate,
  ImportTemplateCreate,
  ImportTemplateUpdate,
  ImportExportStats,
  ImportExportConfig,
  ImportExportValidation,
} from "../types/import-export.types";

/**
 * Import Jobs API
 */

/**
 * Create an import job
 * @param data - Import job creation data
 * @returns Promise<StandardResponse<ImportJob>>
 */
export async function createImportJob(
  data: ImportJobCreate
): Promise<StandardResponse<ImportJob>> {
  const response = await apiClient.post<StandardResponse<ImportJob>>(
    "/api/v1/import-export/import/jobs",
    data
  );
  return response.data;
}

/**
 * List import jobs
 * @param params - Query parameters
 * @returns Promise<StandardListResponse<ImportJob>>
 */
export async function listImportJobs(params?: {
  module?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<StandardListResponse<ImportJob>> {
  const queryParams = new URLSearchParams();
  if (params?.module) queryParams.append("module", params.module);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.page_size)
    queryParams.append("page_size", params.page_size.toString());

  const url = `/api/v1/import-export/import/jobs${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response = await apiClient.get<StandardListResponse<ImportJob>>(url);
  return response.data;
}

/**
 * Get an import job by ID
 * @param jobId - Import job ID
 * @returns Promise<StandardResponse<ImportJob>>
 */
export async function getImportJob(
  jobId: string
): Promise<StandardResponse<ImportJob>> {
  const response = await apiClient.get<StandardResponse<ImportJob>>(
    `/api/v1/import-export/import/jobs/${jobId}`
  );
  return response.data;
}

/**
 * Update an import job
 * @param jobId - Import job ID
 * @param data - Import job update data
 * @returns Promise<StandardResponse<ImportJob>>
 */
export async function updateImportJob(
  jobId: string,
  data: ImportJobUpdate
): Promise<StandardResponse<ImportJob>> {
  const response = await apiClient.patch<StandardResponse<ImportJob>>(
    `/api/v1/import-export/import/jobs/${jobId}`,
    data
  );
  return response.data;
}

/**
 * Delete an import job
 * @param jobId - Import job ID
 * @returns Promise<StandardResponse<void>>
 */
export async function deleteImportJob(
  jobId: string
): Promise<StandardResponse<void>> {
  const response = await apiClient.delete<StandardResponse<void>>(
    `/api/v1/import-export/import/jobs/${jobId}`
  );
  return response.data;
}

/**
 * Cancel an import job
 * @param jobId - Import job ID
 * @returns Promise<StandardResponse<ImportJob>>
 */
export async function cancelImportJob(
  jobId: string
): Promise<StandardResponse<ImportJob>> {
  const response = await apiClient.post<StandardResponse<ImportJob>>(
    `/api/v1/import-export/import/jobs/${jobId}/cancel`
  );
  return response.data;
}

/**
 * Retry an import job
 * @param jobId - Import job ID
 * @returns Promise<StandardResponse<ImportJob>>
 */
export async function retryImportJob(
  jobId: string
): Promise<StandardResponse<ImportJob>> {
  const response = await apiClient.post<StandardResponse<ImportJob>>(
    `/api/v1/import-export/import/jobs/${jobId}/retry`
  );
  return response.data;
}

/**
 * Export Jobs API
 */

/**
 * Create an export job
 * @param data - Export job creation data
 * @returns Promise<StandardResponse<ExportJob>>
 */
export async function createExportJob(
  data: ExportJobCreate
): Promise<StandardResponse<ExportJob>> {
  const response = await apiClient.post<StandardResponse<ExportJob>>(
    "/api/v1/import-export/export/jobs",
    data
  );
  return response.data;
}

/**
 * List export jobs
 * @param params - Query parameters
 * @returns Promise<StandardListResponse<ExportJob>>
 */
export async function listExportJobs(params?: {
  module?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<StandardListResponse<ExportJob>> {
  const queryParams = new URLSearchParams();
  if (params?.module) queryParams.append("module", params.module);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.page_size)
    queryParams.append("page_size", params.page_size.toString());

  const url = `/api/v1/import-export/export/jobs${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response = await apiClient.get<StandardListResponse<ExportJob>>(url);
  return response.data;
}

/**
 * Get an export job by ID
 * @param jobId - Export job ID
 * @returns Promise<StandardResponse<ExportJob>>
 */
export async function getExportJob(
  jobId: string
): Promise<StandardResponse<ExportJob>> {
  const response = await apiClient.get<StandardResponse<ExportJob>>(
    `/api/v1/import-export/export/jobs/${jobId}`
  );
  return response.data;
}

/**
 * Update an export job
 * @param jobId - Export job ID
 * @param data - Export job update data
 * @returns Promise<StandardResponse<ExportJob>>
 */
export async function updateExportJob(
  jobId: string,
  data: ExportJobUpdate
): Promise<StandardResponse<ExportJob>> {
  const response = await apiClient.patch<StandardResponse<ExportJob>>(
    `/api/v1/import-export/export/jobs/${jobId}`,
    data
  );
  return response.data;
}

/**
 * Delete an export job
 * @param jobId - Export job ID
 * @returns Promise<StandardResponse<void>>
 */
export async function deleteExportJob(
  jobId: string
): Promise<StandardResponse<void>> {
  const response = await apiClient.delete<StandardResponse<void>>(
    `/api/v1/import-export/export/jobs/${jobId}`
  );
  return response.data;
}

/**
 * Cancel an export job
 * @param jobId - Export job ID
 * @returns Promise<StandardResponse<ExportJob>>
 */
export async function cancelExportJob(
  jobId: string
): Promise<StandardResponse<ExportJob>> {
  const response = await apiClient.post<StandardResponse<ExportJob>>(
    `/api/v1/import-export/export/jobs/${jobId}/cancel`
  );
  return response.data;
}

/**
 * Download export file
 * @param jobId - Export job ID
 * @returns Promise<Blob>
 */
export async function downloadExportFile(jobId: string): Promise<Blob> {
  const response = await apiClient.get(
    `/api/v1/import-export/export/jobs/${jobId}/download`,
    {
      responseType: "blob",
    }
  );
  return response.data;
}

/**
 * Import Templates API
 */

/**
 * List import templates
 * @param params - Query parameters
 * @returns Promise<StandardListResponse<ImportTemplate>>
 */
export async function listImportTemplates(params?: {
  module?: string;
  page?: number;
  page_size?: number;
}): Promise<StandardListResponse<ImportTemplate>> {
  const queryParams = new URLSearchParams();
  if (params?.module) queryParams.append("module", params.module);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.page_size)
    queryParams.append("page_size", params.page_size.toString());

  const url = `/api/v1/import-export/import/templates${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response =
    await apiClient.get<StandardListResponse<ImportTemplate>>(url);
  return response.data;
}

/**
 * Get an import template by ID
 * @param templateId - Import template ID
 * @returns Promise<StandardResponse<ImportTemplate>>
 */
export async function getImportTemplate(
  templateId: string
): Promise<StandardResponse<ImportTemplate>> {
  const response = await apiClient.get<StandardResponse<ImportTemplate>>(
    `/api/v1/import-export/import/templates/${templateId}`
  );
  return response.data;
}

/**
 * Create an import template
 * @param data - Import template creation data
 * @returns Promise<StandardResponse<ImportTemplate>>
 */
export async function createImportTemplate(
  data: ImportTemplateCreate
): Promise<StandardResponse<ImportTemplate>> {
  const response = await apiClient.post<StandardResponse<ImportTemplate>>(
    "/api/v1/import-export/import/templates",
    data
  );
  return response.data;
}

/**
 * Update an import template
 * @param templateId - Import template ID
 * @param data - Import template update data
 * @returns Promise<StandardResponse<ImportTemplate>>
 */
export async function updateImportTemplate(
  templateId: string,
  data: ImportTemplateUpdate
): Promise<StandardResponse<ImportTemplate>> {
  const response = await apiClient.patch<StandardResponse<ImportTemplate>>(
    `/api/v1/import-export/import/templates/${templateId}`,
    data
  );
  return response.data;
}

/**
 * Delete an import template
 * @param templateId - Import template ID
 * @returns Promise<StandardResponse<void>>
 */
export async function deleteImportTemplate(
  templateId: string
): Promise<StandardResponse<void>> {
  const response = await apiClient.delete<StandardResponse<void>>(
    `/api/v1/import-export/import/templates/${templateId}`
  );
  return response.data;
}

/**
 * Statistics API
 */

/**
 * Get import/export statistics
 * @returns Promise<StandardResponse<ImportExportStats>>
 */
export async function getImportExportStats(): Promise<
  StandardResponse<ImportExportStats>
> {
  const response = await apiClient.get<StandardResponse<ImportExportStats>>(
    "/api/v1/import-export/stats"
  );
  return response.data;
}

/**
 * Configuration API
 */

/**
 * Get import/export configuration
 * @returns Promise<StandardResponse<ImportExportConfig>>
 */
export async function getImportExportConfig(): Promise<
  StandardResponse<ImportExportConfig>
> {
  const response = await apiClient.get<StandardResponse<ImportExportConfig>>(
    "/api/v1/import-export/config"
  );
  return response.data;
}

/**
 * Update import/export configuration
 * @param config - Configuration data
 * @returns Promise<StandardResponse<ImportExportConfig>>
 */
export async function updateImportExportConfig(
  config: ImportExportConfig
): Promise<StandardResponse<ImportExportConfig>> {
  const response = await apiClient.put<StandardResponse<ImportExportConfig>>(
    "/api/v1/import-export/config",
    config
  );
  return response.data;
}

/**
 * Validation API
 */

/**
 * Validate import file
 * @param file - File to validate
 * @param module - Module name
 * @param templateId - Optional template ID
 * @returns Promise<StandardResponse<ImportExportValidation>>
 */
export async function validateImportFile(
  file: File,
  module: string,
  templateId?: string
): Promise<StandardResponse<ImportExportValidation>> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("module", module);
  if (templateId) {
    formData.append("template_id", templateId);
  }

  const response = await apiClient.post<
    StandardResponse<ImportExportValidation>
  >("/api/v1/import-export/import/validate", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/**
 * Get available modules for import/export
 * @returns Promise<StandardResponse<string[]>>
 */
export async function getAvailableModules(): Promise<
  StandardResponse<string[]>
> {
  const response = await apiClient.get<StandardResponse<string[]>>(
    "/api/v1/import-export/modules"
  );
  return response.data;
}

/**
 * Get export format options for a module
 * @param module - Module name
 * @returns Promise<StandardResponse<string[]>>
 */
export async function getExportFormats(
  module: string
): Promise<StandardResponse<string[]>> {
  const response = await apiClient.get<StandardResponse<string[]>>(
    `/api/v1/import-export/export/formats?module=${module}`
  );
  return response.data;
}

/**
 * Get sample data for export
 * @param module - Module name
 * @param format - Export format
 * @param count - Number of sample records
 * @returns Promise<Blob>
 */
export async function getExportSample(
  module: string,
  format: string,
  count: number = 10
): Promise<Blob> {
  const response = await apiClient.get(
    `/api/v1/import-export/export/sample?module=${module}&format=${format}&count=${count}`,
    {
      responseType: "blob",
    }
  );
  return response.data;
}
