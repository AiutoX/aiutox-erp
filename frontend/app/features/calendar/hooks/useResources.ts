import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CalendarResourceCreate,
  CalendarResourceUpdate,
  EventResourceCreate,
  ResourceListParams,
} from "../types/calendar.types";
import { calendarResourcesApi } from "../api/calendar-resources.api";

/**
 * Hook para obtener lista de recursos
 */
export function useResources(params?: ResourceListParams) {
  return useQuery({
    queryKey: ["calendar", "resources", params],
    queryFn: () => calendarResourcesApi.getResources(params),
  });
}

/**
 * Hook para obtener un recurso específico
 */
export function useResource(resourceId: string | undefined) {
  return useQuery({
    queryKey: ["calendar", "resources", resourceId],
    queryFn: () => calendarResourcesApi.getResource(resourceId!),
    enabled: !!resourceId,
  });
}

/**
 * Hook para crear un recurso
 */
export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CalendarResourceCreate) =>
      calendarResourcesApi.createResource(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar", "resources"] });
    },
  });
}

/**
 * Hook para actualizar un recurso
 */
export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CalendarResourceUpdate }) =>
      calendarResourcesApi.updateResource(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["calendar", "resources"] });
      queryClient.invalidateQueries({
        queryKey: ["calendar", "resources", variables.id],
      });
    },
  });
}

/**
 * Hook para eliminar un recurso
 */
export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => calendarResourcesApi.deleteResource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar", "resources"] });
    },
  });
}

/**
 * Hook para obtener recursos de un evento
 */
export function useEventResources(eventId: string | undefined) {
  return useQuery({
    queryKey: ["calendar", "events", eventId, "resources"],
    queryFn: () => calendarResourcesApi.getEventResources(eventId!),
    enabled: !!eventId,
  });
}

/**
 * Hook para asignar un recurso a un evento
 */
export function useAssignResourceToEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string;
      data: EventResourceCreate;
    }) => calendarResourcesApi.assignResourceToEvent(eventId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["calendar", "events", variables.eventId, "resources"],
      });
      queryClient.invalidateQueries({ queryKey: ["calendar", "events"] });
    },
  });
}

/**
 * Hook para remover un recurso de un evento
 */
export function useRemoveResourceFromEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      resourceId,
    }: {
      eventId: string;
      resourceId: string;
    }) => calendarResourcesApi.removeResourceFromEvent(eventId, resourceId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["calendar", "events", variables.eventId, "resources"],
      });
      queryClient.invalidateQueries({ queryKey: ["calendar", "events"] });
    },
  });
}

/**
 * Hook para verificar disponibilidad de recurso
 */
export function useCheckResourceAvailability() {
  return useMutation({
    mutationFn: ({
      resourceId,
      startTime,
      endTime,
      excludeEventId,
    }: {
      resourceId: string;
      startTime: string;
      endTime: string;
      excludeEventId?: string;
    }) =>
      calendarResourcesApi.checkResourceAvailability(
        resourceId,
        startTime,
        endTime,
        excludeEventId
      ),
  });
}
