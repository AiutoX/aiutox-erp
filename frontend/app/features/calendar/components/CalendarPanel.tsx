/**
 * CalendarPanel component
 * Shared calendar content for page and modal rendering
 */

import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { EmptyState } from "~/components/common/EmptyState";
import { CalendarView } from "~/features/calendar/components/CalendarView";
import { TaskQuickAdd } from "~/features/tasks/components/TaskQuickAdd";
import { EventDetails } from "~/features/calendar/components/EventDetails";
import { useEventQuickEdit } from "~/features/calendar/hooks/useEventQuickEdit";
import { EventQuickEdit } from "~/features/calendar/components/EventQuickEdit";
import {
  useCalendars,
  useEvents,
  useUpdateEvent,
  useDeleteEvent,
} from "~/features/calendar/hooks/useCalendar";
import { useUpdateTask } from "~/features/tasks/hooks/useTasks";
import { buildMovedEventTimes } from "~/features/calendar/utils/eventDrag";
import type {
  CalendarEvent,
  CalendarViewType,
  EventUpdate,
} from "~/features/calendar/types/calendar.types";

interface CalendarPanelProps {
  showClose?: boolean;
  onClose?: () => void;
}

export function CalendarPanel({ showClose, onClose }: CalendarPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>("month");
  const [showEventForm, setShowEventForm] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [initialDate, setInitialDate] = useState<Date | null>(null);
  const quickEdit = useEventQuickEdit();
  const quickEditAnchorRef = useRef<HTMLDivElement>(null);
  const [quickEditAnchorStyle, setQuickEditAnchorStyle] =
    useState<React.CSSProperties>({});

  const { data: calendarsData, isLoading: calendarsLoading } = useCalendars();
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);
  const eventParams = {
    start_date: format(startDate, "yyyy-MM-dd"),
    end_date: format(endDate, "yyyy-MM-dd"),
  };

  const {
    data: eventsData,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useEvents({
    start_date: eventParams.start_date,
    end_date: eventParams.end_date,
  });

  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();
  const updateTaskMutation = useUpdateTask();

  const calendars = calendarsData?.data || [];
  const hasCalendars = calendars.length > 0;
  const events = eventsData?.data || [];

  const handleEventClick = (
    event: CalendarEvent,
    mouseEvent?: React.MouseEvent
  ) => {
    if (mouseEvent) {
      // Position the invisible anchor near the click for popover
      const rect = (
        mouseEvent.currentTarget as HTMLElement
      ).getBoundingClientRect();
      setQuickEditAnchorStyle({
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: "none",
      });
    }
    quickEdit.open(event);
  };

  const handleOpenFullEdit = () => {
    if (quickEdit.event) {
      setSelectedEvent(quickEdit.event);
      quickEdit.close();
      setShowEventDetails(true);
    }
  };

  const handleRefresh = () => {
    void refetchEvents();
  };

  const handleEventCreate = (date: Date) => {
    setInitialDate(date);
    setSelectedEvent(null);
    setShowEventForm(true);
  };

  const handleEventEdit = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setInitialDate(null);
    setShowEventForm(true);
  };

  const handleEventDelete = (event: CalendarEvent) => {
    if (confirm(t("calendar.events.confirmDelete"))) {
      void deleteEventMutation.mutate(event.id, {
        onSuccess: () => {
          void refetchEvents();
          setShowEventDetails(false);
        },
      });
    }
  };

  const handleEventMove = (
    event: CalendarEvent,
    targetDate: Date,
    options?: { preserveTime: boolean }
  ) => {
    const isTask =
      event.source_type === "task" || event.metadata?.activity_type === "task";

    if (isTask) {
      // Actualizar tarea en su tabla
      const duration = event.end_time
        ? new Date(event.end_time).getTime() -
          new Date(event.start_time).getTime()
        : 0;
      const newStart = options?.preserveTime
        ? combineDateAndTime(targetDate, event.start_time)
        : targetDate.toISOString();
      const newEnd = event.end_time
        ? options?.preserveTime
          ? combineDateAndTime(targetDate, event.end_time)
          : new Date(new Date(newStart).getTime() + duration).toISOString()
        : undefined;
      const taskPayload = {
        start_at: newStart,
        end_at: newEnd,
      };

      void updateTaskMutation.mutate({
        id: event.source_id || event.id,
        payload: taskPayload,
      });
    } else {
      // Lógica existente para eventos
      const payload = buildMovedEventTimes(
        event,
        targetDate,
        options?.preserveTime ?? true
      );

      void updateEventMutation.mutate({
        id: event.id,
        payload,
      });
    }
  };

  const handleEventResize = (
    event: CalendarEvent,
    _targetDate: Date,
    _options?: { preserveTime: boolean }
  ) => {
    // El evento ya viene con las fechas actualizadas desde CalendarView
    // Solo necesitamos extraer los cambios y enviarlos al backend
    const payload: EventUpdate = {};

    // Si el evento tiene start_time diferente al original, lo incluimos
    if (event.start_time) {
      payload.start_time = event.start_time;
    }

    // Si el evento tiene end_time diferente al original, lo incluimos
    if (event.end_time) {
      payload.end_time = event.end_time;
    }

    // Actualizar el evento
    void updateEventMutation.mutate({
      id: event.id,
      payload,
    });
  };

  const handleEventDetailsClose = () => {
    setShowEventDetails(false);
    setSelectedEvent(null);
  };

  const combineDateAndTime = (date: Date, time: string): string => {
    const targetDate = new Date(date);
    const timeDate = new Date(time);

    targetDate.setHours(
      timeDate.getHours(),
      timeDate.getMinutes(),
      timeDate.getSeconds(),
      0
    );

    return targetDate.toISOString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t("calendar.title")}</h2>
        <div className="flex space-x-2">
          {showClose && (
            <Button variant="outline" onClick={onClose}>
              {t("common.close")}
            </Button>
          )}
          <Button onClick={handleRefresh}>{t("common.refresh")}</Button>
          <Button
            onClick={() => void handleEventCreate(new Date())}
            disabled={!hasCalendars}
          >
            {t("calendar.events.create")}
          </Button>
        </div>
      </div>

      {!hasCalendars && !calendarsLoading ? (
        <EmptyState
          title={t("calendar.emptyTitle")}
          description={t("calendar.emptyDescription")}
          action={
            <Button
              onClick={() => {
                void navigate("/tasks/settings");
              }}
            >
              {t("calendar.emptyAction")}
            </Button>
          }
        />
      ) : (
        <CalendarView
          events={events}
          calendars={calendars}
          viewType={viewType}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onViewTypeChange={setViewType}
          onEventClick={handleEventClick}
          onEventCreate={handleEventCreate}
          onEventMove={handleEventMove}
          onEventResize={handleEventResize}
          loading={eventsLoading}
        />
      )}

      {/* Quick Edit Popover - positioned at clicked event */}
      {quickEdit.event && (
        <EventQuickEdit
          event={quickEdit.event}
          open={quickEdit.isOpen}
          onOpenChange={(open) => {
            if (!open) quickEdit.close();
          }}
          onSave={quickEdit.save}
          onOpenFull={handleOpenFullEdit}
          isSaving={quickEdit.isSaving}
        >
          <div
            ref={quickEditAnchorRef}
            style={quickEditAnchorStyle}
            aria-hidden="true"
          />
        </EventQuickEdit>
      )}

      <Dialog
        open={showEventForm}
        onOpenChange={(open) => setShowEventForm(open)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Crear Evento</DialogTitle>
          <TaskQuickAdd
            open={showEventForm}
            onOpenChange={(open) => setShowEventForm(open)}
            initialStartDate={initialDate || undefined}
            initialEndDate={
              initialDate
                ? new Date(initialDate.getTime() + 60 * 60 * 1000)
                : undefined
            }
            defaultMode="event"
            onTaskCreated={() => {
              setShowEventForm(false);
              setInitialDate(null);
              void refetchEvents();
            }}
            onFormReset={() => {
              setSelectedEvent(null);
              setInitialDate(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEventDetails}
        onOpenChange={(open) => setShowEventDetails(open)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Detalles del Evento</DialogTitle>
          {selectedEvent && (
            <EventDetails
              event={selectedEvent}
              calendars={calendars}
              onEdit={handleEventEdit}
              onDelete={handleEventDelete}
              onClose={handleEventDetailsClose}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
