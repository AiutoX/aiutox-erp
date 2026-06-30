import { useCallback, useMemo } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { CalendarEvent } from "../types/calendar.types";
import { useTranslation } from "~/lib/i18n/useTranslation";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  es: es,
  en: enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarGridProps {
  events: CalendarEvent[];
  view: View;
  date: Date;
  onNavigate: (date: Date) => void;
  onView: (view: View) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date; action: string }) => void;
  onEventDrop?: (args: {
    event: CalendarEvent;
    start: Date;
    end: Date;
  }) => void;
  onEventResize?: (args: {
    event: CalendarEvent;
    start: Date;
    end: Date;
  }) => void;
  selectable?: boolean;
  step?: number;
  timeslots?: number;
  showMultiDayTimes?: boolean;
  className?: string;
}

export function CalendarGrid({
  events,
  view,
  date,
  onNavigate,
  onView,
  onSelectEvent,
  onSelectSlot,
  onEventDrop: _onEventDrop,
  onEventResize: _onEventResize,
  selectable = true,
  step = 15,
  timeslots = 4,
  showMultiDayTimes = true,
  className = "",
}: CalendarGridProps) {
  const { language } = useTranslation();

  // Convertir eventos al formato de React Big Calendar
  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        title: event.title,
        resource: event,
      })),
    [events]
  );

  // Estilos personalizados para eventos
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const style: React.CSSProperties = {
      backgroundColor: event.read_only ? "#9ca3af" : "#023E87",
      borderRadius: "4px",
      opacity: event.status === "cancelled" ? 0.5 : 1,
      color: "white",
      border: "none",
      display: "block",
    };

    return { style };
  }, []);

  // Formatos de fecha personalizados
  const formats = useMemo(
    () => ({
      timeGutterFormat: (
        date: Date,
        culture?: string,
        loc?: { format: (d: Date, fmt: string, c?: string) => string }
      ) => loc?.format(date, "HH:mm", culture) ?? "",
      eventTimeRangeFormat: (
        { start, end }: { start: Date; end: Date },
        culture?: string,
        loc?: { format: (d: Date, fmt: string, c?: string) => string }
      ) =>
        `${loc?.format(start, "HH:mm", culture) ?? ""} - ${loc?.format(end, "HH:mm", culture) ?? ""}`,
      agendaTimeRangeFormat: (
        { start, end }: { start: Date; end: Date },
        culture?: string,
        loc?: { format: (d: Date, fmt: string, c?: string) => string }
      ) =>
        `${loc?.format(start, "HH:mm", culture) ?? ""} - ${loc?.format(end, "HH:mm", culture) ?? ""}`,
      dayRangeHeaderFormat: (
        { start, end }: { start: Date; end: Date },
        culture?: string,
        loc?: { format: (d: Date, fmt: string, c?: string) => string }
      ) =>
        `${loc?.format(start, "dd MMM", culture) ?? ""} - ${loc?.format(end, "dd MMM", culture) ?? ""}`,
    }),
    []
  );

  // Mensajes personalizados
  const messages = useMemo(
    () => ({
      today: language === "es" ? "Hoy" : "Today",
      previous: language === "es" ? "Anterior" : "Previous",
      next: language === "es" ? "Siguiente" : "Next",
      month: language === "es" ? "Mes" : "Month",
      week: language === "es" ? "Semana" : "Week",
      day: language === "es" ? "Día" : "Day",
      agenda: language === "es" ? "Agenda" : "Agenda",
      date: language === "es" ? "Fecha" : "Date",
      time: language === "es" ? "Hora" : "Time",
      event: language === "es" ? "Evento" : "Event",
      allDay: language === "es" ? "Todo el día" : "All day",
      noEventsInRange:
        language === "es"
          ? "No hay eventos en este rango"
          : "No events in this range",
      showMore: (total: number) =>
        language === "es" ? `+ ${total} más` : `+ ${total} more`,
    }),
    [language]
  );

  return (
    <div className={`calendar-grid h-full ${className}`}>
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        titleAccessor="title"
        view={view}
        date={date}
        onNavigate={onNavigate}
        onView={onView}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable={selectable}
        step={step}
        timeslots={timeslots}
        showMultiDayTimes={showMultiDayTimes}
        eventPropGetter={(event: { resource: CalendarEvent }) =>
          eventStyleGetter(event.resource)
        }
        formats={formats}
        messages={messages}
        culture={language}
        style={{ height: "100%" }}
        views={["month", "week", "day", "agenda"]}
        popup
        tooltipAccessor={(event: { resource: CalendarEvent }) =>
          event.resource.description || event.resource.title
        }
      />
    </div>
  );
}
