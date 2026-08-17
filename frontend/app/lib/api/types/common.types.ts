/**
 * Common API response types
 *
 * Aligned with backend StandardResponse and StandardListResponse
 * from app/schemas/common.py
 */

/**
 * Standard API response wrapper
 * Aligned with backend StandardResponse from app/schemas/common.py
 * Success responses do NOT include a message field
 */
export interface StandardResponse<T> {
  data: T;
  meta?: Record<string, unknown> | null;
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
 * Standard list response with pagination
 * Aligned with backend StandardListResponse from app/schemas/common.py
 * Success responses do NOT include a message field
 */
export interface StandardListResponse<T> {
  data: T[];
  meta: PaginationMeta;
  error: null;
}

/**
 * Error detail schema following API contract
 */
export interface ErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
}

/**
 * Error response schema following API contract
 */
export interface ErrorResponse {
  error: ErrorDetail;
  data: null;
}

/**
 * Union type for API responses (success or error)
 */
export type ApiResponse<T> = StandardResponse<T> | ErrorResponse;
export type ApiListResponse<T> = StandardListResponse<T> | ErrorResponse;

/**
 * Date string in ISO format
 */
export type ISODate = string;

/**
 * UUID string
 */
export type UUID = string;

/**
 * JSON object type
 */
export type JSONObject = Record<string, unknown>;
