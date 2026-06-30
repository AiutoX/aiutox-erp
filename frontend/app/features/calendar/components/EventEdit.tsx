/**
 * EventEdit component
 * Event editing form for updating existing calendar events
 */

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Switch } from "~/components/ui/switch";
import { Edit01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useUpdateEvent,
  useDeleteEvent,
  useEventReminders,
  useCreateReminder,
  useDeleteReminder,
} from "~/features/calendar/hooks/useCalendar";
import {
  useEventComments,
  useAddEventComment,
} from "~/features/calendar/hooks/useEventComments";
import {
  useEventFiles,
  useDetachEventFile,
} from "~/features/calendar/hooks/useEventFiles";
import { useTags } from "~/features/tags/hooks/useTags";
import { useUsers } from "~/features/users/hooks/useUsers";
import { MultiSelect } from "~/components/ui/multi-select";
import type {
  CalendarEvent,
  EventUpdate,
  RecurrenceType,
  EventReminderCreate,
  EventReminder,
  ReminderType,
} from "~/features/calendar/types/calendar.types";

interface EventEditProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated?: () => void;
}

export function EventEdit({
  event,
  open,
  onOpenChange,
  onEventUpdated,
}: EventEditProps) {
  const { t } = useTranslation();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const { data: tagList = [] } = useTags();
  const { users } = useUsers({ page_size: 100 });

  // Hooks para comentarios y archivos
  const { data: commentsData } = useEventComments(event?.id || "");
  const addComment = useAddEventComment();
  const { data: filesData } = useEventFiles(event?.id || "");
  const detachFile = useDetachEventFile();

  // Hooks para recordatorios
  const { data: remindersData } = useEventReminders(event?.id || "");
  const createReminder = useCreateReminder();
  const deleteReminder = useDeleteReminder();

  const reminders: EventReminder[] = remindersData?.data || [];
  const [newReminderMinutes, setNewReminderMinutes] = useState(15);
  const [newReminderType, setNewReminderType] =
    useState<ReminderType>("in_app");

  // Handlers para recordatorios
  const handleAddReminder = () => {
    if (!event?.id) return;

    const newReminder: EventReminderCreate = {
      minutes_before: newReminderMinutes,
      reminder_type: newReminderType,
    };
    createReminder.mutate({ eventId: event.id, payload: newReminder });
  };

  const handleDeleteReminder = (reminderId: string) => {
    deleteReminder.mutate(reminderId);
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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteEvent = () => {
    if (!event) return;

    void deleteEvent
      .mutateAsync(event.id)
      .then(() => {
        onEventUpdated?.();
        onOpenChange(false);
      })
      .catch((error) => {
        console.error("Error al eliminar evento:", error);
      });
  };

  const DATE_INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";
  const toDateTimeLocalValue = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return format(date, DATE_INPUT_FORMAT);
  };

  const toUTCISOString = (value?: string | null) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
  };

  const [formData, setFormData] = useState<
    Partial<EventUpdate> & { tag_ids?: string[]; attendee_ids?: string[] }
  >({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    all_day: false,
    location: "",
    status: "confirmed",
    recurrence_type: "none",
    recurrence_interval: 1,
    recurrence_end_date: "",
    recurrence_count: undefined,
    recurrence_days_of_week: "",
    recurrence_day_of_month: undefined,
    recurrence_month_of_year: undefined,
    tag_ids: [],
    attendee_ids: [],
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Update form data when event changes
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || "",
        start_time: toDateTimeLocalValue(event.start_time),
        end_time: toDateTimeLocalValue(event.end_time),
        all_day: event.all_day ?? false,
        location: event.location || "",
        status: event.status || "confirmed",
        recurrence_type: event.recurrence_type || "none",
        recurrence_interval: event.recurrence_interval || 1,
        recurrence_end_date: toDateTimeLocalValue(event.recurrence_end_date),
        recurrence_count: event.recurrence_count ?? undefined,
        recurrence_days_of_week: event.recurrence_days_of_week || "",
        recurrence_day_of_month: event.recurrence_day_of_month ?? undefined,
        recurrence_month_of_year: event.recurrence_month_of_year ?? undefined,
        tag_ids: (event.metadata?.tag_ids as string[]) || [],
        attendee_ids: (event.metadata?.attendee_ids as string[]) || [],
      });
      setFormError(null);
    }
  }, [event]);

  useEffect(() => {
    if (!open) {
      setFormError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!event) return;

    // Validaciones
    if (!formData.title?.trim()) {
      setFormError(
        t("calendar.errors.titleRequired") || "El título es obligatorio"
      );
      return;
    }

    if (!formData.start_time || !formData.end_time) {
      setFormError(
        t("calendar.errors.eventTimesRequired") ||
          "Debes indicar inicio y fin para el evento"
      );
      return;
    }

    if (new Date(formData.end_time) < new Date(formData.start_time)) {
      setFormError(
        t("calendar.errors.invalidEventRange") ||
          "La hora de fin debe ser posterior al inicio"
      );
      return;
    }

    try {
      const payload: EventUpdate = {
        title: formData.title,
        description: formData.description || undefined,
        start_time: toUTCISOString(formData.start_time),
        end_time: toUTCISOString(formData.end_time),
        all_day: Boolean(formData.all_day),
        location: formData.location || undefined,
        status: formData.status,
        recurrence_type: formData.recurrence_type,
        recurrence_interval: formData.recurrence_interval,
        recurrence_end_date: toUTCISOString(formData.recurrence_end_date),
        recurrence_count: formData.recurrence_count,
        recurrence_days_of_week: formData.recurrence_days_of_week || undefined,
        recurrence_day_of_month: formData.recurrence_day_of_month,
        recurrence_month_of_year: formData.recurrence_month_of_year,
        metadata: {
          tag_ids: formData.tag_ids?.length ? formData.tag_ids : undefined,
          attendee_ids: formData.attendee_ids?.length
            ? formData.attendee_ids
            : undefined,
        },
      };

      await updateEvent.mutateAsync({
        id: event.id,
        payload,
      });

      onEventUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error al actualizar evento:", error);
      setFormError(
        t("calendar.errors.updateFailed") || "Error al actualizar el evento"
      );
    }
  };

  const isLoading = updateEvent.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Edit01Icon} size={20} />
            {t("calendar.editEvent") || "Editar Evento"}
          </DialogTitle>
          <DialogDescription>
            {t("calendar.editEventDescription") ||
              "Modifica los detalles del evento"}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className="space-y-4 pr-1"
        >
          {formError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {formError}
            </div>
          )}

          <div>
            <Label htmlFor="edit-title">{t("common.name")} *</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder={
                t("calendar.eventTitlePlaceholder") || "Título del evento"
              }
              required
              autoFocus
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="edit-description">{t("common.description")}</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder={
                t("calendar.eventDescriptionPlaceholder") ||
                "Descripción del evento"
              }
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="edit-all-day"
              checked={formData.all_day}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, all_day: checked })
              }
            />
            <Label htmlFor="edit-all-day">
              {t("calendar.allDay") || "Todo el día"}
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-start-time">
                {t("calendar.startTime")} *
              </Label>
              <Input
                id="edit-start-time"
                type={formData.all_day ? "date" : "datetime-local"}
                value={
                  formData.all_day
                    ? formData.start_time?.split("T")[0]
                    : formData.start_time
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({
                    ...formData,
                    start_time: formData.all_day ? `${value}T00:00` : value,
                  });
                }}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-end-time">{t("calendar.endTime")} *</Label>
              <Input
                id="edit-end-time"
                type={formData.all_day ? "date" : "datetime-local"}
                value={
                  formData.all_day
                    ? formData.end_time?.split("T")[0]
                    : formData.end_time
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({
                    ...formData,
                    end_time: formData.all_day ? `${value}T23:59` : value,
                  });
                }}
                required
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-location">{t("calendar.location")}</Label>
            <Input
              id="edit-location"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder={
                t("calendar.locationPlaceholder") || "Ubicación del evento"
              }
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="edit-status">{t("calendar.status")}</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger id="edit-status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">
                  {t("calendar.statuses.confirmed") || "Confirmado"}
                </SelectItem>
                <SelectItem value="tentative">
                  {t("calendar.statuses.tentative") || "Tentativo"}
                </SelectItem>
                <SelectItem value="cancelled">
                  {t("calendar.statuses.cancelled") || "Cancelado"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sección de Recurrencia */}
          <div className="border-t pt-4 mt-4">
            <Label className="font-medium">{"Recurrencia"}</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label
                  htmlFor="edit-recurrence-type"
                  className="text-sm text-muted-foreground"
                >
                  {t("calendar.recurrenceType") || "Tipo"}
                </Label>
                <Select
                  value={formData.recurrence_type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      recurrence_type: value as RecurrenceType,
                    })
                  }
                >
                  <SelectTrigger id="edit-recurrence-type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t("calendar.recurrenceTypes.none") || "Ninguna"}
                    </SelectItem>
                    <SelectItem value="daily">
                      {t("calendar.recurrenceTypes.daily") || "Diaria"}
                    </SelectItem>
                    <SelectItem value="weekly">
                      {t("calendar.recurrenceTypes.weekly") || "Semanal"}
                    </SelectItem>
                    <SelectItem value="monthly">
                      {t("calendar.recurrenceTypes.monthly") || "Mensual"}
                    </SelectItem>
                    <SelectItem value="yearly">
                      {t("calendar.recurrenceTypes.yearly") || "Anual"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.recurrence_type &&
                formData.recurrence_type !== "none" && (
                  <div>
                    <Label
                      htmlFor="edit-recurrence-interval"
                      className="text-sm text-muted-foreground"
                    >
                      {t("calendar.recurrenceInterval") || "Intervalo"}
                    </Label>
                    <Input
                      id="edit-recurrence-interval"
                      type="number"
                      min={1}
                      value={formData.recurrence_interval}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recurrence_interval: parseInt(e.target.value) || 1,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                )}
            </div>
            {formData.recurrence_type &&
              formData.recurrence_type !== "none" && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <Label
                      htmlFor="edit-recurrence-end"
                      className="text-sm text-muted-foreground"
                    >
                      {t("calendar.recurrenceEndDate") || "Fecha fin"}
                    </Label>
                    <Input
                      id="edit-recurrence-end"
                      type="date"
                      value={formData.recurrence_end_date?.split("T")[0] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recurrence_end_date: e.target.value
                            ? `${e.target.value}T00:00`
                            : "",
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="edit-recurrence-count"
                      className="text-sm text-muted-foreground"
                    >
                      {t("calendar.recurrenceCount") || "Repeticiones"}
                    </Label>
                    <Input
                      id="edit-recurrence-count"
                      type="number"
                      min={1}
                      value={formData.recurrence_count || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recurrence_count: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="Ilimitado"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
          </div>

          {/* Sección de Recordatorios */}
          <div className="border-t pt-4 mt-4">
            <Label className="font-medium mb-2 block">
              {t("calendar.reminders.title") || "Recordatorios"}
            </Label>

            {/* Lista de recordatorios existentes */}
            {reminders.length > 0 && (
              <div className="space-y-2 mb-4">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium">
                        {formatMinutesBefore(reminder.minutes_before)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getReminderTypeLabel(reminder.reminder_type)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReminder(reminder.id!)}
                      disabled={isLoading || !event?.id}
                      className="text-destructive hover:text-destructive h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Agregar nuevo recordatorio */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="edit-reminder-minutes"
                  className="text-sm text-muted-foreground"
                >
                  {t("calendar.reminders.when") || "Cuándo"}
                </Label>
                <Select
                  value={newReminderMinutes.toString()}
                  onValueChange={(value) =>
                    setNewReminderMinutes(parseInt(value))
                  }
                >
                  <SelectTrigger id="edit-reminder-minutes" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">
                      {t("calendar.reminders.at_start_time") || "Al inicio"}
                    </SelectItem>
                    <SelectItem value="5">
                      5{" "}
                      {t("calendar.reminders.minutes_before") ||
                        "minutos antes"}
                    </SelectItem>
                    <SelectItem value="15">
                      15{" "}
                      {t("calendar.reminders.minutes_before") ||
                        "minutos antes"}
                    </SelectItem>
                    <SelectItem value="30">
                      30{" "}
                      {t("calendar.reminders.minutes_before") ||
                        "minutos antes"}
                    </SelectItem>
                    <SelectItem value="60">
                      1 {t("calendar.reminders.hours_before") || "hora antes"}
                    </SelectItem>
                    <SelectItem value="120">
                      2 {t("calendar.reminders.hours_before") || "horas antes"}
                    </SelectItem>
                    <SelectItem value="1440">
                      1 {t("calendar.reminders.days_before") || "día antes"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  htmlFor="edit-reminder-type"
                  className="text-sm text-muted-foreground"
                >
                  {t("calendar.reminders.type") || "Tipo"}
                </Label>
                <Select
                  value={newReminderType}
                  onValueChange={(value) =>
                    setNewReminderType(value as ReminderType)
                  }
                >
                  <SelectTrigger id="edit-reminder-type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_app">
                      {t("calendar.reminders.types.in_app") ||
                        "Notificación en la aplicación"}
                    </SelectItem>
                    <SelectItem value="email">
                      {t("calendar.reminders.types.email") ||
                        "Correo electrónico"}
                    </SelectItem>
                    <SelectItem value="push">
                      {t("calendar.reminders.types.push") ||
                        "Notificación push"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddReminder}
              disabled={isLoading || !event?.id}
              className="mt-3"
            >
              + {t("calendar.reminders.add") || "Agregar recordatorio"}
            </Button>

            {reminders.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {t("calendar.reminders.no_reminders") ||
                  "No hay recordatorios configurados"}
              </p>
            )}
          </div>

          {/* Sección de Tags */}
          <div className="border-t pt-4 mt-4">
            <Label className="font-medium mb-2 block">
              {t("tags.title") || "Tags"}
            </Label>
            <MultiSelect
              options={tagList.map((tag) => ({
                value: tag.id,
                label: tag.name,
              }))}
              selected={formData.tag_ids || []}
              onChange={(values) =>
                setFormData({ ...formData, tag_ids: values })
              }
              placeholder={t("tags.select") || "Seleccionar tags"}
              label={t("tags.title") || "Tags"}
            />
          </div>

          {/* Sección de Participantes */}
          <div className="border-t pt-4 mt-4">
            <Label className="font-medium mb-2 block">
              {t("calendar.attendees") || "Participantes"}
            </Label>
            <MultiSelect
              options={users.map((u) => ({
                value: u.id,
                label: `${u.first_name} ${u.last_name}`.trim() || u.email,
              }))}
              selected={formData.attendee_ids || []}
              onChange={(values) =>
                setFormData({ ...formData, attendee_ids: values })
              }
              placeholder={
                t("calendar.selectAttendees") || "Seleccionar participantes..."
              }
              label={t("calendar.attendees") || "Participantes"}
            />
          </div>

          {/* Sección de Archivos */}
          {event && (
            <div className="border-t pt-4 mt-4">
              <Label className="font-medium mb-2 block">
                {t("common.files") || "Archivos"}
              </Label>
              <div className="space-y-2">
                {filesData?.data?.map((file) => (
                  <div
                    key={file.file_id}
                    className="flex items-center justify-between bg-muted p-2 rounded"
                  >
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate"
                    >
                      {file.file_name}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        detachFile.mutate({
                          eventId: event.id,
                          fileId: file.file_id,
                        })
                      }
                      disabled={detachFile.isPending}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // TODO: implementar upload a storage
                      console.warn("Upload file:", file.name);
                    }
                  }}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {/* Sección de Comentarios */}
          {event && (
            <div className="border-t pt-4 mt-4">
              <Label className="font-medium mb-2 block">
                {t("common.comments") || "Comentarios"}
              </Label>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {commentsData?.data?.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-muted p-3 rounded text-sm"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium">
                        {comment.author?.first_name} {comment.author?.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1">{comment.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder={
                    t("comments.addPlaceholder") || "Agregar comentario..."
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      addComment.mutate({
                        eventId: event.id,
                        comment: { content: e.currentTarget.value },
                      });
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t("common.cancel")}
            </Button>
            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
              >
                {t("common.delete")}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isLoading}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteEvent}
                  disabled={deleteEvent.isPending || isLoading}
                >
                  {deleteEvent.isPending
                    ? t("common.deleting")
                    : t("calendar.confirmDelete") || "Confirmar Eliminación"}
                </Button>
              </>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
