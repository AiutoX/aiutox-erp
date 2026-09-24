/**
 * Tags module public exports.
 *
 * Provides unified access to tags functionality:
 * - API: Tag and TagCategory CRUD operations
 * - Hooks: React Query hooks for data fetching and mutations
 * - Types: TypeScript interfaces for tags
 */

// API endpoints
export * from "./api/tags.api";

// React Query hooks
export * from "./hooks/useTags";
export * from "./hooks/useTagCategories";

// Types (re-exported from API)
export type * from "./types/tag.types";
