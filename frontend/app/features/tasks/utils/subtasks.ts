/**
 * Subtask utility functions for hierarchy and progress calculation.
 */

import type { Task } from "~/features/tasks/types/task.types";

export interface SubtaskProgress {
  total: number;
  completed: number;
  percentage: number;
}

/**
 * Calculate progress based on subtask completion.
 * Recursively counts all nested subtasks.
 */
export function calculateSubtaskProgress(task: Task): SubtaskProgress {
  const subtasks = task.subtasks ?? [];
  if (subtasks.length === 0) {
    return { total: 0, completed: 0, percentage: 0 };
  }

  let total = 0;
  let completed = 0;

  for (const sub of subtasks) {
    total += 1;
    if (sub.status === "done") {
      completed += 1;
    }
    // Recursively count nested subtasks
    const nested = calculateSubtaskProgress(sub);
    total += nested.total;
    completed += nested.completed;
  }

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percentage };
}

/**
 * Get the nesting depth of a task in the hierarchy.
 * Returns 0 for root tasks, 1 for first-level subtasks, etc.
 */
export function getTaskDepth(task: Task, allTasks: Task[]): number {
  let depth = 0;
  let currentId = task.parent_task_id;

  while (currentId) {
    depth += 1;
    const parent = allTasks.find((t) => t.id === currentId);
    currentId = parent?.parent_task_id ?? null;
    if (depth > 10) break; // Safety guard
  }

  return depth;
}

/**
 * Check if moving a task under a new parent would create a cycle.
 * @returns true if a cycle would be created
 */
export function wouldCreateCycle(
  taskId: string,
  newParentId: string,
  allTasks: Task[]
): boolean {
  if (taskId === newParentId) return true;

  let currentId: string | null | undefined = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === taskId) return true;
    if (visited.has(currentId)) return false; // Existing cycle, stop
    visited.add(currentId);
    const parent = allTasks.find((t) => t.id === currentId);
    currentId = parent?.parent_task_id;
  }

  return false;
}

/**
 * Build a tree structure from a flat list of tasks.
 * Returns only root-level tasks with subtasks nested.
 */
export function buildTaskTree(tasks: Task[]): Task[] {
  const taskMap = new Map<string, Task>();
  const roots: Task[] = [];

  // First pass: create map with empty subtasks arrays
  for (const task of tasks) {
    taskMap.set(task.id, { ...task, subtasks: [] });
  }

  // Second pass: assign children to parents
  for (const task of tasks) {
    const mapped = taskMap.get(task.id)!;
    if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
      taskMap.get(task.parent_task_id)!.subtasks!.push(mapped);
    } else {
      roots.push(mapped);
    }
  }

  return roots;
}

/** Maximum allowed subtask nesting depth */
export const MAX_SUBTASK_DEPTH = 3;
