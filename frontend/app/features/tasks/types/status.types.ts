/**
 * Task Status Types
 * Defines the types and interfaces for task status management
 */

export interface TaskStatus {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  type: TaskStatusType;
  order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export type TaskStatusType =
  | "open"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "canceled"
  | "closed";

export interface TaskStatusCreate {
  name: string;
  color?: string;
  type?: TaskStatusType;
  order?: number;
}

export interface TaskStatusUpdate {
  name?: string;
  color?: string;
  type?: TaskStatusType;
  order?: number;
}

// Helper types for UI components
export interface StatusOption {
  value: string;
  label: string;
  color: string;
  type: TaskStatusType;
  is_system: boolean;
}

// Status type configurations
export const STATUS_TYPE_CONFIG = {
  open: {
    label: "Abierto",
    color: "#6b7280",
    icon: "Circle",
  },
  in_progress: {
    label: "En Progreso",
    color: "#3b82f6",
    icon: "Clock",
  },
  on_hold: {
    label: "En Espera",
    color: "#f59e0b",
    icon: "Pause",
  },
  completed: {
    label: "Completado",
    color: "#22c55e",
    icon: "CheckCircle",
  },
  canceled: {
    label: "Cancelado",
    color: "#ef4444",
    icon: "XCircle",
  },
  closed: {
    label: "Cerrado",
    color: "#ef4444",
    icon: "XCircle",
  },
} as const;

// Default system statuses
export const DEFAULT_STATUSES = [
  {
    id: "system-todo",
    name: "Por Hacer",
    color: "#6b7280",
    type: "open" as TaskStatusType,
    order: 0,
    is_system: true,
  },
  {
    id: "system-in-progress",
    name: "En Progreso",
    color: "#3b82f6",
    type: "in_progress" as TaskStatusType,
    order: 1,
    is_system: true,
  },
  {
    id: "system-on-hold",
    name: "En Espera",
    color: "#f59e0b",
    type: "on_hold" as TaskStatusType,
    order: 2,
    is_system: true,
  },
  {
    id: "system-completed",
    name: "Completado",
    color: "#22c55e",
    type: "completed" as TaskStatusType,
    order: 3,
    is_system: true,
  },
  {
    id: "system-canceled",
    name: "Cancelado",
    color: "#ef4444",
    type: "canceled" as TaskStatusType,
    order: 4,
    is_system: true,
  },
] as const;

// Helper functions
export function getStatusTypeLabel(type: TaskStatusType): string {
  return STATUS_TYPE_CONFIG[type].label;
}

export function getStatusTypeColor(type: TaskStatusType): string {
  return STATUS_TYPE_CONFIG[type].color;
}

export function isSystemStatus(status: TaskStatus): boolean {
  return status.is_system || status.id.startsWith("system-");
}

export function getStatusDisplayName(status: TaskStatus): string {
  return status.name;
}

export function sortStatusesByOrder(statuses: TaskStatus[]): TaskStatus[] {
  return [...statuses].sort((a, b) => a.order - b.order);
}
