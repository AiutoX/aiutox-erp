/**
 * Zod schemas for user validation
 *
 * Aligned with backend schemas in app/schemas/user.py
 */

import { z } from "zod";

/**
 * Schema for creating a user
 */
export const userCreateSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  tenant_id: z.string().uuid("ID de tenant inválido"),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  middle_name: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(), // ISO date string
  gender: z.string().optional().nullable(),
  nationality: z.string().length(2).optional().nullable(), // ISO 3166-1 alpha-2
  marital_status: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  employee_id: z.string().optional().nullable(),
  preferred_language: z.string().default("es"),
  timezone: z.string().optional().nullable(),
  avatar_url: z.string().url().optional().nullable().or(z.literal("")),
  bio: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * Schema for updating a user
 */
export const userUpdateSchema = z
  .object({
    email: z.string().email("Email inválido").optional(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    middle_name: z.string().optional().nullable(),
    full_name: z.string().optional().nullable(),
    date_of_birth: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    nationality: z.string().length(2).optional().nullable().or(z.literal("")),
    marital_status: z.string().optional().nullable(),
    job_title: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    employee_id: z.string().optional().nullable(),
    preferred_language: z.string().optional().nullable(),
    timezone: z.string().optional().nullable(),
    avatar_url: z.string().url().optional().nullable().or(z.literal("")),
    bio: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    is_active: z.boolean().optional().nullable(),
    two_factor_enabled: z.boolean().optional().nullable(),
  })
  .refine(
    (data) =>
      !data.nationality ||
      data.nationality === "" ||
      data.nationality.length === 2,
    {
      message:
        "La nacionalidad debe ser un código de 2 letras (ISO 3166-1 alpha-2) o estar vacía",
      path: ["nationality"],
    }
  );

export type UserCreateFormData = z.infer<typeof userCreateSchema>;
export type UserUpdateFormData = z.infer<typeof userUpdateSchema>;
