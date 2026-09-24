/**
 * Zod validation schemas for Files module
 */

import { z } from "zod";

/**
 * File entity type enum
 */
export const fileEntityTypeSchema = z.enum([
  "product",
  "organization",
  "contact",
  "user",
  "order",
  "invoice",
  "activity",
  "task",
]);

/**
 * File update schema
 */
export const fileUpdateSchema = z.object({
  name: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

/**
 * File permission request schema
 */
export const filePermissionRequestSchema = z.object({
  target_type: z.enum(["user", "role", "organization"]),
  target_id: z.string().uuid(),
  can_view: z.boolean().default(true),
  can_download: z.boolean().default(true),
  can_edit: z.boolean().default(false),
  can_delete: z.boolean().default(false),
});

/**
 * File version create schema
 */
export const fileVersionCreateSchema = z.object({
  change_description: z.string().optional().nullable(),
});

/**
 * File upload schema (for validation before upload)
 */
export const fileUploadSchema = z.object({
  file: z.instanceof(File).or(z.instanceof(Blob)),
  entity_type: fileEntityTypeSchema.optional().nullable(),
  entity_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
});
