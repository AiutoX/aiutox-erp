/**
 * Status label utilities.
 * System statuses have translation keys; custom (tenant-defined) statuses do not
 * and must display as-authored.
 */

const SYSTEM_STATUS_KEYS = new Set([
  "todo",
  "in_progress",
  "on_hold",
  "blocked",
  "review",
  "done",
  "cancelled",
]);

/**
 * Resolve a display label for a task/status-definition status name.
 * Only routes through i18n for known system statuses — a custom status name
 * (e.g. "En Revisión") is returned as-is rather than looked up as a translation
 * key, since `t()` falls back to returning the raw key string for unknown keys.
 */
export function translateStatusLabel(
  t: (key: string) => string,
  statusName: string
): string {
  return SYSTEM_STATUS_KEYS.has(statusName)
    ? t(`tasks.statuses.${statusName}`)
    : statusName;
}
