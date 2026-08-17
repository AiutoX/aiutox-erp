/**
 * Webhook types - Multi-module support
 */

export interface Webhook {
  id: string;
  tenant_id: string;
  name: string;
  url: string;
  event_type: string;
  enabled: boolean;
  status: string;
  last_sync_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookCreate {
  name: string;
  url: string;
  event_type: string;
}

export interface WebhookUpdate {
  name?: string;
  url?: string;
  event_type?: string;
  enabled?: boolean;
}

export interface WebhookTestResponse {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  created_at: string;
}

// Event categories
export type EventCategory = "lifecycle" | "status" | "interaction" | "system";

// Webhook event definition
export interface WebhookEvent {
  type: string;
  description: string;
  category: EventCategory;
  payload_schema?: Record<string, unknown>;
}

// Module event registry
export interface WebhookEventModule {
  name: string;
  description: string;
  events: WebhookEvent[];
}

// Complete event registry response
export interface WebhookEventRegistry {
  modules: Record<string, WebhookEventModule>;
}

// Legacy support - deprecated, use WebhookEventRegistry instead
export const TASK_WEBHOOK_EVENTS = [
  { value: "task.created", label: "Tarea Creada" },
  { value: "task.updated", label: "Tarea Actualizada" },
  { value: "task.deleted", label: "Tarea Eliminada" },
  { value: "task.assigned", label: "Tarea Asignada" },
  { value: "task.unassigned", label: "Tarea Desasignada" },
  { value: "task.status_changed", label: "Estado Cambiado" },
  { value: "task.completed", label: "Tarea Completada" },
  { value: "task.cancelled", label: "Tarea Cancelada" },
  { value: "task.comment_added", label: "Comentario Agregado" },
  { value: "task.file_attached", label: "Archivo Adjunto" },
  { value: "task.due_soon", label: "Próxima a Vencer" },
  { value: "task.overdue", label: "Vencida" },
] as const;
