/**
 * Reporting types for AiutoX ERP
 * Based on docs/40-modules/reporting.md
 */

// Report definition types
export interface Report {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  module: string;
  data_source: string;
  query: ReportQuery;
  visualizations: ReportVisualization[];
  parameters: ReportParameters;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Report creation payload
export interface ReportCreate {
  name: string;
  description: string;
  module: string;
  data_source: string;
  query: ReportQuery;
  visualizations: ReportVisualization[];
  parameters: ReportParameters;
  is_active?: boolean;
}

// Report update payload
export interface ReportUpdate {
  name?: string;
  description?: string;
  query?: ReportQuery;
  visualizations?: ReportVisualization[];
  parameters?: ReportParameters;
  is_active?: boolean;
}

// Report query structure
export interface ReportQuery {
  filters?: Record<string, FilterCondition>;
  group_by?: string[];
  aggregations?: Record<string, AggregationType>;
  order_by?: OrderByClause[];
  limit?: number;
  offset?: number;
}

// Filter condition
export interface FilterCondition {
  operator: FilterOperator;
  value: FilterValue;
}

// Filter operators
export type FilterOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_equal"
  | "less_equal"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "in"
  | "not_in"
  | "between"
  | "is_null"
  | "is_not_null";

// Filter value types
export type FilterValue =
  | string
  | number
  | boolean
  | Date
  | [FilterValue, FilterValue] // for between operator
  | FilterValue[]; // for in/not_in operators

// Aggregation types
export type AggregationType =
  | "sum"
  | "avg"
  | "count"
  | "min"
  | "max"
  | "distinct_count";

// Order by clause
export interface OrderByClause {
  field: string;
  direction: "asc" | "desc";
}

// Report visualization types
export interface ReportVisualization {
  type: VisualizationType;
  title?: string;
  config: VisualizationConfig;
}

// Visualization types
export type VisualizationType = "table" | "chart" | "metrics" | "dashboard";

// Visualization configuration
export type VisualizationConfig =
  | TableConfig
  | ChartConfig
  | MetricsConfig
  | DashboardConfig;

// Table configuration
export interface TableConfig {
  columns: string[];
  pagination?: {
    page_size: number;
  };
  sortable?: boolean;
  filterable?: boolean;
}

// Chart configuration
export interface ChartConfig {
  chart_type: ChartType;
  x_axis?: string;
  y_axis?: string | string[];
  label_field?: string;
  value_field?: string;
  colors?: string[];
  title?: string;
  legend?: boolean;
}

// Chart types
export type ChartType = "bar" | "line" | "pie" | "area" | "scatter" | "donut";

// Metrics configuration
export interface MetricsConfig {
  metrics: MetricDefinition[];
}

// Metric definition
export interface MetricDefinition {
  label: string;
  value: string;
  format?: MetricFormat;
  color?: string;
  icon?: string;
}

// Metric formats
export type MetricFormat =
  | "number"
  | "currency"
  | "percentage"
  | "date"
  | "duration";

// Dashboard configuration
export interface DashboardConfig {
  layout: DashboardLayout;
  widgets: DashboardWidget[];
}

// Dashboard layout
export interface DashboardLayout {
  rows: number;
  cols: number;
  gap?: number;
}

// Dashboard widget
export interface DashboardWidget {
  id: string;
  type: VisualizationType;
  title: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config: VisualizationConfig;
}

// Report parameters
export interface ReportParameters {
  [key: string]: ParameterDefinition;
}

// Parameter definition
export interface ParameterDefinition {
  type: ParameterType;
  required: boolean;
  default?: ParameterValue;
  options?: ParameterOption[];
  validation?: ParameterValidation;
}

// Parameter types
export type ParameterType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "date_range"
  | "select"
  | "multiselect";

// Parameter value
export type ParameterValue =
  | string
  | number
  | boolean
  | Date
  | [Date, Date] // date range
  | string[]; // multiselect

// Parameter option
export interface ParameterOption {
  label: string;
  value: ParameterValue;
}

// Parameter validation
export interface ParameterValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

// Report execution
export interface ReportExecution {
  id: string;
  report_id: string;
  tenant_id: string;
  user_id: string;
  parameters: ParameterValues;
  status: ExecutionStatus;
  result?: ReportResult;
  error?: string;
  created_at: string;
  completed_at?: string;
}

// Parameter values
export interface ParameterValues {
  [key: string]: ParameterValue;
}

// Execution status
export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

// Report result
export interface ReportResult {
  data: unknown[];
  visualizations: RenderedVisualization[];
  metadata: ResultMetadata;
}

// Rendered visualization
export interface RenderedVisualization {
  type: VisualizationType;
  data: unknown;
  config: VisualizationConfig;
}

// Result metadata
export interface ResultMetadata {
  total_rows: number;
  execution_time: number;
  cached: boolean;
  generated_at: string;
}

// Data source types
export interface DataSource {
  name: string;
  module: string;
  description: string;
  fields: DataSourceField[];
  capabilities: DataSourceCapabilities;
}

// Data source field
export interface DataSourceField {
  name: string;
  type: FieldType;
  label: string;
  description?: string;
  required?: boolean;
  filterable?: boolean;
  aggregatable?: boolean;
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

// Data source capabilities
export interface DataSourceCapabilities {
  filters: boolean;
  aggregations: boolean;
  grouping: boolean;
  sorting: boolean;
  pagination: boolean;
  real_time: boolean;
}

// Report export parameters
export interface ReportExportParams {
  format: ExportFormat;
  parameters?: ParameterValues;
  options?: ExportOptions;
}

// Export formats
export type ExportFormat = "pdf" | "excel" | "csv" | "json";

// Export options
export interface ExportOptions {
  include_visualizations?: boolean;
  page_size?: number;
  orientation?: "portrait" | "landscape";
  template?: string;
}

// Report list parameters
export interface ReportListParams {
  page?: number;
  page_size?: number;
  module?: string;
  data_source?: string;
  is_active?: boolean;
  search?: string;
  start_date?: string;
  end_date?: string;
}

// Report statistics
export interface ReportStats {
  total_reports: number;
  active_reports: number;
  executions_today: number;
  executions_this_month: number;
  popular_reports: ReportUsage[];
}

// Report usage
export interface ReportUsage {
  report_id: string;
  report_name: string;
  executions: number;
  last_executed: string;
}
