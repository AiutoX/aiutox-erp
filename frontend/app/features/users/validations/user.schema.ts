/**
 * Zod schemas for user validation
 *
 * Aligned with backend schemas in app/schemas/user.py
 */

import { z } from "zod";

/**
 * i18n key of the message shown under a required field left empty
 * (phase 250 walkthrough, RUTA-48). The form resolves it with t().
 */
export const REQUIRED_FIELD_MESSAGE = "users.validation.required";

const requiredString = z
  .string({
    required_error: REQUIRED_FIELD_MESSAGE,
    invalid_type_error: REQUIRED_FIELD_MESSAGE,
  })
  .trim()
  .min(1, REQUIRED_FIELD_MESSAGE);

/**
 * Schema for creating a user
 */
export const userCreateSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  tenant_id: z.string().uuid("ID de tenant inválido"),
  first_name: requiredString,
  last_name: requiredString,
  middle_name: z.string().optional().nullable(),
  date_of_birth: requiredString, // ISO date string
  gender: requiredString,
  nationality: z.string().length(2).optional().nullable(), // ISO 3166-1 alpha-2
  marital_status: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  employee_id: z.string().optional().nullable(),
  preferred_language: z.string().default("es"),
  timezone: requiredString,
  avatar_url: z.string().url().optional().nullable().or(z.literal("")),
  bio: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const nationalityRule = {
  check: (data: { nationality?: string | null }) =>
    !data.nationality ||
    data.nationality === "" ||
    data.nationality.length === 2,
  options: {
    message:
      "La nacionalidad debe ser un código de 2 letras (ISO 3166-1 alpha-2) o estar vacía",
    path: ["nationality"],
  },
};

const userUpdateFields = z.object({
  email: z.string().email("Email inválido").optional(),
  first_name: requiredString,
  last_name: requiredString,
  middle_name: z.string().optional().nullable(),
  full_name: z.string().optional().nullable(),
  date_of_birth: requiredString,
  gender: requiredString,
  nationality: z.string().length(2).optional().nullable().or(z.literal("")),
  marital_status: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  employee_id: z.string().optional().nullable(),
  preferred_language: z.string().optional().nullable(),
  timezone: requiredString,
  avatar_url: z.string().url().optional().nullable().or(z.literal("")),
  bio: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().optional().nullable(),
  two_factor_enabled: z.boolean().optional().nullable(),
});

/**
 * Schema for updating a user (an administrator editing someone)
 */
export const userUpdateSchema = userUpdateFields.refine(
  nationalityRule.check,
  nationalityRule.options
);

/**
 * Schema for a user editing their own profile: the name fields are not
 * shown on that form, so they are not demanded there.
 */
export const userSelfEditSchema = userUpdateFields
  .extend({
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
  })
  .refine(nationalityRule.check, nationalityRule.options);

export type UserCreateFormData = z.infer<typeof userCreateSchema>;
export type UserUpdateFormData = z.infer<typeof userUpdateSchema>;
