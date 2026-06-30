/**
 * Mentions module public exports.
 *
 * Provides unified access to mentions functionality:
 * - API: Mention CRUD operations and entity mentions queries
 * - Hooks: React Query hooks for data fetching and mutations
 * - Types: TypeScript interfaces for mentions
 *
 * @example
 * ```ts
 * import {
 *   useMentions,
 *   useCreateMention,
 *   useResolveMention,
 *   type Mention,
 *   type CreateMentionPayload,
 * } from '@/app/features/mentions';
 * ```
 */

// API endpoints
export * from "./api/mentions.api";

// React Query hooks
export * from "./hooks/useMentions";
export * from "./hooks/useCreateMention";

// Types
export type * from "./types/mention.types";
