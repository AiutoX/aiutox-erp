/**
 * API services for reporting configuration: data sources, columns, and
 * per-column visibility rules (FieldPermission, REP-002 FR-7).
 */

import apiClient from "./client";
import type { StandardResponse } from "./types/common.types";

export interface ReportingDataSource {
  type: string;
  name: string;
}

export interface ReportingColumn {
  name: string;
  type: string;
  label: string;
}

export interface FieldPermission {
  id: string;
  tenant_id: string;
  dataset_type: string;
  column_name: string;
  required_permission: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FieldPermissionCreateRequest {
  dataset_type: string;
  column_name: string;
  required_permission: string;
}

/**
 * List data sources visible to the current user.
 * GET /api/v1/reporting/data-sources
 */
export async function listDataSources(): Promise<
  StandardResponse<ReportingDataSource[]>
> {
  const response = await apiClient.get<StandardResponse<ReportingDataSource[]>>(
    "/reporting/data-sources"
  );
  return response.data;
}

/**
 * List columns for a data source.
 * GET /api/v1/reporting/data-sources/{sourceType}/columns
 */
export async function listDataSourceColumns(
  sourceType: string
): Promise<StandardResponse<ReportingColumn[]>> {
  const response = await apiClient.get<StandardResponse<ReportingColumn[]>>(
    `/reporting/data-sources/${sourceType}/columns`
  );
  return response.data;
}

/**
 * List column visibility rules, optionally scoped to one dataset.
 * GET /api/v1/reporting/field-permissions
 */
export async function listFieldPermissions(
  datasetType?: string
): Promise<StandardResponse<FieldPermission[]>> {
  const query = datasetType
    ? `?dataset_type=${encodeURIComponent(datasetType)}`
    : "";
  const response = await apiClient.get<StandardResponse<FieldPermission[]>>(
    `/reporting/field-permissions${query}`
  );
  return response.data;
}

/**
 * Create a column visibility rule.
 * POST /api/v1/reporting/field-permissions
 */
export async function createFieldPermission(
  data: FieldPermissionCreateRequest
): Promise<StandardResponse<FieldPermission>> {
  const response = await apiClient.post<StandardResponse<FieldPermission>>(
    "/reporting/field-permissions",
    data
  );
  return response.data;
}

/**
 * Delete a column visibility rule.
 * DELETE /api/v1/reporting/field-permissions/{ruleId}
 */
export async function deleteFieldPermission(ruleId: string): Promise<void> {
  await apiClient.delete(`/reporting/field-permissions/${ruleId}`);
}
