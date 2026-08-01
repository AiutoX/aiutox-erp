/**
 * Utilities for calendar event validation
 * Provides validation functions for event dates and times
 */

import type { CalendarEvent } from "~/features/calendar/types/calendar.types";

/**
 * Validates that event start_time is less than or equal to end_time
 * @param event - The calendar event to validate
 * @returns Error message in Spanish if validation fails, null if valid
 */
export function validateEventDates(event: CalendarEvent): string | null {
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);

  if (start >= end) {
    return "La fecha de inicio debe ser menor o igual a la fecha de fin";
  }

  return null;
}

/**
 * Builds updated event times for resize operations with validation
 * @param event - The original calendar event
 * @param targetDate - The new date for the resize operation
 * @param direction - Which side is being resized ("left" for start, "right" for end)
 * @param preserveTime - Whether to preserve the original time component
 * @returns Object with updated times or null if validation fails
 */
export function buildResizedEventTimesWithValidation(
  event: CalendarEvent,
  targetDate: Date,
  direction: "left" | "right",
  preserveTime: boolean = true
): { start_time?: string; end_time?: string } | null {
  const updates: { start_time?: string; end_time?: string } = {};

  // Create new date with proper time handling
  const newDate = new Date(targetDate);

  if (direction === "left") {
    // Updating start_time
    if (!event.all_day && preserveTime) {
      // For left resize with preserveTime, use target date as is (it has the new time)
      updates.start_time = newDate.toISOString();
    } else if (event.all_day) {
      newDate.setUTCHours(0, 0, 0, 0);
      updates.start_time = newDate.toISOString();
    } else {
      // Don't preserve time, use target date as is
      updates.start_time = newDate.toISOString();
    }
  } else {
    // Updating end_time
    if (!event.all_day && preserveTime) {
      // For right resize with preserveTime, use target date as is (it has the new time)
      updates.end_time = newDate.toISOString();
    } else if (event.all_day) {
      newDate.setUTCHours(23, 59, 59, 999);
      updates.end_time = newDate.toISOString();
    } else {
      // Don't preserve time, use target date as is
      updates.end_time = newDate.toISOString();
    }
  }

  // Create temporary event with updates to validate
  const tempEvent = { ...event, ...updates };
  const error = validateEventDates(tempEvent);

  if (error) {
    return null; // Validation failed
  }

  return updates;
}

/**
 * Formats a date validation error message for display
 * @param error - The error message from validateEventDates
 * @returns Formatted error message suitable for UI display
 */
export function formatDateErrorMessage(error: string): string {
  return error;
}

/**
 * Checks if an event can be resized based on its properties
 * @param event - The calendar event to check
 * @returns True if the event can be resized, false otherwise
 */
export function canResizeEvent(event: CalendarEvent): boolean {
  // Read-only events cannot be resized
  if (event.read_only) {
    return false;
  }

  // Tasks cannot be resized
  if (event.source_type === "task") {
    return false;
  }

  return true;
}

/**
 * Calculates minimum duration for an event (15 minutes by default)
 * @param event - The calendar event
 * @returns Minimum duration in milliseconds
 */
export function getMinimumEventDuration(_event: CalendarEvent): number {
  // 15 minutes in milliseconds
  return 15 * 60 * 1000;
}

/**
 * Validates that an event has sufficient duration after resize
 * @param event - The calendar event
 * @param newStartTime - Optional new start time
 * @param newEndTime - Optional new end time
 * @returns Error message if duration is insufficient, null if valid
 */
export function validateEventDuration(
  event: CalendarEvent,
  newStartTime?: string,
  newEndTime?: string
): string | null {
  const start = newStartTime
    ? new Date(newStartTime)
    : new Date(event.start_time);
  const end = newEndTime ? new Date(newEndTime) : new Date(event.end_time);
  const duration = end.getTime() - start.getTime();
  const minDuration = getMinimumEventDuration(event);

  if (duration < minDuration) {
    return `La duración mínima del evento es de 15 minutos`;
  }

  return null;
}
