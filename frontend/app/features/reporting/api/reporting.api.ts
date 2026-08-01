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
  ReportExecutionRequest,
  ReportExecutionResult,
  DataSource,
  DataSourceField,
  ReportListParams,
} from "~/features/reporting/types/reporting.types";

// Reports API functions

/**
 * List reports with pagination
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

/**
 * Execute report and get results
 * POST /api/v1/reporting/reports/{id}/execute
 *
 * Requires: reporting.view permission
 */
export async function executeReport(
  id: string,
  request?: ReportExecutionRequest
): Promise<StandardResponse<ReportExecutionResult>> {
  const response = await apiClient.post<StandardResponse<ReportExecutionResult>>(
    `/reporting/reports/${id}/execute`,
    request ?? {}
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
  StandardResponse<DataSource[]>
> {
  const response = await apiClient.get<StandardResponse<DataSource[]>>(
    "/reporting/data-sources"
  );
  return response.data;
}

/**
 * Get available columns for a data source
 * GET /api/v1/reporting/data-sources/{source_type}/columns
 *
 * Requires: reporting.view permission
 */
export async function getDataSourceColumns(
  sourceType: string
): Promise<StandardResponse<DataSourceField[]>> {
  const response = await apiClient.get<StandardResponse<DataSourceField[]>>(
    `/reporting/data-sources/${sourceType}/columns`
  );
  return response.data;
}

/**
 * Get available filters for a data source
 * GET /api/v1/reporting/data-sources/{source_type}/filters
 *
 * Requires: reporting.view permission
 */
export async function getDataSourceFilters(
  sourceType: string
): Promise<StandardResponse<Record<string, unknown>[]>> {
  const response = await apiClient.get<StandardResponse<Record<string, unknown>[]>>(
    `/reporting/data-sources/${sourceType}/filters`
  );
  return response.data;
}
