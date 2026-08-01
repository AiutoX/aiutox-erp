/**
 * EventForm component
 * Form for creating and editing calendar events
 */

import { useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
  RecurrenceEditor,
  type RecurrenceConfig,
} from "~/features/calendar/components/RecurrenceEditor";
import { ReminderManager } from "~/features/calendar/components/ReminderManager";
import {
  configToBackend,
  backendToConfig,
} from "~/features/calendar/utils/recurrence";
import type {
  CalendarEvent,
  EventCreate,
  Calendar,
  EventReminderCreate,
} from "~/features/calendar/types/calendar.types";

interface EventFormProps {
  event?: CalendarEvent;
  calendars: Calendar[];
  initialDate?: Date;
  onSubmit: (payload: {
    event: EventCreate;
    reminders: EventReminderCreate[];
  }) => void;
  onCancel?: () => void;
  loading?: boolean;
  mode?: "quick" | "full";
}

export function EventForm({
  event,
  calendars,
  initialDate,
  onSubmit,
  onCancel,
  loading = false,
  mode = "full",
}: EventFormProps) {
  const isFullMode = mode === "full";
  const { t } = useTranslation();

  const initialStartTime = event
    ? event.all_day
      ? format(new Date(event.start_time), "yyyy-MM-dd")
      : event.start_time
    : format(initialDate || new Date(), "yyyy-MM-dd'T'HH:mm");
  const initialEndTime = event
    ? event.all_day
      ? format(new Date(event.end_time), "yyyy-MM-dd")
      : event.end_time
    : format(initialDate || new Date(), "yyyy-MM-dd'T'HH:mm");

  const [formData, setFormData] = useState<EventCreate>({
    calendar_id: event?.calendar_id || calendars[0]?.id || "",
    title: event?.title || "",
    description: event?.description || "",
    start_time: initialStartTime,
    end_time: initialEndTime,
    location: event?.location || "",
    all_day: event?.all_day || false,
    recurrence_type: event?.recurrence_type || "none",
    recurrence_interval: event?.recurrence_interval || 1,
  });

  // Reminders state
  const [reminders, setReminders] = useState<EventReminderCreate[]>([]);

  // Initialize recurrence config from event
  const [recurrenceConfig, setRecurrenceConfig] =
    useState<RecurrenceConfig | null>(() => {
      if (event) {
        return backendToConfig({
          recurrence_type: event.recurrence_type,
          recurrence_interval: event.recurrence_interval,
          recurrence_end_date: event.recurrence_end_date || undefined,
          recurrence_days_of_week: event.recurrence_days_of_week || undefined,
        });
      }
      return null;
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizeAllDayTimestamp = (value: string, isEnd: boolean) => {
      if (!value) {
        return value;
      }

      const dateOnly = value.split("T")[0];
      return `${dateOnly}T${isEnd ? "23:59:59" : "00:00:00"}`;
    };

    // Convert recurrence config to backend format
    const recurrenceData = configToBackend(recurrenceConfig);

    // Type assertion to ensure compatibility with EventCreate
    const typedRecurrenceData = {
      recurrence_type: recurrenceData.recurrence_type as
        | "none"
        | "daily"
        | "weekly"
        | "monthly"
        | "yearly",
      recurrence_interval: recurrenceData.recurrence_interval,
      recurrence_end_date: recurrenceData.recurrence_end_date,
      recurrence_days_of_week: recurrenceData.recurrence_days_of_week,
    };

    const payload = formData.all_day
      ? {
          ...formData,
          ...typedRecurrenceData,
          start_time: normalizeAllDayTimestamp(formData.start_time, false),
          end_time: normalizeAllDayTimestamp(formData.end_time, true),
        }
      : {
          ...formData,
          ...typedRecurrenceData,
        };

    onSubmit({ event: payload, reminders });
  };

  const handleFieldChange = (
    field: keyof typeof formData,
    value: string | boolean | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Reminder handlers
  const handleAddReminder = (reminder: Omit<EventReminderCreate, "id">) => {
    setReminders((prev) => [...prev, reminder]);
  };

  const handleUpdateReminder = (
    id: string,
    reminder: Omit<EventReminderCreate, "id">
  ) => {
    setReminders((prev) =>
      prev.map((r, index) => (index.toString() === id ? reminder : r))
    );
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((_, index) => index.toString() !== id));
  };

  const handleAllDayToggle = (isAllDay: boolean) => {
    setFormData((prev) => {
      if (isAllDay) {
        // Set to all day (remove time component)
        const startDate = new Date(prev.start_time);
        const endDate = new Date(prev.end_time);
        return {
          ...prev,
          all_day: true,
          start_time: format(startDate, "yyyy-MM-dd"),
          end_time: format(endDate, "yyyy-MM-dd"),
        };
      } else {
        // Set to specific time (add current time)
        const now = new Date();
        const startDate = new Date(prev.start_time);
        const endDate = new Date(prev.end_time);
        startDate.setHours(now.getHours(), now.getMinutes(), 0, 0);
        endDate.setHours(now.getHours() + 1, now.getMinutes(), 0, 0);
        return {
          ...prev,
          all_day: false,
          start_time: format(startDate, "yyyy-MM-dd'T'HH:mm"),
          end_time: format(endDate, "yyyy-MM-dd'T'HH:mm"),
        };
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {event
              ? `${t("calendar.events.edit")}: Evento`
              : t("calendar.events.create")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Calendar - full mode only */}
            {isFullMode && (
              <div className="space-y-2">
                <Label htmlFor="calendar">
                  {t("calendar.events.calendar")}
                </Label>
                <Select
                  value={formData.calendar_id}
                  onValueChange={(value) =>
                    handleFieldChange("calendar_id", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("calendar.events.calendarPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: calendar.color || undefined,
                            }}
                          />
                          <span>{calendar.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t("calendar.events.title")}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                placeholder={t("calendar.events.titlePlaceholder")}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                {t("calendar.events.description")}
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleFieldChange("description", e.target.value)
                }
                placeholder={t("calendar.events.descriptionPlaceholder")}
                rows={3}
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">
                  {t("calendar.events.startTime")}
                </Label>
                <Input
                  id="start_time"
                  type={formData.all_day ? "date" : "datetime-local"}
                  value={formData.start_time}
                  onChange={(e) =>
                    handleFieldChange("start_time", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">{t("calendar.events.endTime")}</Label>
                <Input
                  id="end_time"
                  type={formData.all_day ? "date" : "datetime-local"}
                  value={formData.end_time}
                  onChange={(e) =>
                    handleFieldChange("end_time", e.target.value)
                  }
                  required
                />
              </div>
            </div>

            {/* All Day - full mode only */}
            {isFullMode && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="all_day"
                  checked={formData.all_day}
                  onCheckedChange={handleAllDayToggle}
                />
                <Label htmlFor="all_day">{t("calendar.events.allDay")}</Label>
              </div>
            )}

            {/* Location - full mode only */}
            {isFullMode && (
              <div className="space-y-2">
                <Label htmlFor="location">
                  {t("calendar.events.location")}
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    handleFieldChange("location", e.target.value)
                  }
                  placeholder={t("calendar.events.locationPlaceholder")}
                />
              </div>
            )}

            {/* Recurrence - full mode only */}
            {isFullMode && (
              <div className="space-y-2">
                <RecurrenceEditor
                  value={recurrenceConfig}
                  onChange={setRecurrenceConfig}
                  startDate={new Date(formData.start_time)}
                />
              </div>
            )}

            {/* Reminders - full mode only */}
            {isFullMode && (
              <ReminderManager
                eventId={event?.id || "new"}
                reminders={reminders.map((r, index) => ({
                  ...r,
                  id: index.toString(),
                }))}
                onAddReminder={handleAddReminder}
                onUpdateReminder={handleUpdateReminder}
                onDeleteReminder={handleDeleteReminder}
                disabled={loading}
              />
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  {t("common.cancel")}
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
