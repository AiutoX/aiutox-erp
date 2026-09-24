/**
 * Task Files Hooks
 * TanStack Query hooks for task file attachments
 * Sprint 3 - Fase 2
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  attachFileToTask,
  detachFileFromTask,
  listTaskFiles,
} from "../api/task-files.api";

/**
 * Hook para listar archivos de una tarea
 */
export function useTaskFiles(taskId: string) {
  return useQuery({
    queryKey: ["tasks", taskId, "files"],
    queryFn: () => listTaskFiles(taskId),
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2,
    enabled: !!taskId,
  });
}

/**
 * Hook para adjuntar archivo a tarea
 */
export function useAttachFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      fileId,
      fileName,
      fileSize,
      fileType,
      fileUrl,
    }: {
      taskId: string;
      fileId: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      fileUrl: string;
    }) => {
      console.warn("*** useAttachFile mutationFn called ***");
      console.warn("Parameters:", {
        taskId,
        fileId,
        fileName,
        fileSize,
        fileType,
        fileUrl,
      });
      return attachFileToTask(
        taskId,
        fileId,
        fileName,
        fileSize,
        fileType,
        fileUrl
      );
    },
    onSuccess: (_, variables) => {
      console.warn("*** useAttachFile onSuccess called ***");
      console.warn("Variables:", variables);
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.taskId, "files"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.taskId],
      });
    },
    onError: (error) => {
      console.error("*** useAttachFile onError called ***");
      console.error("Error:", error);
    },
  });
}

/**
 * Hook para desadjuntar archivo de tarea
 */
export function useDetachFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, fileId }: { taskId: string; fileId: string }) => {
      console.warn("useDetachFile mutationFn called with:", { taskId, fileId });
      return detachFileFromTask(taskId, fileId);
    },
    onSuccess: (_, variables) => {
      console.warn("useDetachFile onSuccess called with:", variables);
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.taskId, "files"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["tasks", variables.taskId],
      });
    },
    onError: (error) => {
      console.error("Failed to detach file:", error);
    },
  });
}
