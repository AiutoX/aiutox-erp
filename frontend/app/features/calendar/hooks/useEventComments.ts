/**
 * Event Comments Hooks
 * TanStack Query hooks for event comments
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "~/lib/api/client";

interface StandardResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

interface StandardListResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
  message?: string;
}

export interface EventComment {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  is_edited: boolean;
  parent_id?: string;
  author?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface EventCommentCreate {
  content: string;
  parent_id?: string;
}

export interface EventCommentUpdate {
  content: string;
}

/**
 * Hook para listar comentarios de un evento
 */
export function useEventComments(eventId: string) {
  return useQuery({
    queryKey: ["events", eventId, "comments"],
    queryFn: () => listEventComments(eventId),
    staleTime: 1000 * 60 * 2, // 2 minutos
    retry: 2,
    enabled: !!eventId,
  });
}

/**
 * Hook para agregar comentario a evento
 */
export function useAddEventComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      comment,
    }: {
      eventId: string;
      comment: EventCommentCreate;
    }) => addEventComment(eventId, comment),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["events", variables.eventId, "comments"],
      });
    },
  });
}

/**
 * Hook para actualizar comentario de evento
 */
export function useUpdateEventComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      commentId,
      update,
    }: {
      eventId: string;
      commentId: string;
      update: EventCommentUpdate;
    }) => updateEventComment(eventId, commentId, update),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["events", variables.eventId, "comments"],
      });
    },
  });
}

/**
 * Hook para eliminar comentario de evento
 */
export function useDeleteEventComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      commentId,
    }: {
      eventId: string;
      commentId: string;
    }) => deleteEventComment(eventId, commentId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["events", variables.eventId, "comments"],
      });
    },
  });
}

/**
 * Listar comentarios de un evento
 */
export async function listEventComments(
  eventId: string
): Promise<StandardListResponse<EventComment>> {
  const response = await apiClient.get(`/events/${eventId}/comments`);
  return response.data;
}

/**
 * Agregar comentario a evento
 */
export async function addEventComment(
  eventId: string,
  comment: EventCommentCreate
): Promise<StandardResponse<EventComment>> {
  const response = await apiClient.post(`/events/${eventId}/comments`, comment);
  return response.data;
}

/**
 * Actualizar comentario de evento
 */
export async function updateEventComment(
  eventId: string,
  commentId: string,
  update: EventCommentUpdate
): Promise<StandardResponse<EventComment>> {
  const response = await apiClient.put(
    `/events/${eventId}/comments/${commentId}`,
    update
  );
  return response.data;
}

/**
 * Eliminar comentario de evento
 */
export async function deleteEventComment(
  eventId: string,
  commentId: string
): Promise<StandardResponse<void>> {
  const response = await apiClient.delete(
    `/events/${eventId}/comments/${commentId}`
  );
  return response.data;
}
