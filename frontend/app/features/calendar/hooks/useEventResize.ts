/**
 * useEventResize hook
 * Extracts resize logic from CalendarView for better testability and reusability.
 */

import { useCallback } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { snapToGrid } from "~/features/calendar/utils/eventDrag";
import { buildResizedEventTimesWithValidation } from "~/features/calendar/utils/eventValidation";
import { showToast } from "~/components/common/Toast";
import type { CalendarEvent } from "~/features/calendar/types/calendar.types";

interface ResizeResult {
  updatedEvent: CalendarEvent;
  targetDate: Date;
  preserveTime: boolean;
}

interface UseEventResizeOptions {
  onEventResize?: (
    event: CalendarEvent,
    targetDate: Date,
    options?: { preserveTime: boolean }
  ) => void;
  snapInterval?: number;
}

/**
 * Hook that encapsulates calendar event resize logic:
 * - Task protection (tasks cannot be resized)
 * - Snap-to-grid (default 15 min)
 * - Validation (end > start, min duration)
 * - i18n error messages
 */
export function useEventResize({
  onEventResize,
  snapInterval = 15,
}: UseEventResizeOptions) {
  const { t } = useTranslation();

  const handleResize = useCallback(
    (
      event: CalendarEvent,
      targetDate: Date,
      direction: "left" | "right",
      preserveTime: boolean = true
    ): ResizeResult | null => {
      // Task protection
      const isTask =
        event.source_type === "task" ||
        event.metadata?.activity_type === "task";

      if (isTask) {
        showToast(t("calendar.resize.taskNotResizable"), "warning");
        return null;
      }

      // Snap to grid
      const snappedDate = snapToGrid(targetDate, snapInterval);

      // Validate and build new times
      const updates = buildResizedEventTimesWithValidation(
        event,
        snappedDate,
        direction,
        preserveTime
      );

      if (!updates) {
        showToast(t("calendar.resize.invalid"), "error");
        return null;
      }

      const updatedEvent = { ...event, ...updates };

      // Fire callback
      onEventResize?.(updatedEvent, targetDate, { preserveTime });

      return { updatedEvent, targetDate, preserveTime };
    },
    [onEventResize, snapInterval, t]
  );

  return { handleResize };
}
