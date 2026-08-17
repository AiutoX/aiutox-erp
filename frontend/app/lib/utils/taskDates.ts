/**
 * Task date helpers — due_date is stored as a UTC ISO datetime, but when a
 * task is all_day it represents a calendar day the user picked, not a
 * precise instant. Formatting it with the browser's local timezone (the
 * default for `new Date(iso)` + date-fns `format`) can shift the displayed
 * day backward in any timezone behind UTC (e.g. midnight UTC becomes the
 * previous evening in America/Bogota, UTC-5).
 *
 * These helpers always take `allDay` explicitly — there is no implicit
 * "guess from the string" behavior — so a given screen's intent (day-only
 * deadline vs. a scheduled moment) stays visible at the call site.
 */

import { format, type Locale } from "date-fns";

const DATE_ONLY_INPUT_FORMAT = "yyyy-MM-dd";
const DATETIME_LOCAL_INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";

/**
 * Builds a Date whose local getters (getFullYear/getMonth/getDate/etc.)
 * return the same numbers as the UTC components of the source ISO string —
 * so date-fns `format()` (which always reads local getters) renders the
 * calendar day the value actually represents, with no timezone shift.
 */
function toUtcAsLocalDate(iso: string): Date | null {
  const utcDate = new Date(iso);
  if (Number.isNaN(utcDate.getTime())) return null;
  return new Date(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes(),
    utcDate.getUTCSeconds()
  );
}

/**
 * Format a due_date for display.
 * - allDay=true: renders the UTC calendar day, ignoring time-of-day and the
 *   viewer's local timezone entirely.
 * - allDay=false: renders in the viewer's local timezone, as a real instant.
 */
export function formatDueDate(
  iso: string | null | undefined,
  allDay: boolean,
  dateFormat: string,
  locale: Locale
): string {
  if (!iso) return "";
  const date = allDay ? toUtcAsLocalDate(iso) : new Date(iso);
  if (!date || Number.isNaN(date.getTime())) return "";
  return format(date, dateFormat, { locale });
}

/**
 * Convert a due_date ISO string into the value for a native date input.
 * - allDay=true: `<input type="date">`, value "yyyy-MM-dd" (UTC day, no shift).
 * - allDay=false: `<input type="datetime-local">`, value "yyyy-MM-dd'T'HH:mm"
 *   in the viewer's local timezone.
 */
export function dueDateToInputValue(
  iso: string | null | undefined,
  allDay: boolean
): string {
  if (!iso) return "";
  const date = allDay ? toUtcAsLocalDate(iso) : new Date(iso);
  if (!date || Number.isNaN(date.getTime())) return "";
  return format(date, allDay ? DATE_ONLY_INPUT_FORMAT : DATETIME_LOCAL_INPUT_FORMAT);
}

/**
 * Convert a native date input's value back into the ISO string to submit.
 * - allDay=true: input value is "yyyy-MM-dd" (no time component) — treated
 *   as that calendar day at UTC midnight, so it round-trips through
 *   formatDueDate/dueDateToInputValue without drifting a day in any timezone.
 * - allDay=false: input value is "yyyy-MM-dd'T'HH:mm" in the viewer's local
 *   timezone — converted to a real UTC instant.
 */
export function dueDateInputValueToIso(
  value: string,
  allDay: boolean
): string | undefined {
  if (!value) return undefined;
  if (allDay) {
    // "yyyy-MM-dd" -> UTC midnight of that exact day, not local midnight.
    return `${value}T00:00:00.000Z`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}
