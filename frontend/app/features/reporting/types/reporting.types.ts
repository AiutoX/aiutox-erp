/**
 * Reporting types for AiutoX ERP
 * Matches the real backend contract: backend/app/schemas/reporting.py,
 * backend/app/core/reporting/models.py, backend/app/core/reporting/contracts.yaml
 */

// Visualization types supported by the backend rendering engine
export type VisualizationType = "table" | "chart" | "kpi";

// Report definition (matches ReportDefinitionResponse)
export interface Report {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  data_source_type: string;
  filters: Record<string, unknown> | null;
  visualization_type: VisualizationType;
  config: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Report creation payload (matches ReportDefinitionCreate)
export interface ReportCreate {
  name: string;
  description?: string;
  data_source_type: string;
  visualization_type: VisualizationType;
  filters?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

// Report update payload (matches ReportDefinitionUpdate)
export interface ReportUpdate {
  name?: string;
  description?: string;
  filters?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

// Report execution request (matches ReportExecutionRequest)
export interface ReportExecutionRequest {
  filters?: Record<string, unknown>;
  pagination?: { skip?: number; limit?: number };
}

// Report execution response (matches ReportExecutionResponse)
export interface ReportExecutionResult {
  data: Record<string, unknown>[];
  total: number;
  visualization: Record<string, unknown>;
  columns: Record<string, unknown>[];
}

// Data source types — matches actual API response from /reporting/data-sources
export interface DataSource {
  type: string;
  name: string;
  module?: string;
  description?: string;
  fields?: DataSourceField[];
}

// Data source field
export interface DataSourceField {
  name: string;
  type: FieldType;
  label: string;
  description?: string;
  required?: boolean;
  filterable?: boolean;
}

// Field types
export type FieldType =
  | "string"
  | "number"
  | "decimal"
  | "integer"
  | "boolean"
  | "date"
  | "datetime"
  | "uuid"
  | "json";

// Report list parameters — backend only supports pagination (GET /reporting/reports)
export interface ReportListParams {
  page?: number;
  page_size?: number;
}
