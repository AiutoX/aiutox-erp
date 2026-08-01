/**
 * Field configuration for Users module filters.
 * Defines all filterable fields from the User model with their types and allowed operators.
 */

import type { FieldConfig, FilterOperator } from "../types/savedFilter.types";

/**
 * Field configuration for Users module
 * Based on backend/app/models/user.py
 */
export const userFieldsConfig: FieldConfig[] = [
  // Authentication & Basic Info
  {
    name: "email",
    label: "Email",
    type: "email",
    category: "Autenticación",
    operators: [
      "eq",
      "ne",
      "contains",
      "starts_with",
      "ends_with",
      "is_null",
      "is_not_null",
    ],
    placeholder: "ejemplo@correo.com",
    description: "Dirección de correo electrónico del usuario",
  },
  {
    name: "is_active",
    label: "Estado",
    type: "boolean",
    category: "Autenticación",
    operators: ["eq", "ne"],
    description: "Si el usuario está activo o inactivo",
  },
  {
    name: "email_verified_at",
    label: "Email Verificado",
    type: "datetime",
    category: "Autenticación",
    operators: [
      "is_null",
      "is_not_null",
      "eq",
      "ne",
      "gt",
      "gte",
      "lt",
      "lte",
      "between",
    ],
    description: "Fecha y hora de verificación del email",
  },
  {
    name: "phone_verified_at",
    label: "Teléfono Verificado",
    type: "datetime",
    category: "Autenticación",
    operators: [
      "is_null",
      "is_not_null",
      "eq",
      "ne",
      "gt",
      "gte",
      "lt",
      "lte",
      "between",
    ],
    description: "Fecha y hora de verificación del teléfono",
  },
  {
    name: "two_factor_enabled",
    label: "Autenticación de Dos Factores",
    type: "boolean",
    category: "Autenticación",
    operators: ["eq", "ne"],
    description: "Si el usuario tiene 2FA habilitado",
  },
  {
    name: "last_login_at",
    label: "Último Acceso",
    type: "datetime",
    category: "Autenticación",
    operators: [
      "is_null",
      "is_not_null",
      "eq",
      "ne",
      "gt",
      "gte",
      "lt",
      "lte",
      "between",
    ],
    description: "Fecha y hora del último inicio de sesión",
  },

  // Personal Information
  {
    name: "first_name",
    label: "Nombre",
    type: "string",
    category: "Información Personal",
    operators: [
      "eq",
      "ne",
      "contains",
      "starts_with",
      "ends_with",
      "is_null",
      "is_not_null",
    ],
    placeholder: "Juan",
    description: "Nombre del usuario",
  },
  {
    name: "last_name",
    label: "Apellido",
    type: "string",
    category: "Información Personal",
    operators: [
      "eq",
      "ne",
      "contains",
      "starts_with",
      "ends_with",
      "is_null",
      "is_not_null",
    ],
    placeholder: "Pérez",
    description: "Apellido del usuario",
  },
  {
    name: "middle_name",
    label: "Segundo Nombre",
    type: "string",
    category: "Información Personal",
    operators: [
      "eq",
      "ne",
      "contains",
      "starts_with",
      "ends_with",
      "is_null",
      "is_not_null",
    ],
    placeholder: "Carlos",
    description: "Segundo nombre del usuario",
  },
  {
    name: "full_name",
    label: "Nombre Completo",
    type: "string",
    category: "Información Personal",
    operators: [
      "eq",
      "ne",
      "contains",
      "starts_with",
      "ends_with",
      "is_null",
      "is_not_null",
    ],
    placeholder: "Juan Carlos Pérez",
    description: "Nombre completo del usuario",
  },
  {
    name: "date_of_birth",
    label: "Fecha de Nacimiento",
    type: "date",
    category: "Información Personal",
    operators: [
      "eq",
      "ne",
      "gt",
      "gte",
      "lt",
      "lte",
      "between",
      "is_null",
      "is_not_null",
    ],
    description: "Fecha de nacimiento del usuario",
  },
  {
    name: "gender",
    label: "Género",
    type: "select",
    category: "Información Personal",
    operators: ["eq", "ne", "in", "not_in"],
    options: [
      { value: "male", label: "Masculino" },
      { value: "female", label: "Femenino" },
      { value: "other", label: "Otro" },
      { value: "prefer_not_to_say", label: "Prefiero no decir" },
    ],
    description: "Género del usuario",
  },
  {
    name: "nationality",
    label: "Nacionalidad",
    type: "string",
    category: "Información Personal",
    operators: ["eq", "ne", "in", "not_in", "is_null", "is_not_null"],
    placeholder: "CO",
    description: "Código ISO 3166-1 alpha-2 de nacionalidad",
  },
  {
    name: "marital_status",
    label: "Estado Civil",
    type: "select",
    category: "Información Personal",
    operators: ["eq", "ne", "in", "not_in", "is_null", "is_not_null"],
    options: [
      { value: "single", label: "Soltero/a" },
      { value: "married", label: "Casado/a" },
      { value: "divorced", label: "Divorciado/a" },
      { value: "widowed", label: "Viudo/a" },
      { value: "domestic_partnership", label: "Unión libre" },
    ],
    description: "Estado civil del usuario",
  },

  // Professional Information
  {
    name: "job_title",
    label: "Cargo",
    type: "string",
    category: "Información Laboral",
    operators: [
      "eq",
      "ne",
      "contains",
      "starts_with",
      "ends_with",
      "is_null",
      "is_not_null",
    ],
    placeholder: "Desarrollador Senior",
    description: "Cargo o puesto de trabajo",
  },
  {
    name: "department",
    label: "Departamento",
    type: "string",
    category: "Información Laboral",
    operators: [
      "eq",
      "ne",
      "contains",
      "starts_with",
      "ends_with",
      "in",
      "not_in",
      "is_null",
      "is_not_null",
    ],
    placeholder: "Tecnología",
    description: "Departamento al que pertenece el usuario",
  },
  {
    name: "employee_id",
    label: "ID de Empleado",
    type: "string",
    category: "Información Laboral",
    operators: [
      "eq",
      "ne",
      "contains",
      "starts_with",
      "ends_with",
      "is_null",
      "is_not_null",
    ],
    placeholder: "EMP-001",
    description: "Identificador único del empleado",
  },

  // Preferences & Configuration
  {
    name: "preferred_language",
    label: "Idioma Preferido",
    type: "select",
    category: "Preferencias",
    operators: ["eq", "ne", "in", "not_in"],
    options: [
      { value: "es", label: "Español" },
      { value: "en", label: "English" },
      { value: "pt", label: "Português" },
    ],
    description: "Idioma preferido del usuario",
  },
  {
    name: "timezone",
    label: "Zona Horaria",
    type: "string",
    category: "Preferencias",
    operators: ["eq", "ne", "in", "not_in", "is_null", "is_not_null"],
    placeholder: "America/Bogota",
    description: "Zona horaria del usuario",
  },

  // Timestamps
  {
    name: "created_at",
    label: "Fecha de Creación",
    type: "datetime",
    category: "Fechas",
    operators: [
      "eq",
      "ne",
      "gt",
      "gte",
      "lt",
      "lte",
      "between",
      "is_null",
      "is_not_null",
    ],
    description: "Fecha y hora de creación del usuario",
  },
  {
    name: "updated_at",
    label: "Fecha de Actualización",
    type: "datetime",
    category: "Fechas",
    operators: [
      "eq",
      "ne",
      "gt",
      "gte",
      "lt",
      "lte",
      "between",
      "is_null",
      "is_not_null",
    ],
    description: "Fecha y hora de última actualización",
  },
];

/**
 * Get field config by name
 */
export function getUserFieldConfig(fieldName: string): FieldConfig | undefined {
  return userFieldsConfig.find((field) => field.name === fieldName);
}

/**
 * Get all fields grouped by category
 */
export function getUserFieldsByCategory(): Record<string, FieldConfig[]> {
  const grouped: Record<string, FieldConfig[]> = {};
  userFieldsConfig.forEach((field) => {
    const category = field.category || "Otros";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(field);
  });
  return grouped;
}

/**
 * Get allowed operators for a field type
 */
export function getAllowedOperatorsForType(
  fieldType: FieldConfig["type"]
): FilterOperator[] {
  const operatorMap: Record<FieldConfig["type"], FilterOperator[]> = {
    string: [
      "eq",
      "ne",
      "contains",
      "starts_with",
      "ends_with",
      "is_null",
      "is_not_null",
    ],
    email: [
      "eq",
      "ne",
      "contains",
      "starts_with",
      "ends_with",
      "is_null",
      "is_not_null",
    ],
    number: [
      "eq",
      "ne",
      "gt",
      "gte",
      "lt",
      "lte",
      "in",
      "not_in",
      "between",
      "is_null",
      "is_not_null",
    ],
    boolean: ["eq", "ne"],
    date: [
      "eq",
      "ne",
      "gt",
      "gte",
      "lt",
      "lte",
      "between",
      "is_null",
      "is_not_null",
    ],
    datetime: [
      "eq",
      "ne",
      "gt",
      "gte",
      "lt",
      "lte",
      "between",
      "is_null",
      "is_not_null",
    ],
    select: ["eq", "ne", "in", "not_in", "is_null", "is_not_null"],
  };
  return operatorMap[fieldType] || [];
}
