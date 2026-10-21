import { useState, useCallback } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  addMonths,
  addWeeks,
  addDays,
  subMonths,
  subWeeks,
  subDays,
} from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "~/components/ui/sheet";
import { useHasAnyPermission } from "~/hooks/usePermissions";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarToolbar } from "./CalendarToolbar";
import { CalendarSidebar } from "./CalendarSidebar";
import { useCalendars, useEvents } from "../hooks/useCalendar";
import type { CalendarEvent, CalendarViewType } from "../types/calendar.types";

interface CalendarContainerProps {
  mode?: "modal" | "embedded";
  dataSource?: "tasks" | "calendars" | "mixed";
  calendarIds?: string[];
  showSidebar?: boolean;
  showToolbar?: boolean;
  defaultView?: CalendarViewType;
  onEventClick?: (event: CalendarEvent) => void;
  onEventCreate?: (event: Partial<CalendarEvent>) => void;
  className?: string;
}

export function CalendarContainer({
  mode = "modal",
  dataSource: _dataSource = "calendars",
  calendarIds: initialCalendarIds,
  showSidebar = true,
  showToolbar = true,
  defaultView = "month",
  onEventClick,
  onEventCreate,
  className = "",
}: CalendarContainerProps) {
  const { t } = useTranslation();
  const canCreateEvent = useHasAnyPermission([
    "calendar.events.manage",
    "calendar.manage",
  ]);
  // Estado local
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>(defaultView);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>(
    initialCalendarIds || []
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Hooks de datos
  const { data: calendarsData } = useCalendars();
  const calendars = calendarsData?.data || [];

  // Si no hay calendarios seleccionados, seleccionar todos por defecto
  const effectiveCalendarIds =
    selectedCalendarIds.length > 0
      ? selectedCalendarIds
      : calendars.map((c: { id: string }) => c.id);

  // Obtener eventos. Cuando el usuario no filtró manualmente por calendario,
  // no mandamos calendar_id: el backend entonces devuelve eventos donde el
  // usuario es organizador O asistente invitado (p.ej. tareas asignadas
  // sincronizadas al calendario de quien las creó), en vez de solo los
  // eventos de calendarios que el usuario mismo posee.
  const { data: eventsData, isLoading: eventsLoading } = useEvents({
    calendar_id:
      selectedCalendarIds.length > 0
        ? effectiveCalendarIds.join(",")
        : undefined,
    // TODO: Agregar filtros de fecha según la vista
  });
  const events = eventsData?.data || [];

  // Navegación de fecha
  const handleNavigate = useCallback(
    (action: "prev" | "next" | "today") => {
      if (action === "today") {
        setCurrentDate(new Date());
        return;
      }

      const increment = action === "next" ? 1 : -1;

      switch (viewType) {
        case "month":
          setCurrentDate((prev) =>
            increment > 0 ? addMonths(prev, 1) : subMonths(prev, 1)
          );
          break;
        case "week":
          setCurrentDate((prev) =>
            increment > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1)
          );
          break;
        case "day":
          setCurrentDate((prev) =>
            increment > 0 ? addDays(prev, 1) : subDays(prev, 1)
          );
          break;
        case "agenda":
          setCurrentDate((prev) =>
            increment > 0 ? addMonths(prev, 1) : subMonths(prev, 1)
          );
          break;
      }
    },
    [viewType]
  );

  // Cambio de vista
  const handleViewChange = useCallback((view: CalendarViewType) => {
    setViewType(view);
  }, []);

  // Toggle de calendario
  const handleToggleCalendar = useCallback((calendarId: string) => {
    setSelectedCalendarIds((prev) =>
      prev.includes(calendarId)
        ? prev.filter((id) => id !== calendarId)
        : [...prev, calendarId]
    );
  }, []);

  // Selección de evento
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onEventClick?.(event);
    },
    [onEventClick]
  );

  // Selección de slot (crear evento)
  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date; action: string }) => {
      if (slotInfo.action === "select" || slotInfo.action === "click") {
        onEventCreate?.({
          start_time: slotInfo.start.toISOString(),
          end_time: slotInfo.end.toISOString(),
          all_day: slotInfo.action === "click",
        });
      }
    },
    [onEventCreate]
  );

  // DnD handlers (placeholder - se implementarán en Fase 4)
  const handleEventDrop = useCallback(
    (args: { event: CalendarEvent; start: Date; end: Date }) => {
      console.warn("Event dropped:", args);
      // TODO: Implementar con mutation de moveEvent
    },
    []
  );

  const handleEventResize = useCallback(
    (args: { event: CalendarEvent; start: Date; end: Date }) => {
      console.warn("Event resized:", args);
      // TODO: Implementar con mutation de resizeEvent
    },
    []
  );

  return (
    <div className={`calendar-container flex h-full flex-col ${className}`}>
      {/* Toolbar */}
      {showToolbar && (
        <CalendarToolbar
          currentDate={currentDate}
          viewType={viewType}
          onNavigate={handleNavigate}
          onViewChange={handleViewChange}
          onCreateEvent={() => onEventCreate?.({})}
          showCreateButton={mode === "modal" && canCreateEvent}
          showSidebarToggle={showSidebar}
          onToggleSidebar={() => setMobileSidebarOpen(true)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (desktop: persistent, mobile: hidden behind toggle) */}
        {showSidebar && (
          <CalendarSidebar
            calendars={calendars}
            selectedCalendarIds={effectiveCalendarIds}
            onToggleCalendar={handleToggleCalendar}
            currentDate={currentDate}
            showMiniCalendar={mode === "modal"}
            className="hidden border-r sm:flex"
          />
        )}

        {/* Sidebar (mobile: slide-in drawer) */}
        {showSidebar && (
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" className="w-64 p-0 sm:hidden">
              <SheetTitle className="sr-only">
                {t("calendar.myCalendars")}
              </SheetTitle>
              <SheetDescription className="sr-only">
                {t("calendar.myCalendars")}
              </SheetDescription>
              <CalendarSidebar
                calendars={calendars}
                selectedCalendarIds={effectiveCalendarIds}
                onToggleCalendar={handleToggleCalendar}
                currentDate={currentDate}
                showMiniCalendar={mode === "modal"}
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Calendar Grid */}
        <div className="flex-1 overflow-hidden p-2 sm:p-4">
          {eventsLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">{t("common.loading")}</p>
            </div>
          ) : (
            <CalendarGrid
              events={events}
              view={viewType}
              date={currentDate}
              onNavigate={setCurrentDate}
              onView={(view) => setViewType(view as CalendarViewType)}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              selectable={canCreateEvent}
              step={15}
              timeslots={4}
            />
          )}
        </div>
      </div>
    </div>
  );
}
