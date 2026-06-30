/**
 * Calendar hooks
 * Provides TanStack Query hooks for calendar module
 * Following frontend-api.md rules
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCalendars,
  getCalendar,
  createCalendar,
  updateCalendar,
  deleteCalendar,
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  createReminder,
  listEventReminders,
  deleteReminder,
  updateAttendeeStatus,
} from "~/features/calendar/api/calendar.api";
import type {
  CalendarUpdate,
  CalendarListParams,
  EventUpdate,
  EventListParams,
  EventReminderCreate,
} from "~/features/calendar/types/calendar.types";

// Calendars Query hooks
export function useCalendars(params?: CalendarListParams) {
  return useQuery({
    queryKey: ["calendars", params],
    queryFn: () => listCalendars(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useCalendar(id: string) {
  return useQuery({
    queryKey: ["calendars", id],
    queryFn: () => getCalendar(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!id,
  });
}

// Calendars Mutation hooks
export function useCreateCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCalendar,
    onSuccess: () => {
      // Invalidate calendars list queries
      void queryClient.invalidateQueries({ queryKey: ["calendars"] });
    },
    onError: (error) => {
      console.error("Failed to create calendar:", error);
    },
  });
}

export function useUpdateCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CalendarUpdate }) =>
      updateCalendar(id, payload),
    onSuccess: (_, variables) => {
      // Invalidate specific calendar and list queries
      void queryClient.invalidateQueries({ queryKey: ["calendars"] });
      void queryClient.invalidateQueries({
        queryKey: ["calendars", variables.id],
      });
    },
    onError: (error) => {
      console.error("Failed to update calendar:", error);
    },
  });
}

export function useDeleteCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCalendar,
    onSuccess: () => {
      // Invalidate calendars list queries
      void queryClient.invalidateQueries({ queryKey: ["calendars"] });
    },
    onError: (error) => {
      console.error("Failed to delete calendar:", error);
    },
  });
}

// Events Query hooks
export function useEvents(params?: EventListParams) {
  console.warn("useEvents called with params:", params);
  return useQuery({
    queryKey: ["events", params],
    queryFn: () => listEvents(params),
    staleTime: 1000 * 60 * 2, // 2 minutes - events change more frequently
    retry: 2,
    enabled: true, // Asegurar que siempre esté habilitado para debug
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ["events", id],
    queryFn: () => getEvent(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!id,
  });
}

// Events Mutation hooks
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      // Invalidate events list queries
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error) => {
      console.error("Failed to create event:", error);
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EventUpdate }) =>
      updateEvent(id, payload),
    onSuccess: (_, variables) => {
      // Invalidate specific event and list queries
      void queryClient.invalidateQueries({
        queryKey: ["events", variables.id],
      });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error) => {
      console.error("Failed to update event:", error);
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      // Invalidate events list queries
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error) => {
      console.error("Failed to delete event:", error);
    },
  });
}

// Event Reminders Query hooks
export function useEventReminders(
  eventId: string,
  params?: { page?: number; page_size?: number }
) {
  return useQuery({
    queryKey: ["events", eventId, "reminders", params],
    queryFn: () => listEventReminders(eventId, params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!eventId,
  });
}

// Event Reminders Mutation hooks
export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      payload,
    }: {
      eventId: string;
      payload: EventReminderCreate;
    }) => createReminder(eventId, payload),
    onSuccess: (_, variables) => {
      // Invalidate specific event reminders query
      void queryClient.invalidateQueries({
        queryKey: ["events", variables.eventId, "reminders"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["events", variables.eventId],
      });
    },
    onError: (error) => {
      console.error("Failed to create reminder:", error);
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reminderId: string) => deleteReminder(reminderId),
    onSuccess: (_, _reminderId) => {
      // Invalidate all reminders queries since we don't know which event
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error) => {
      console.error("Failed to delete reminder:", error);
    },
  });
}

// Event Attendees Mutation hooks
export function useUpdateAttendeeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      status,
    }: {
      eventId: string;
      status: "accepted" | "declined" | "tentative";
    }) => updateAttendeeStatus(eventId, status),
    onSuccess: (_, variables) => {
      // Invalidate specific event query
      void queryClient.invalidateQueries({
        queryKey: ["events", variables.eventId],
      });
    },
    onError: (error) => {
      console.error("Failed to update attendee status:", error);
    },
  });
}
