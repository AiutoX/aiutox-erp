/**
 * Tasks Hooks module exports
 * Centralizes all reusable React hooks for tasks functionality
 */

export * from "./useBulkOperations";
export * from "./useCalendarSync";
export * from "./useCustomStatesMetrics";
export * from "./useDependencies";
export * from "./useOptimizedTasks";
export * from "./useSSE";
export * from "./useSavedViews";
export * from "./useSubtasks";
export * from "./useTaskComments";
export * from "./useTaskFiles";
export * from "./useTaskSearch";
export * from "./useTaskStatusDefinitions";
export * from "./useTaskStatuses";
export * from "./useTaskTemplates";
export * from "./useTasks";
export * from "./useTasksStatistics";
export * from "./useTasksTrends";
export {
  useTemplates as useTaskHookTemplates,
  useTemplateCategories,
  usePopularTemplates,
} from "./useTemplates";
export type { CreateTaskFromTemplateData } from "./useTemplates";
export * from "./useTimeTracking";
export * from "./useWebhookEvents";
export * from "./useWebhooks";
