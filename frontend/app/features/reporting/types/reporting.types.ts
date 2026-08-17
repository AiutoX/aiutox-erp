/**
 * Reporting types for AiutoX ERP
 * Matches the real backend contract: backend/app/schemas/reporting.py,
 * backend/app/core/reporting/models.py, backend/app/core/reporting/contracts.yaml
 */

// Visualization types supported by the backend rendering engine
export type VisualizationType = "table" | "chart" | "kpi";

// Chart types supported by ChartVisualization.render() (backend/app/core/reporting/visualizations.py)
export type ChartType = "bar" | "line" | "pie";

// Visualization config shape — matches the keys ChartVisualization/KPIVisualization
// actually read (chart_type, metric_field). x_axis/y_axis are carried through
// for future use by the renderer but not yet read by the backend.
export interface VisualizationConfig {
  chart_type?: ChartType;
  x_axis?: string;
  y_axis?: string;
  metric_field?: string;
  [key: string]: unknown;
}

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

// A single column descriptor as returned by BaseDataSource.get_columns(),
// echoed back on every execution response (backend/app/core/reporting/engine.py::execute()).
export interface ReportResultColumn {
  name: string;
  type: FieldType;
  /** English fallback. Prefer label_key — see useColumnLabel. */
  label: string;
  /** i18n key resolved frontend-side (UX-008). */
  label_key?: string | null;
}

// Report execution response (matches ReportExecutionResponse)
export interface ReportExecutionResult {
  data: Record<string, unknown>[];
  total: number;
  visualization: Record<string, unknown>;
  columns: ReportResultColumn[];
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
  /** English fallback. Prefer label_key — see useColumnLabel. */
  label: string;
  /** i18n key resolved frontend-side (UX-008). */
  label_key?: string | null;
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

// One execution history record (matches ReportExecutionHistoryResponse, REP-005)
export interface ReportExecutionHistory {
  id: string;
  report_id: string;
  tenant_id: string;
  user_id: string | null;
  row_count: number | null;
  execution_time_ms: number | null;
  status: "success" | "failed";
  error_message: string | null;
  filters_used: Record<string, unknown> | null;
  created_at: string;
}

// GET /reporting/reports/executions query params
export interface ReportExecutionHistoryParams {
  report_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}
