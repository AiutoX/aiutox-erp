/**
 * Calendar module public exports.
 * Centralized reusable API, hooks, and types for cross-feature integration.
 */

// API
export * from "./api/calendar.api";
export * from "./api/calendar-resources.api";

// Hooks
export * from "./hooks/useCalendar";
export * from "./hooks/useResources";
export * from "./hooks/useReminders";
export * from "./hooks/useEventComments";
export * from "./hooks/useEventFiles";
export * from "./hooks/useEventQuickEdit";
export * from "./hooks/useEventResize";
export * from "./hooks/useTouchGestures";
export * from "./hooks/useTouchResize";

// Types
export * from "./types/calendar.types";
