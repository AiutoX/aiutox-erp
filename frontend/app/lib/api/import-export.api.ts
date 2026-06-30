/**
 * API services for import/export endpoints
 */

import apiClient from "./client";
import type {
  StandardResponse,
  StandardListResponse,
} from "./types/common.types";

// Import Job types
export interface ImportJobCreate {
  module: string;
  file_name: string;
  template_id?: string;
  mapping?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface ImportJobResponse {
  id: string;
  tenant_id: string;
  module: string;
  file_name: string;
  file_path: string | null;
  file_size: number | null;
  status: string;
  progress: number;
  total_rows: number | null;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  errors: Array<Record<string, unknown>> | null;
  warnings: Array<Record<string, unknown>> | null;
  result_summary: Record<string, unknown> | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Export Job types
export interface ExportJobCreate {
  module: string;
  export_format: "csv" | "excel" | "json";
  filters?: Record<string, unknown>;
  columns?: string[];
  options?: Record<string, unknown>;
}

export interface ExportJobResponse {
  id: string;
  tenant_id: string;
  module: string;
  export_format: string;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  status: string;
  total_rows: number | null;
  exported_rows: number;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Import Template types
export interface ImportTemplateResponse {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  module: string;
  field_mapping: Record<string, unknown>;
  default_values: Record<string, unknown> | null;
  validation_rules: Record<string, unknown> | null;
  transformations: Record<string, unknown> | null;
  skip_header: boolean;
  delimiter: string;
  encoding: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create an import job
 * POST /api/v1/import-export/import/jobs
 */
export async function createImportJob(
  data: ImportJobCreate
): Promise<StandardResponse<ImportJobResponse>> {
  const response = await apiClient.post<StandardResponse<ImportJobResponse>>(
    "/import-export/import/jobs",
    data
  );
  return response.data;
}

/**
 * List import jobs
 * GET /api/v1/import-export/import/jobs
 */
export async function listImportJobs(params?: {
  module?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<StandardListResponse<ImportJobResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.module) queryParams.append("module", params.module);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.page_size)
    queryParams.append("page_size", params.page_size.toString());

  const url = `/import-export/import/jobs${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response =
    await apiClient.get<StandardListResponse<ImportJobResponse>>(url);
  return response.data;
}

/**
 * Get an import job by ID
 * GET /api/v1/import-export/import/jobs/{job_id}
 */
export async function getImportJob(
  jobId: string
): Promise<StandardResponse<ImportJobResponse>> {
  const response = await apiClient.get<StandardResponse<ImportJobResponse>>(
    `/import-export/import/jobs/${jobId}`
  );
  return response.data;
}

/**
 * Create an export job
 * POST /api/v1/import-export/export/jobs
 */
export async function createExportJob(
  data: ExportJobCreate
): Promise<StandardResponse<ExportJobResponse>> {
  const response = await apiClient.post<StandardResponse<ExportJobResponse>>(
    "/import-export/export/jobs",
    data
  );
  return response.data;
}

/**
 * List export jobs
 * GET /api/v1/import-export/export/jobs
 */
export async function listExportJobs(params?: {
  module?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<StandardListResponse<ExportJobResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.module) queryParams.append("module", params.module);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.page_size)
    queryParams.append("page_size", params.page_size.toString());

  const url = `/import-export/export/jobs${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response =
    await apiClient.get<StandardListResponse<ExportJobResponse>>(url);
  return response.data;
}

/**
 * Get an export job by ID
 * GET /api/v1/import-export/export/jobs/{job_id}
 */
export async function getExportJob(
  jobId: string
): Promise<StandardResponse<ExportJobResponse>> {
  const response = await apiClient.get<StandardResponse<ExportJobResponse>>(
    `/import-export/export/jobs/${jobId}`
  );
  return response.data;
}

/**
 * List import templates
 * GET /api/v1/import-export/import/templates
 */
export async function listImportTemplates(params?: {
  module?: string;
  page?: number;
  page_size?: number;
}): Promise<StandardListResponse<ImportTemplateResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.module) queryParams.append("module", params.module);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.page_size)
    queryParams.append("page_size", params.page_size.toString());

  const url = `/import-export/import/templates${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response =
    await apiClient.get<StandardListResponse<ImportTemplateResponse>>(url);
  return response.data;
}
