/**
 * Utilities for calendar event drag and resize behavior.
 */

import type { CalendarEvent } from "~/features/calendar/types/calendar.types";

/**
 * Snaps a date to the nearest time interval.
 * @param date - The date to snap
 * @param intervalMinutes - Interval in minutes (default: 15)
 * @returns A new Date rounded to the nearest interval
 */
export function snapToGrid(date: Date, intervalMinutes: number = 15): Date {
  const ms = intervalMinutes * 60 * 1000;
  const rounded = new Date(Math.round(date.getTime() / ms) * ms);
  return rounded;
}

export function buildMovedEventTimes(
  event: CalendarEvent,
  targetDate: Date,
  preserveTime: boolean = true
): { start_time: string; end_time: string } {
  const originalStart = new Date(event.start_time);
  const originalEnd = new Date(event.end_time);
  const duration = originalEnd.getTime() - originalStart.getTime();

  const newStart = new Date(targetDate);
  if (!event.all_day && preserveTime) {
    newStart.setUTCHours(
      originalStart.getUTCHours(),
      originalStart.getUTCMinutes(),
      originalStart.getUTCSeconds(),
      originalStart.getUTCMilliseconds()
    );
  } else if (event.all_day) {
    newStart.setUTCHours(0, 0, 0, 0);
  }

  const newEnd = new Date(newStart.getTime() + duration);

  return {
    start_time: newStart.toISOString(),
    end_time: newEnd.toISOString(),
  };
}

export function buildResizedEventTimes(
  event: CalendarEvent,
  targetDate: Date,
  preserveTime: boolean = true
): { end_time: string } | null {
  const newEnd = new Date(targetDate);
  const originalEnd = new Date(event.end_time);

  if (!event.all_day && preserveTime) {
    newEnd.setUTCHours(
      originalEnd.getUTCHours(),
      originalEnd.getUTCMinutes(),
      originalEnd.getUTCSeconds(),
      originalEnd.getUTCMilliseconds()
    );
  }

  if (newEnd.getTime() <= new Date(event.start_time).getTime()) {
    return null;
  }

  return { end_time: newEnd.toISOString() };
}
