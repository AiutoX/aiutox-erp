/**
 * Import/Export types
 * Type definitions for Import/Export module
 */

import type { StandardListResponse } from "~/lib/api/types/common.types";

// Import Job types
export interface ImportJob {
  id: string;
  tenant_id: string;
  module: string;
  file_name: string;
  file_path: string | null;
  file_size: number | null;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  total_rows: number | null;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  errors: Array<ImportJobError> | null;
  warnings: Array<ImportJobWarning> | null;
  result_summary: ImportJobResultSummary | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportJobCreate {
  module: string;
  file_name: string;
  template_id?: string;
  mapping?: Record<string, string>;
  options?: Record<string, unknown>;
}

export interface ImportJobUpdate {
  status?: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  processed_rows?: number;
  successful_rows?: number;
  failed_rows?: number;
  errors?: Array<ImportJobError>;
  warnings?: Array<ImportJobWarning>;
  result_summary?: ImportJobResultSummary;
}

export interface ImportJobError {
  row_number: number;
  field: string;
  value: unknown;
  message: string;
  error_code: string;
}

export interface ImportJobWarning {
  row_number: number;
  field: string;
  value: unknown;
  message: string;
  warning_code: string;
}

export interface ImportJobResultSummary {
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  skipped_rows: number;
  created_records: number;
  updated_records: number;
  processing_time_seconds: number;
}

// Export Job types
export interface ExportJob {
  id: string;
  tenant_id: string;
  module: string;
  export_format: "csv" | "excel" | "json";
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  status: "pending" | "processing" | "completed" | "failed";
  total_rows: number | null;
  exported_rows: number;
  filters: Record<string, unknown> | null;
  columns: string[] | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  error_message: string | null;
}

export interface ExportJobCreate {
  module: string;
  export_format: "csv" | "excel" | "json";
  filters?: Record<string, unknown>;
  columns?: string[];
  options?: Record<string, unknown>;
}

export interface ExportJobUpdate {
  status?: "pending" | "processing" | "completed" | "failed";
  exported_rows?: number;
  file_name?: string;
  file_path?: string;
  file_size?: number;
  error_message?: string;
}

// Import Template types
export interface ImportTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  module: string;
  field_mapping: Record<string, string>;
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

export interface ImportTemplateCreate {
  name: string;
  description?: string;
  module: string;
  field_mapping: Record<string, string>;
  default_values?: Record<string, unknown>;
  validation_rules?: Record<string, unknown>;
  transformations?: Record<string, unknown>;
  skip_header?: boolean;
  delimiter?: string;
  encoding?: string;
}

export interface ImportTemplateUpdate {
  name?: string;
  description?: string;
  field_mapping?: Record<string, string>;
  default_values?: Record<string, unknown>;
  validation_rules?: Record<string, unknown>;
  transformations?: Record<string, unknown>;
  skip_header?: boolean;
  delimiter?: string;
  encoding?: string;
}

// Import/Export Statistics
export interface ImportExportStats {
  total_import_jobs: number;
  total_export_jobs: number;
  successful_imports: number;
  failed_imports: number;
  successful_exports: number;
  failed_exports: number;
  total_records_imported: number;
  total_records_exported: number;
  average_processing_time: number;
  most_used_modules: Array<{
    module: string;
    import_count: number;
    export_count: number;
  }>;
}

// Import/Export Configuration
export interface ImportExportConfig {
  max_file_size_mb: number;
  allowed_file_types: string[];
  max_concurrent_jobs: number;
  chunk_size: number;
  timeout_seconds: number;
  retry_attempts: number;
  retry_delay_seconds: number;
  storage_path: string;
  cleanup_after_days: number;
}

// Import/Export Validation
export interface ImportExportValidation {
  file_validation: {
    max_size_mb: number;
    allowed_types: string[];
    required_headers?: string[];
  };
  field_validation: Record<
    string,
    {
      required: boolean;
      type: string;
      min_length?: number;
      max_length?: number;
      pattern?: string;
      allowed_values?: string[];
    }
  >;
  business_rules: Array<{
    name: string;
    description: string;
    condition: string;
    error_message: string;
  }>;
}

// Import/Export Operations
export interface ImportExportOperation {
  id: string;
  type: "import" | "export";
  module: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  file_name?: string;
  file_size?: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  result?: unknown;
}

// Import/Export List Responses
export type ImportJobListResponse = StandardListResponse<ImportJob>;
export type ExportJobListResponse = StandardListResponse<ExportJob>;
export type ImportTemplateListResponse = StandardListResponse<ImportTemplate>;
export type ImportExportOperationListResponse =
  StandardListResponse<ImportExportOperation>;
