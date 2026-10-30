/**
 * Reads a 422 `CATALOG_LABELS_INVALID` error of the item PATCH / POST
 * (ISSUE-037, AC-API-13, AC-UI-23/24) and maps it to the dialog input it
 * belongs to.
 *
 * The backend (`CatalogService._validate_labels`, RULE-003) sends
 * `details.field` = `"labels.es"` | `"labels.en"` and `details.reason` =
 * `missing` | `empty` | `too_long` | `html`. Each reason gets an i18n key
 * under `catalogs.admin.itemDialog.errors.*`; an unknown reason falls back
 * to the generic `invalid` message.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { getApiErrorCode } from "../hooks/useUpdateGovernance";

export const CATALOG_LABELS_INVALID_CODE = "CATALOG_LABELS_INVALID";

export type LabelLanguage = "es" | "en";

export const LABEL_ERROR_KEYS = {
  required: "catalogs.admin.itemDialog.errors.required",
  tooLong: "catalogs.admin.itemDialog.errors.tooLong",
  html: "catalogs.admin.itemDialog.errors.html",
  controlChar: "catalogs.admin.itemDialog.errors.controlChar",
  invalid: "catalogs.admin.itemDialog.errors.invalid",
} as const;

const REASON_KEYS: Record<string, string> = {
  missing: LABEL_ERROR_KEYS.required,
  empty: LABEL_ERROR_KEYS.required,
  too_long: LABEL_ERROR_KEYS.tooLong,
  html: LABEL_ERROR_KEYS.html,
  control_char: LABEL_ERROR_KEYS.controlChar,
};

const FIELD_LANGUAGES: Record<string, LabelLanguage> = {
  "labels.es": "es",
  "labels.en": "en",
};

export interface LabelFieldError {
  language: LabelLanguage;
  /** i18n key of the message to show under the input. */
  messageKey: string;
}

interface ApiErrorDetailsShape {
  response?: {
    data?: {
      error?: { details?: { field?: unknown; reason?: unknown } | null } | null;
    } | null;
  };
}

/** The input-level error of a 422 `CATALOG_LABELS_INVALID`, or null for any other error. */
export function getLabelFieldError(error: unknown): LabelFieldError | null {
  if (getApiErrorCode(error) !== CATALOG_LABELS_INVALID_CODE) return null;
  const details = (error as ApiErrorDetailsShape | null)?.response?.data?.error
    ?.details;
  const field = details?.field;
  const language = typeof field === "string" ? FIELD_LANGUAGES[field] : null;
  if (!language) return null;
  const reason = details?.reason;
  return {
    language,
    messageKey:
      (typeof reason === "string" && REASON_KEYS[reason]) ||
      LABEL_ERROR_KEYS.invalid,
  };
}
