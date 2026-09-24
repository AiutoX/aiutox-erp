/**
 * useReminders hook
 * Convenience wrapper around useEventReminders, useCreateReminder, useDeleteReminder
 * for simplified reminder CRUD in components.
 */

import {
  useEventReminders,
  useCreateReminder,
  useDeleteReminder,
} from "~/features/calendar/hooks/useCalendar";
import type { EventReminderCreate } from "~/features/calendar/types/calendar.types";

interface UseRemindersOptions {
  enabled?: boolean;
}

/**
 * Hook that provides a unified API for managing event reminders.
 * Combines query + mutations from useCalendar into a single interface.
 */
export function useReminders(
  eventId: string,
  options: UseRemindersOptions = {}
) {
  const { enabled = true } = options;

  const {
    data: reminders,
    isLoading,
    error,
  } = useEventReminders(eventId, undefined);

  const createMutation = useCreateReminder();
  const deleteMutation = useDeleteReminder();

  const createReminder = (data: Omit<EventReminderCreate, "id">) => {
    createMutation.mutate({
      eventId,
      payload: data,
    });
  };

  const deleteReminder = (reminderId: string) => {
    deleteMutation.mutate(reminderId);
  };

  return {
    reminders: reminders ?? [],
    isLoading: enabled ? isLoading : false,
    error,
    createReminder,
    deleteReminder,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
