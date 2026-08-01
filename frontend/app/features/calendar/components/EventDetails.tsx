/**
 * EventDetails component
 * Displays detailed information about a calendar event
 */

import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ReminderManager } from "~/features/calendar/components/ReminderManager";
import {
  useEventReminders,
  useCreateReminder,
  useDeleteReminder,
} from "~/features/calendar/hooks/useCalendar";
import type {
  CalendarEvent,
  Calendar,
  EventReminderCreate,
} from "~/features/calendar/types/calendar.types";

interface EventDetailsProps {
  event: CalendarEvent;
  calendars: Calendar[];
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  onClose?: () => void;
}

export function EventDetails({
  event,
  calendars,
  onEdit,
  onDelete,
  onClose,
}: EventDetailsProps) {
  const { t, language } = useTranslation();
  const dateLocale = language === "en" ? enUS : es;

  // Reminders hooks
  const { data: remindersData, isLoading: remindersLoading } =
    useEventReminders(event.id);
  const createReminder = useCreateReminder();
  const deleteReminder = useDeleteReminder();

  // Extract reminders array from response
  const reminders = remindersData?.data || [];

  // Reminder handlers
  const handleAddReminder = (reminder: Omit<EventReminderCreate, "id">) => {
    createReminder.mutate({
      eventId: event.id,
      payload: reminder,
    });
  };

  const handleUpdateReminder = (
    id: string,
    reminder: Omit<EventReminderCreate, "id">
  ) => {
    // For now, we don't have update functionality in the backend
    // This would require implementing an update endpoint
    console.log("Update reminder:", id, reminder);
  };

  const handleDeleteReminder = (id: string) => {
    deleteReminder.mutate(id);
  };

  const getCalendarColor = (calendarId: string) => {
    const calendar = calendars.find((c) => c.id === calendarId);
    return calendar?.color || "#023E87";
  };

  const getCalendarName = (calendarId: string) => {
    const calendar = calendars.find((c) => c.id === calendarId);
    return calendar?.name || t("common.unknown");
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP", { locale: dateLocale });
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm");
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "PPP p", { locale: dateLocale });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: getCalendarColor(event.calendar_id) }}
          />
          <h2 className="text-xl font-bold">{event.title}</h2>
        </div>
        <div className="flex space-x-2">
          {onEdit && (
            <Button variant="outline" onClick={() => onEdit(event)}>
              {t("common.edit")}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              onClick={() => onDelete(event)}
              className="text-destructive hover:text-destructive"
            >
              {t("common.delete")}
            </Button>
          )}
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              {t("common.close")}
            </Button>
          )}
        </div>
      </div>

      {/* Event Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t("calendar.events.details")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Calendar */}
          <div className="flex items-center space-x-2">
            <span className="font-medium">
              {t("calendar.events.calendar")}:
            </span>
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getCalendarColor(event.calendar_id) }}
              />
              <span>{getCalendarName(event.calendar_id)}</span>
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{t("calendar.events.date")}:</span>
              <span>
                {event.all_day
                  ? formatDate(event.start_time)
                  : formatDateTime(event.start_time)}
              </span>
            </div>
            {!event.all_day && (
              <div className="flex items-center space-x-2">
                <span className="font-medium">
                  {t("calendar.events.time")}:
                </span>
                <span>
                  {formatTime(event.start_time)} - {formatTime(event.end_time)}
                </span>
              </div>
            )}
            {event.all_day && (
              <Badge variant="outline">{t("calendar.events.allDay")}</Badge>
            )}
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center space-x-2">
              <span className="font-medium">
                {t("calendar.events.location")}:
              </span>
              <span>{event.location}</span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <span className="font-medium">
                {t("calendar.events.description")}:
              </span>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurrence */}
      {event.recurrence_type !== "none" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("calendar.events.recurrence")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="font-medium">
                  {t("calendar.recurrence.type")}:
                </span>
                <span>{t(`calendar.recurrence.${event.recurrence_type}`)}</span>
              </div>
              {event.recurrence_interval && event.recurrence_interval > 1 && (
                <div className="flex items-center space-x-2">
                  <span className="font-medium">
                    {t("calendar.recurrence.interval")}:
                  </span>
                  <span>{event.recurrence_interval}</span>
                </div>
              )}
              {event.recurrence_count && (
                <div className="flex items-center space-x-2">
                  <span className="font-medium">
                    {t("calendar.recurrence.count")}:
                  </span>
                  <span>
                    {event.recurrence_count}{" "}
                    {t("calendar.recurrence.occurrences")}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reminders */}
      <ReminderManager
        eventId={event.id}
        reminders={reminders}
        onAddReminder={handleAddReminder}
        onUpdateReminder={handleUpdateReminder}
        onDeleteReminder={handleDeleteReminder}
        disabled={remindersLoading}
      />
    </div>
  );
}
