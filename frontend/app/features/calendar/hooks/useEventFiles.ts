/**
 * Event Files Hooks
 * TanStack Query hooks for event file attachments
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

export interface EventFileAttachment {
  file_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  attached_at: string;
  attached_by: string;
}

/**
 * Hook para listar archivos de un evento
 */
export function useEventFiles(eventId: string) {
  return useQuery({
    queryKey: ["events", eventId, "files"],
    queryFn: () => listEventFiles(eventId),
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2,
    enabled: !!eventId,
  });
}

/**
 * Hook para adjuntar archivo a evento
 */
export function useAttachEventFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      fileId,
      fileName,
      fileSize,
      fileType,
      fileUrl,
    }: {
      eventId: string;
      fileId: string;
      fileName: string;
      fileSize: number;
      fileType: string;
      fileUrl: string;
    }) =>
      attachFileToEvent(eventId, fileId, fileName, fileSize, fileType, fileUrl),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["events", variables.eventId, "files"],
      });
    },
  });
}

/**
 * Hook para desadjuntar archivo de evento
 */
export function useDetachEventFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, fileId }: { eventId: string; fileId: string }) =>
      detachFileFromEvent(eventId, fileId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["events", variables.eventId, "files"],
      });
    },
  });
}

/**
 * Listar archivos de un evento
 */
export async function listEventFiles(
  eventId: string
): Promise<StandardListResponse<EventFileAttachment>> {
  const response = await apiClient.get(`/events/${eventId}/files`);
  return response.data;
}

/**
 * Adjuntar archivo a evento
 */
export async function attachFileToEvent(
  eventId: string,
  fileId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  fileUrl: string
): Promise<StandardResponse<EventFileAttachment>> {
  const params = new URLSearchParams();
  params.append("file_id", fileId);
  params.append("file_name", fileName);
  params.append("file_size", fileSize.toString());
  params.append("file_type", fileType);
  params.append("file_url", fileUrl);

  const response = await apiClient.post(
    `/events/${eventId}/files?${params.toString()}`
  );
  return response.data;
}

/**
 * Desadjuntar archivo de evento
 */
export async function detachFileFromEvent(
  eventId: string,
  fileId: string
): Promise<StandardResponse<void>> {
  const response = await apiClient.delete(`/events/${eventId}/files/${fileId}`);
  return response.data;
}
