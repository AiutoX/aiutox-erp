/**
 * TypeScript types for SavedFilters feature.
 * Aligned with backend schemas in app/schemas/view.py
 */

import { z } from "zod";

/**
 * Supported filter operators matching backend FilterParser
 */
export type FilterOperator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "between"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "is_null"
  | "is_not_null";

/**
 * Filter condition structure
 * Example: { "email": { "operator": "contains", "value": "admin" } }
 */
export type FilterCondition = {
  operator: FilterOperator;
  value: unknown; // Can be string, number, boolean, array, or object (for between)
};

/**
 * Filter configuration as a dictionary of field names to conditions
 */
export type FilterConfig = Record<string, FilterCondition>;

/**
 * Field type for filter configuration
 */
export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "email";

/**
 * Field configuration for filter editor
 */
export interface FieldConfig {
  name: string; // Field name in the model
  label: string; // Human-readable label
  type: FieldType;
  category?: string; // For grouping fields in the editor
  operators: FilterOperator[]; // Allowed operators for this field
  options?: Array<{ value: string | number; label: string }>; // For select fields
  placeholder?: string;
  description?: string;
}

/**
 * SavedFilter base structure matching SavedFilterBase schema
 */
export interface SavedFilter {
  id: string; // UUID
  tenant_id: string; // UUID
  name: string;
  description: string | null;
  module: string;
  filters: FilterConfig;
  is_default: boolean;
  is_shared: boolean;
  created_by: string | null; // UUID
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

/**
 * SavedFilter creation payload matching SavedFilterCreate schema
 */
export interface SavedFilterCreate {
  name: string;
  description?: string | null;
  module: string;
  filters: FilterConfig;
  is_default?: boolean;
  is_shared?: boolean;
}

/**
 * SavedFilter update payload matching SavedFilterUpdate schema
 */
export interface SavedFilterUpdate {
  name?: string;
  description?: string | null;
  filters?: FilterConfig;
  is_default?: boolean;
  is_shared?: boolean;
}

/**
 * Standard API Response wrapper
 */
export interface StandardResponse<T> {
  data: T;
  meta: Record<string, unknown> | null;
  error: null;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Standard List API Response wrapper
 */
export interface StandardListResponse<T> {
  data: T[];
  meta: PaginationMeta;
  error: null;
}

/**
 * Query parameters for listing saved filters
 */
export interface SavedFiltersListParams {
  module?: string;
  is_shared?: boolean;
  page?: number;
  page_size?: number;
}

/**
 * Zod schema for validating filter conditions
 */
export const filterConditionSchema = z.object({
  operator: z.enum([
    "eq",
    "ne",
    "gt",
    "gte",
    "lt",
    "lte",
    "in",
    "not_in",
    "between",
    "contains",
    "starts_with",
    "ends_with",
    "is_null",
    "is_not_null",
  ]),
  value: z.unknown(),
});

/**
 * Zod schema for validating filter config
 */
export const filterConfigSchema = z.record(z.string(), filterConditionSchema);

/**
 * Zod schema for validating SavedFilterCreate
 */
export const savedFilterCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  module: z.string().min(1).max(50),
  filters: filterConfigSchema,
  is_default: z.boolean().optional().default(false),
  is_shared: z.boolean().optional().default(false),
});

/**
 * Zod schema for validating SavedFilterUpdate
 */
export const savedFilterUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  filters: filterConfigSchema.optional(),
  is_default: z.boolean().optional(),
  is_shared: z.boolean().optional(),
});
