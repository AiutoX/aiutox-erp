/**
 * Task Comments Hooks
 * TanStack Query hooks for task comments
 * Sprint 2.4 - Fase 2
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addComment,
  updateComment,
  deleteComment,
  listComments,
} from "../api/task-comments.api";

/**
 * Hook para listar comentarios de una tarea
 */
export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: ["tasks", taskId, "comments"],
    queryFn: () => listComments(taskId),
    staleTime: 1000 * 60, // 1 minuto (comentarios cambian frecuentemente)
    retry: 2,
    enabled: !!taskId,
  });
}

/**
 * Hook para agregar comentario
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      content,
      mentions,
    }: {
      taskId: string;
      content: string;
      mentions?: string[];
    }) => addComment(taskId, content, mentions),
    onSuccess: (_, variables) => {
      // Refrescar los comentarios sin invalidar otras queries
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.taskId, "comments"],
      });
    },
    onError: (error) => {
      console.error("Failed to add comment:", error);
    },
  });
}

/**
 * Hook para actualizar comentario
 */
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      commentId,
      content,
    }: {
      taskId: string;
      commentId: string;
      content: string;
    }) => updateComment(taskId, commentId, content),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.taskId, "comments"],
      });
    },
    onError: (error) => {
      console.error("Failed to update comment:", error);
    },
  });
}

/**
 * Hook para eliminar comentario
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      commentId,
    }: {
      taskId: string;
      commentId: string;
    }) => deleteComment(taskId, commentId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.taskId, "comments"],
      });
    },
    onError: (error) => {
      console.error("Failed to delete comment:", error);
    },
  });
}
