/**
 * Tasks module public exports.
 * Centralizes reusable hooks, API clients, and types for cross-feature consumption.
 *
 * Usage:
 * - Import all from main entry: import { useTasks, fetchTasks, Task } from "@features/tasks"
 * - Import from layers: import { useTasks } from "@features/tasks/hooks"
 * - Import from submodules: import { useTasks } from "@features/tasks/hooks/useTasks"
 */

// API clients (calendar, statistics, comments, files, search, webhooks, etc.)
export * from "./api";

// React hooks (21 reusable hooks for task functionality)
export * from "./hooks";

// TypeScript types (task, status, webhook types)
export * from "./types";

// Utility functions (subtask utilities, etc.)
export * from "./utils";
