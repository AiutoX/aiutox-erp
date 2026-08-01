/**
 * Event Files Hooks
 * TanStack Query hooks for event file attachments, backed by the shared files module
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  uploadFile,
  listFiles,
  deleteFile,
  type File as UploadedFile,
} from "~/lib/api/files.api";

export type EventFileAttachment = UploadedFile;

const CALENDAR_EVENT_ENTITY_TYPE = "calendar_event";

/**
 * Listar archivos de un evento
 */
export function listEventFiles(eventId: string) {
  return listFiles({
    entity_type: CALENDAR_EVENT_ENTITY_TYPE,
    entity_id: eventId,
  });
}

/**
 * Subir y adjuntar un archivo a un evento
 */
export function attachFileToEvent(eventId: string, file: globalThis.File) {
  return uploadFile(file, {
    entity_type: CALENDAR_EVENT_ENTITY_TYPE,
    entity_id: eventId,
  });
}

/**
 * Eliminar un archivo adjunto de un evento
 */
export function detachFileFromEvent(fileId: string) {
  return deleteFile(fileId);
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
 * Hook para subir y adjuntar un archivo a un evento
 */
export function useAttachEventFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, file }: { eventId: string; file: globalThis.File }) =>
      attachFileToEvent(eventId, file),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["events", variables.eventId, "files"],
      });
    },
  });
}

/**
 * Hook para eliminar un archivo adjunto de un evento
 */
export function useDetachEventFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId }: { eventId: string; fileId: string }) =>
      detachFileFromEvent(fileId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["events", variables.eventId, "files"],
      });
    },
  });
}
