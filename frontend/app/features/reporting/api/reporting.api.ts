/**
 * Reporting API functions
 * Provides API integration for reporting module
 * Following frontend-api.md rules
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  Report,
  ReportCreate,
  ReportUpdate,
  ReportExecution,
  DataSource,
  ReportListParams,
  ParameterValues,
  ReportResult,
} from "~/features/reporting/types/reporting.types";

// Reports API functions

/**
 * List reports with pagination and filters
 * GET /api/v1/reporting/reports
 *
 * Requires: reporting.view permission
 */
export async function listReports(
  params?: ReportListParams
): Promise<StandardListResponse<Report>> {
  const response = await apiClient.get<StandardListResponse<Report>>(
    "/reporting/reports",
    {
      params: {
        page: params?.page || 1,
        page_size: params?.page_size || 20,
        module: params?.module,
        data_source: params?.data_source,
        is_active: params?.is_active,
        search: params?.search,
      },
    }
  );
  return response.data;
}

/**
 * Get report by ID
 * GET /api/v1/reporting/reports/{id}
 *
 * Requires: reporting.view permission
 */
export async function getReport(id: string): Promise<StandardResponse<Report>> {
  const response = await apiClient.get<StandardResponse<Report>>(
    `/reporting/reports/${id}`
  );
  return response.data;
}

/**
 * Create new report
 * POST /api/v1/reporting/reports
 *
 * Requires: reporting.manage permission
 */
export async function createReport(
  payload: ReportCreate
): Promise<StandardResponse<Report>> {
  const response = await apiClient.post<StandardResponse<Report>>(
    "/reporting/reports",
    payload
  );
  return response.data;
}

/**
 * Update existing report
 * PUT /api/v1/reporting/reports/{id}
 *
 * Requires: reporting.manage permission
 */
export async function updateReport(
  id: string,
  payload: ReportUpdate
): Promise<StandardResponse<Report>> {
  const response = await apiClient.put<StandardResponse<Report>>(
    `/reporting/reports/${id}`,
    payload
  );
  return response.data;
}

/**
 * Delete report
 * DELETE /api/v1/reporting/reports/{id}
 *
 * Requires: reporting.manage permission
 */
export async function deleteReport(
  id: string
): Promise<StandardResponse<null>> {
  const response = await apiClient.delete<StandardResponse<null>>(
    `/reporting/reports/${id}`
  );
  return response.data;
}

// Report Execution API functions

/**
 * Execute report with parameters
 * POST /api/v1/reporting/reports/{id}/execute
 *
 * Requires: reporting.view permission
 */
export async function executeReport(
  id: string,
  parameters: ParameterValues
): Promise<StandardResponse<ReportExecution>> {
  const response = await apiClient.post<StandardResponse<ReportExecution>>(
    `/reporting/reports/${id}/execute`,
    { parameters }
  );
  return response.data;
}

/**
 * Get report data without visualizations
 * GET /api/v1/reporting/reports/{id}/data
 *
 * Requires: reporting.view permission
 */
export async function getReportData(
  id: string,
  parameters?: ParameterValues
): Promise<StandardResponse<unknown[]>> {
  const response = await apiClient.get<StandardResponse<unknown[]>>(
    `/reporting/reports/${id}/data`,
    {
      params: { parameters },
    }
  );
  return response.data;
}

/**
 * Get report execution result
 * GET /api/v1/reporting/reports/{id}/result
 *
 * Requires: reporting.view permission
 */
export async function getReportResult(
  executionId: string
): Promise<StandardResponse<ReportResult>> {
  const response = await apiClient.get<StandardResponse<ReportResult>>(
    `/reporting/executions/${executionId}/result`
  );
  return response.data;
}

/**
 * Get execution status
 * GET /api/v1/reporting/executions/{id}
 *
 * Requires: reporting.view permission
 */
export async function getExecutionStatus(
  executionId: string
): Promise<StandardResponse<ReportExecution>> {
  const response = await apiClient.get<StandardResponse<ReportExecution>>(
    `/reporting/executions/${executionId}`
  );
  return response.data;
}

// Data Sources API functions

/**
 * List available data sources
 * GET /api/v1/reporting/data-sources
 *
 * Requires: reporting.view permission
 */
export async function listDataSources(): Promise<
  StandardListResponse<DataSource>
> {
  const response = await apiClient.get<StandardListResponse<DataSource>>(
    "/reporting/data-sources"
  );
  return response.data;
}

/**
 * Get data source metadata
 * GET /api/v1/reporting/data-sources/{data_source}
 *
 * Requires: reporting.view permission
 */
export async function getDataSource(
  dataSourceName: string
): Promise<StandardResponse<DataSource>> {
  const response = await apiClient.get<StandardResponse<DataSource>>(
    `/reporting/data-sources/${dataSourceName}`
  );
  return response.data;
}

// Export API functions

/**
 * Export report to specified format
 * GET /api/v1/reporting/reports/{id}/export/{format}
 *
 * Requires: reporting.export permission
 */
export async function exportReport(
  id: string,
  format: "pdf" | "excel" | "csv" | "json",
  parameters?: ParameterValues,
  options?: Record<string, unknown>
): Promise<Blob> {
  const response = await apiClient.get(
    `/reporting/reports/${id}/export/${format}`,
    {
      params: {
        parameters,
        options,
      },
      responseType: "blob",
    }
  );
  return response.data;
}

/**
 * Export report execution result
 * GET /api/v1/reporting/executions/{executionId}/export/{format}
 *
 * Requires: reporting.export permission
 */
export async function exportExecution(
  executionId: string,
  format: "pdf" | "excel" | "csv" | "json",
  options?: Record<string, unknown>
): Promise<Blob> {
  const response = await apiClient.get(
    `/reporting/executions/${executionId}/export/${format}`,
    {
      params: { options },
      responseType: "blob",
    }
  );
  return response.data;
}

// Report Templates API functions (if available)

/**
 * List report templates
 * GET /api/v1/reporting/templates
 *
 * Requires: reporting.view permission
 */
export async function listReportTemplates(): Promise<
  StandardListResponse<Report>
> {
  const response = await apiClient.get<StandardListResponse<Report>>(
    "/reporting/templates"
  );
  return response.data;
}

/**
 * Create report from template
 * POST /api/v1/reporting/templates/{templateId}/create
 *
 * Requires: reporting.manage permission
 */
export async function createFromTemplate(
  templateId: string,
  reportData: Omit<ReportCreate, "query" | "visualizations" | "parameters">
): Promise<StandardResponse<Report>> {
  const response = await apiClient.post<StandardResponse<Report>>(
    `/reporting/templates/${templateId}/create`,
    reportData
  );
  return response.data;
}

// Report Scheduling API functions (if available)

/**
 * Schedule report execution
 * POST /api/v1/reporting/reports/{id}/schedule
 *
 * Requires: reporting.manage permission
 */
export async function scheduleReport(
  id: string,
  schedule: {
    frequency: "daily" | "weekly" | "monthly";
    time: string;
    recipients: string[];
    parameters?: ParameterValues;
  }
): Promise<StandardResponse<unknown>> {
  const response = await apiClient.post<StandardResponse<unknown>>(
    `/reporting/reports/${id}/schedule`,
    schedule
  );
  return response.data;
}

/**
 * Get report schedules
 * GET /api/v1/reporting/reports/{id}/schedules
 *
 * Requires: reporting.view permission
 */
export async function getReportSchedules(
  id: string
): Promise<StandardListResponse<unknown>> {
  const response = await apiClient.get<StandardListResponse<unknown>>(
    `/reporting/reports/${id}/schedules`
  );
  return response.data;
}

/**
 * Delete report schedule
 * DELETE /api/v1/reporting/schedules/{scheduleId}
 *
 * Requires: reporting.manage permission
 */
export async function deleteSchedule(
  scheduleId: string
): Promise<StandardResponse<null>> {
  const response = await apiClient.delete<StandardResponse<null>>(
    `/reporting/schedules/${scheduleId}`
  );
  return response.data;
}

// Report Sharing API functions (if available)

/**
 * Share report with users
 * POST /api/v1/reporting/reports/{id}/share
 *
 * Requires: reporting.manage permission
 */
export async function shareReport(
  id: string,
  sharing: {
    users: string[];
    permissions: ("view" | "execute" | "export")[];
  }
): Promise<StandardResponse<unknown>> {
  const response = await apiClient.post<StandardResponse<unknown>>(
    `/reporting/reports/${id}/share`,
    sharing
  );
  return response.data;
}

/**
 * Get report sharing settings
 * GET /api/v1/reporting/reports/{id}/sharing
 *
 * Requires: reporting.view permission
 */
export async function getReportSharing(
  id: string
): Promise<StandardResponse<unknown>> {
  const response = await apiClient.get<StandardResponse<unknown>>(
    `/reporting/reports/${id}/sharing`
  );
  return response.data;
}

/**
 * Revoke report sharing
 * DELETE /api/v1/reporting/reports/{id}/share/{userId}
 *
 * Requires: reporting.manage permission
 */
export async function revokeShare(
  id: string,
  userId: string
): Promise<StandardResponse<null>> {
  const response = await apiClient.delete<StandardResponse<null>>(
    `/reporting/reports/${id}/share/${userId}`
  );
  return response.data;
}
