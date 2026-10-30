/**
 * Event layout utilities for Week and Day views.
 * Calculates absolute positioning (top, height) and overlap columns
 * for Google Calendar-style time grid rendering.
 */

import type { CalendarEvent } from "~/features/calendar/types/calendar.types";

/** Height in pixels for one hour slot */
export const HOUR_HEIGHT = 60;

/** Total height for 24 hours */
export const TOTAL_DAY_HEIGHT = HOUR_HEIGHT * 24;

/** Minimum event height in pixels (15 min) */
export const MIN_EVENT_HEIGHT = HOUR_HEIGHT / 4;

export interface PositionedEvent {
  event: CalendarEvent;
  /** Top offset in pixels from midnight */
  top: number;
  /** Height in pixels based on duration */
  height: number;
  /** Column index (0-based) for overlap handling */
  column: number;
  /** Total number of overlapping columns */
  totalColumns: number;
}

/**
 * Convert a time string to minutes since midnight for a given day.
 * Clamps to [0, 1440] for events that span across days.
 */
function timeToMinutes(isoString: string, referenceDay: Date): number {
  const date = new Date(isoString);

  // If event starts before reference day, clamp to 0
  if (
    date <
    new Date(
      referenceDay.getFullYear(),
      referenceDay.getMonth(),
      referenceDay.getDate(),
      0,
      0,
      0
    )
  ) {
    return 0;
  }

  // If event ends after reference day, clamp to 1440 (end of day)
  const endOfDay = new Date(
    referenceDay.getFullYear(),
    referenceDay.getMonth(),
    referenceDay.getDate(),
    23,
    59,
    59
  );
  if (date > endOfDay) {
    return 1440;
  }

  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Filter events that are visible on a given day (including multi-day events).
 * Excludes all-day events (they go in the all-day section).
 */
export function getTimedEventsForDay(
  events: CalendarEvent[],
  day: Date
): CalendarEvent[] {
  const dayStart = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    0,
    0,
    0
  );
  const dayEnd = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    23,
    59,
    59,
    999
  );

  return events.filter((event) => {
    if (event.all_day) return false;
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    // Event overlaps with this day
    return eventStart <= dayEnd && eventEnd >= dayStart;
  });
}

/**
 * Calculate positioned events with overlap columns for a single day.
 * Uses a greedy column-packing algorithm similar to Google Calendar.
 */
export function calculateEventPositions(
  events: CalendarEvent[],
  day: Date
): PositionedEvent[] {
  if (events.length === 0) return [];

  // Calculate raw positions
  const rawPositions = events.map((event) => {
    const startMinutes = timeToMinutes(event.start_time, day);
    const endMinutes = timeToMinutes(event.end_time, day);
    const durationMinutes = Math.max(endMinutes - startMinutes, 15); // min 15 min

    return {
      event,
      startMinutes,
      endMinutes: startMinutes + durationMinutes,
      top: (startMinutes / 60) * HOUR_HEIGHT,
      height: Math.max((durationMinutes / 60) * HOUR_HEIGHT, MIN_EVENT_HEIGHT),
      column: 0,
      totalColumns: 1,
    };
  });

  // Sort by start time, then by duration (longer first)
  rawPositions.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes)
      return a.startMinutes - b.startMinutes;
    return b.endMinutes - b.startMinutes - (a.endMinutes - a.startMinutes);
  });

  // Greedy column assignment
  // For each event, find the first column where it doesn't overlap with any existing event
  const columns: Array<{ endMinutes: number }[]> = [];

  for (const pos of rawPositions) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const columnEvents = columns[col];
      if (!columnEvents) continue;
      const hasOverlap = columnEvents.some(
        (existing) => pos.startMinutes < existing.endMinutes
      );
      if (!hasOverlap) {
        pos.column = col;
        columnEvents.push({ endMinutes: pos.endMinutes });
        placed = true;
        break;
      }
    }
    if (!placed) {
      pos.column = columns.length;
      columns.push([{ endMinutes: pos.endMinutes }]);
    }
  }

  // Calculate total columns for each group of overlapping events
  // Find connected groups
  const groups = findOverlapGroups(rawPositions);

  for (const group of groups) {
    const maxCol = Math.max(...group.map((p) => p.column)) + 1;
    for (const pos of group) {
      pos.totalColumns = maxCol;
    }
  }

  return rawPositions.map(({ event, top, height, column, totalColumns }) => ({
    event,
    top,
    height,
    column,
    totalColumns,
  }));
}

/**
 * Find groups of mutually overlapping events.
 */
function findOverlapGroups(
  positions: Array<{
    startMinutes: number;
    endMinutes: number;
    column: number;
    totalColumns: number;
    event: CalendarEvent;
    top: number;
    height: number;
  }>
): Array<typeof positions> {
  if (positions.length === 0) return [];

  const groups: Array<typeof positions> = [];
  let currentGroup: typeof positions = [positions[0]!];
  let groupEnd = positions[0]!.endMinutes;

  for (let i = 1; i < positions.length; i++) {
    const pos = positions[i]!;
    if (pos.startMinutes < groupEnd) {
      // Overlaps with current group
      currentGroup.push(pos);
      groupEnd = Math.max(groupEnd, pos.endMinutes);
    } else {
      // New group
      groups.push(currentGroup);
      currentGroup = [pos];
      groupEnd = pos.endMinutes;
    }
  }
  groups.push(currentGroup);

  return groups;
}
