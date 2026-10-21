/**
 * Recurrence utilities for calendar events
 * Provides functions to calculate and format recurring events
 */

import type { RecurrenceConfig } from "~/features/calendar/components/RecurrenceEditor";

/**
 * Calculate the next occurrences of a recurring event
 * @param startDate - The start date of the event
 * @param config - Recurrence configuration
 * @param limit - Maximum number of occurrences to return (default: 10)
 * @returns Array of dates representing the next occurrences
 */
export function calculateNextOccurrences(
  startDate: Date,
  config: RecurrenceConfig,
  limit: number = 10
): Date[] {
  if (config.type === "none") {
    return [];
  }

  const occurrences: Date[] = [];
  // Use local date to avoid timezone shifts
  const start = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const endDate = config.endDate
    ? new Date(
        config.endDate.getFullYear(),
        config.endDate.getMonth(),
        config.endDate.getDate()
      )
    : null;
  let currentDate = new Date(start);

  while (occurrences.length < limit && (!endDate || currentDate <= endDate)) {
    // Add the current occurrence
    occurrences.push(new Date(currentDate));

    // Calculate next occurrence
    const nextDate = new Date(currentDate);
    switch (config.type) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + config.interval);
        break;
      case "weekly":
        nextDate.setDate(nextDate.getDate() + config.interval * 7);
        break;
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + config.interval);
        break;
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + config.interval);
        break;
      default:
        // Should never reach here
        break;
    }
    currentDate = nextDate;
  }

  return occurrences;
}

/**
 * Format recurrence configuration into human-readable text
 * @param config - Recurrence configuration
 * @param t - Translation function
 * @returns Human-readable description of the recurrence
 */
export function formatRecurrence(
  config: RecurrenceConfig,
  t: (key: string) => string
): string {
  if (config.type === "none") {
    return t("calendar.recurrence.none");
  }

  const interval = config.interval;
  const typeLabels = {
    daily: t("calendar.recurrence.daily"),
    weekly: t("calendar.recurrence.weekly"),
    monthly: t("calendar.recurrence.monthly"),
    yearly: t("calendar.recurrence.yearly"),
  };

  const intervalLabels = {
    daily: t("calendar.recurrence.days"),
    weekly: t("calendar.recurrence.weeks"),
    monthly: t("calendar.recurrence.months"),
    yearly: t("calendar.recurrence.years"),
  };

  let baseText = "";

  if (interval === 1) {
    baseText = typeLabels[config.type];
  } else {
    baseText = `${t("calendar.recurrence.interval")} ${interval} ${intervalLabels[config.type]}`;
  }

  // Add days of week for weekly recurrence
  if (
    config.type === "weekly" &&
    config.daysOfWeek &&
    config.daysOfWeek.length > 0
  ) {
    const dayLabels = [
      t("calendar.weekdays.sun"),
      t("calendar.weekdays.mon"),
      t("calendar.weekdays.tue"),
      t("calendar.weekdays.wed"),
      t("calendar.weekdays.thu"),
      t("calendar.weekdays.fri"),
      t("calendar.weekdays.sat"),
    ];

    const selectedDays = config.daysOfWeek
      .sort((a, b) => a - b)
      .map((day) => dayLabels[day]);

    if (selectedDays.length === 1) {
      baseText += ` ${t("calendar.recurrence.on")} ${selectedDays[0]}`;
    } else if (selectedDays.length === 2) {
      baseText += ` ${t("calendar.recurrence.on")} ${selectedDays.join(" " + t("calendar.recurrence.and") + " ")}`;
    } else {
      baseText += ` ${t("calendar.recurrence.on")} ${selectedDays.slice(0, -1).join(", ")} ${t("calendar.recurrence.and")} ${selectedDays[selectedDays.length - 1]}`;
    }
  }

  // Add end date if specified
  if (config.endDate) {
    baseText += ` ${t("calendar.recurrence.until")} ${config.endDate.toLocaleDateString()}`;
  }

  return baseText;
}

/**
 * Convert RecurrenceConfig to backend format
 * @param config - Recurrence configuration
 * @returns Backend-compatible recurrence object
 */
export function configToBackend(config: RecurrenceConfig | null): {
  recurrence_type: string;
  recurrence_interval: number;
  recurrence_end_date?: string;
  recurrence_days_of_week?: string;
} {
  if (!config || config.type === "none") {
    return {
      recurrence_type: "none",
      recurrence_interval: 1,
    };
  }

  const result: {
    recurrence_type: string;
    recurrence_interval: number;
    recurrence_end_date?: string;
    recurrence_days_of_week?: string;
  } = {
    recurrence_type: config.type,
    recurrence_interval: config.interval,
  };

  if (config.endDate) {
    result.recurrence_end_date = config.endDate.toISOString().split("T")[0];
  }

  if (
    config.type === "weekly" &&
    config.daysOfWeek &&
    config.daysOfWeek.length > 0
  ) {
    // Convert days array to comma-separated string (0-6 format)
    result.recurrence_days_of_week = config.daysOfWeek.join(",");
  }

  return result;
}

/**
 * Convert backend format to RecurrenceConfig
 * @param backend - Backend recurrence object
 * @returns RecurrenceConfig object
 */
export function backendToConfig(backend: {
  recurrence_type?: string;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  recurrence_days_of_week?: string;
}): RecurrenceConfig | null {
  if (!backend.recurrence_type || backend.recurrence_type === "none") {
    return null;
  }

  const config: RecurrenceConfig = {
    type: backend.recurrence_type as RecurrenceConfig["type"],
    interval: backend.recurrence_interval || 1,
  };

  if (backend.recurrence_end_date) {
    config.endDate = new Date(backend.recurrence_end_date);
  }

  if (backend.recurrence_days_of_week) {
    // Parse comma-separated days string
    config.daysOfWeek = backend.recurrence_days_of_week
      .split(",")
      .map((d) => parseInt(d.trim()))
      .filter((d) => !isNaN(d) && d >= 0 && d <= 6);
  }

  return config;
}

/**
 * Validate recurrence configuration
 * @param config - Recurrence configuration
 * @returns Error message if invalid, null if valid
 */
export function validateRecurrence(config: RecurrenceConfig): string | null {
  if (config.type === "none") {
    return null;
  }

  // Validate interval
  if (config.interval < 1 || config.interval > 999) {
    return "Interval must be between 1 and 999";
  }

  // Validate weekly recurrence has at least one day selected
  if (config.type === "weekly") {
    if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
      return "Weekly recurrence must have at least one day selected";
    }
    if (config.daysOfWeek.some((day) => day < 0 || day > 6)) {
      return "Days of week must be between 0 and 6";
    }
  }

  // Validate end date is in the future
  if (config.endDate && config.endDate < new Date()) {
    return "End date must be in the future";
  }

  return null;
}
