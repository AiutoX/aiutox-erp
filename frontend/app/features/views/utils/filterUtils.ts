/**
 * Utility functions for filter operations.
 * Includes validation, description building, and formatting.
 */

import type {
  FieldConfig,
  FilterCondition,
  FilterConfig,
  FilterOperator,
} from "../types/savedFilter.types";
import { translations } from "~/lib/i18n/translations/es";

/**
 * Get allowed operators for a field based on its type
 */
export function getOperatorsForField(field: FieldConfig): FilterOperator[] {
  return field.operators;
}

/**
 * Validate a single filter condition
 */
export function validateFilterCondition(
  condition: FilterCondition,
  field: FieldConfig
): { valid: boolean; error?: string } {
  const { operator, value } = condition;

  // Check if operator is allowed for this field
  if (!field.operators.includes(operator)) {
    return {
      valid: false,
      error: `Operador '${operator}' no permitido para el campo '${field.label}'`,
    };
  }

  // Validate value based on operator
  if (operator === "is_null" || operator === "is_not_null") {
    // These operators don't need a value
    return { valid: true };
  }

  if (operator === "in" || operator === "not_in") {
    if (!Array.isArray(value)) {
      return {
        valid: false,
        error: `El operador '${operator}' requiere un array de valores`,
      };
    }
    if (value.length === 0) {
      return {
        valid: false,
        error: `El operador '${operator}' requiere al menos un valor`,
      };
    }
  }

  if (operator === "between") {
    if (
      !value ||
      typeof value !== "object" ||
      !("min" in value) ||
      !("max" in value)
    ) {
      return {
        valid: false,
        error: `El operador 'between' requiere un objeto con 'min' y 'max'`,
      };
    }
  }

  // Type-specific validation
  // Note: is_null and is_not_null are already handled above, so we can safely check for number type
  if (
    field.type === "number" &&
    operator !== "in" &&
    operator !== "not_in" &&
    operator !== "between"
  ) {
    if (typeof value !== "number") {
      return {
        valid: false,
        error: `El campo '${field.label}' requiere un valor numérico`,
      };
    }
  }

  if (field.type === "boolean" && value !== true && value !== false) {
    return {
      valid: false,
      error: `El campo '${field.label}' requiere un valor booleano (true/false)`,
    };
  }

  if (field.type === "date" || field.type === "datetime") {
    // Validate date format (ISO string or valid date)
    if (typeof value === "string") {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return {
          valid: false,
          error: `El campo '${field.label}' requiere una fecha válida`,
        };
      }
    } else if (
      value &&
      typeof value === "object" &&
      "min" in value &&
      "max" in value
    ) {
      // For between operator
      if (typeof value.min === "string" && typeof value.max === "string") {
        const minDate = new Date(value.min);
        const maxDate = new Date(value.max);
        if (isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) {
          return {
            valid: false,
            error: `El campo '${field.label}' requiere fechas válidas para 'between'`,
          };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Build a human-readable description of a filter
 */
export function buildFilterDescription(
  filterConfig: FilterConfig,
  fields: FieldConfig[]
): string {
  const conditions: string[] = [];

  for (const [fieldName, condition] of Object.entries(filterConfig)) {
    const field = fields.find((f) => f.name === fieldName);
    if (!field) {
      conditions.push(`${fieldName}: ${condition.operator}`);
      continue;
    }

    const { operator, value } = condition;
    let description = `${field.label} `;

    switch (operator) {
      case "eq":
        description += `es igual a '${value}'`;
        break;
      case "ne":
        description += `no es igual a '${value}'`;
        break;
      case "gt":
        description += `es mayor que ${value}`;
        break;
      case "gte":
        description += `es mayor o igual que ${value}`;
        break;
      case "lt":
        description += `es menor que ${value}`;
        break;
      case "lte":
        description += `es menor o igual que ${value}`;
        break;
      case "in":
        description += `está en [${Array.isArray(value) ? value.join(", ") : value}]`;
        break;
      case "not_in":
        description += `no está en [${Array.isArray(value) ? value.join(", ") : value}]`;
        break;
      case "between":
        if (
          value &&
          typeof value === "object" &&
          "min" in value &&
          "max" in value
        ) {
          description += `está entre ${value.min} y ${value.max}`;
        }
        break;
      case "contains":
        description += `contiene '${value}'`;
        break;
      case "starts_with":
        description += `comienza con '${value}'`;
        break;
      case "ends_with":
        description += `termina con '${value}'`;
        break;
      case "is_null":
        description += `es nulo`;
        break;
      case "is_not_null":
        description += `no es nulo`;
        break;
      default:
        description += `${operator} ${value}`;
    }

    conditions.push(description);
  }

  if (conditions.length === 0) {
    return translations.filterUtils.noConditions;
  }

  return conditions.join(` ${translations.filterUtils.and} `);
}

/**
 * Format filter JSON for display
 */
export function formatFilterJSON(filterConfig: FilterConfig): string {
  return JSON.stringify(filterConfig, null, 2);
}

/**
 * Parse filter JSON from string
 */
export function parseFilterJSON(jsonString: string): {
  success: boolean;
  data?: FilterConfig;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {
        success: false,
        error: "El JSON debe ser un objeto",
      };
    }
    return { success: true, data: parsed as FilterConfig };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al parsear JSON",
    };
  }
}

/**
 * Get field label by name
 */
export function getFieldLabel(
  fieldName: string,
  fields: FieldConfig[]
): string {
  const field = fields.find((f) => f.name === fieldName);
  return field?.label || fieldName;
}

/**
 * Get operator label in Spanish
 */
export function getOperatorLabel(operator: FilterOperator): string {
  const labels: Record<FilterOperator, string> = {
    eq: "es igual a",
    ne: "no es igual a",
    gt: "es mayor que",
    gte: "es mayor o igual que",
    lt: "es menor que",
    lte: "es menor o igual que",
    in: "está en",
    not_in: "no está en",
    between: "está entre",
    contains: "contiene",
    starts_with: "comienza con",
    ends_with: "termina con",
    is_null: "es nulo",
    is_not_null: "no es nulo",
  };
  return labels[operator] || operator;
}
