/**
 * ReminderManager Component
 *
 * Component for managing event reminders.
 * Provides UI to add, edit, and delete reminders for calendar events.
 */

import React, { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Plus, Trash2, Edit, Bell, Mail, Smartphone } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { EventReminder, ReminderType } from "../types/calendar.types";

interface ReminderManagerProps {
  eventId?: string;
  reminders: EventReminder[];
  onAddReminder: (reminder: Omit<EventReminder, "id">) => void;
  onUpdateReminder: (id: string, reminder: Omit<EventReminder, "id">) => void;
  onDeleteReminder: (id: string) => void;
  disabled?: boolean;
}

export function ReminderManager({
  reminders,
  onAddReminder,
  onUpdateReminder,
  onDeleteReminder,
  disabled = false,
}: ReminderManagerProps) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);

  const getReminderIcon = (type: ReminderType) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "in_app":
        return <Bell className="h-4 w-4" />;
      case "push":
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getReminderTypeLabel = (type: ReminderType) => {
    switch (type) {
      case "email":
        return t("calendar.reminders.types.email");
      case "in_app":
        return t("calendar.reminders.types.in_app");
      case "push":
        return t("calendar.reminders.types.push");
      default:
        return type;
    }
  };

  const formatMinutesBefore = (minutes: number) => {
    if (minutes === 0) {
      return t("calendar.reminders.at_start_time");
    } else if (minutes < 60) {
      return `${minutes} ${t("calendar.reminders.minutes_before")}`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} ${t("calendar.reminders.hours_before")}`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} ${t("calendar.reminders.days_before")}`;
    }
  };

  const handleAddReminder = () => {
    // Default reminder: 15 minutes before, in-app notification
    const newReminder: Omit<EventReminder, "id"> = {
      minutes_before: 15,
      reminder_type: "in_app",
    };
    onAddReminder(newReminder);
  };

  const handleEditReminder = (reminder: EventReminder) => {
    setEditingId(reminder.id || null);
  };

  const handleSaveReminder = (
    id: string,
    reminder: Omit<EventReminder, "id">
  ) => {
    onUpdateReminder(id, reminder);
    setEditingId(null);
  };

  const handleDeleteReminder = (id: string) => {
    onDeleteReminder(id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t("calendar.reminders.title")}
        </h3>
        <Button
          onClick={handleAddReminder}
          disabled={disabled}
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("calendar.reminders.add")}
        </Button>
      </div>

      {reminders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t("calendar.reminders.no_reminders")}
            </p>
            <Button
              onClick={handleAddReminder}
              disabled={disabled}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("calendar.reminders.add_first")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <Card key={reminder.id}>
              <CardContent className="p-4">
                {editingId === reminder.id ? (
                  <ReminderForm
                    reminder={reminder}
                    onSave={(updatedReminder) =>
                      handleSaveReminder(reminder.id!, updatedReminder)
                    }
                    onCancel={handleCancelEdit}
                    disabled={disabled}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getReminderIcon(reminder.reminder_type)}
                      <div>
                        <div className="font-medium">
                          {formatMinutesBefore(reminder.minutes_before)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getReminderTypeLabel(reminder.reminder_type)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {formatMinutesBefore(reminder.minutes_before)}
                      </Badge>
                      <Button
                        onClick={() => handleEditReminder(reminder)}
                        disabled={disabled}
                        variant="ghost"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteReminder(reminder.id!)}
                        disabled={disabled}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface ReminderFormProps {
  reminder?: EventReminder;
  onSave: (reminder: Omit<EventReminder, "id">) => void;
  onCancel: () => void;
  disabled?: boolean;
}

function ReminderForm({
  reminder,
  onSave,
  onCancel,
  disabled = false,
}: ReminderFormProps) {
  const { t } = useTranslation();
  const [minutesBefore, setMinutesBefore] = useState(
    reminder?.minutes_before || 15
  );
  const [reminderType, setReminderType] = useState<ReminderType>(
    reminder?.reminder_type || "in_app"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      minutes_before: minutesBefore,
      reminder_type: reminderType,
    });
  };

  const presetOptions = [
    { label: t("calendar.reminders.at_start_time"), value: 0 },
    { label: `5 ${t("calendar.reminders.minutes_before")}`, value: 5 },
    { label: `15 ${t("calendar.reminders.minutes_before")}`, value: 15 },
    { label: `30 ${t("calendar.reminders.minutes_before")}`, value: 30 },
    { label: `1 ${t("calendar.reminders.hours_before")}`, value: 60 },
    { label: `2 ${t("calendar.reminders.hours_before")}`, value: 120 },
    { label: `1 ${t("calendar.reminders.days_before")}`, value: 1440 },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("calendar.reminders.when")}
          </label>
          <select
            value={minutesBefore}
            onChange={(e) => setMinutesBefore(Number(e.target.value))}
            disabled={disabled}
            className="w-full p-2 border rounded-md"
          >
            {presetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("calendar.reminders.type")}
          </label>
          <select
            value={reminderType}
            onChange={(e) => setReminderType(e.target.value as ReminderType)}
            disabled={disabled}
            className="w-full p-2 border rounded-md"
          >
            <option value="in_app">
              {t("calendar.reminders.types.in_app")}
            </option>
            <option value="email">{t("calendar.reminders.types.email")}</option>
            <option value="push">{t("calendar.reminders.types.push")}</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          variant="outline"
          size="sm"
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={disabled} size="sm">
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
