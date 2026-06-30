/**
 * CalendarView component
 * Main calendar component with month/week/day views
 */

import { useState, useMemo, type ReactNode, type CSSProperties } from "react";
import { cn } from "~/lib/utils";
import {
  useActivityIcons,
  useDefaultActivityIcons,
} from "~/features/activity-icons/hooks/useActivityIcons";

import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import type { TaskStatus } from "~/features/tasks/types/task.types";

// Colores de estado consistentes con TaskList
const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-800 border-gray-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  on_hold: "bg-yellow-100 text-yellow-800 border-yellow-200",
  blocked: "bg-red-100 text-red-800 border-red-200",
  review: "bg-purple-100 text-purple-800 border-purple-200",
  done: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
};

// Default icon configurations (fallback)
const DEFAULT_EVENT_STATUS_VISUALS: Record<
  string,
  { icon: string; className: string }
> = {
  todo: { icon: "•", className: "text-white/70" },
  pending: { icon: "•", className: "text-white/70" },
  in_progress: { icon: "↻", className: "text-white" },
  done: { icon: "✓", className: "text-white" },
  completed: { icon: "✓", className: "text-white" },
  canceled: { icon: "✕", className: "text-white" },
  blocked: { icon: "!", className: "text-white" },
  // Iconos específicos para eventos
  scheduled: { icon: "📅", className: "text-white" },
  confirmed: { icon: "✅", className: "text-white" },
  tentative: { icon: "📝", className: "text-white" },
  cancelled: { icon: "❌", className: "text-white" },
  // Default para eventos que no tienen estado específico
  event: { icon: "📅", className: "text-white" },
};
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ResizeHandle } from "~/features/calendar/components/ResizeHandle";
import { canResizeEvent } from "~/features/calendar/utils/eventValidation";
import { useEventResize } from "~/features/calendar/hooks/useEventResize";
import {
  HOUR_HEIGHT,
  TOTAL_DAY_HEIGHT,
  getTimedEventsForDay,
  calculateEventPositions,
  type PositionedEvent,
} from "~/features/calendar/utils/eventLayout";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type {
  CalendarViewType,
  CalendarEvent,
  Calendar,
} from "~/features/calendar/types/calendar.types";

interface CalendarViewProps {
  events: CalendarEvent[];
  calendars: Calendar[];
  viewType: CalendarViewType;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewTypeChange: (type: CalendarViewType) => void;
  onEventClick?: (event: CalendarEvent, mouseEvent?: React.MouseEvent) => void;
  onEventCreate?: (date: Date) => void;
  getEventColor?: (event: CalendarEvent) => string;
  onEventMove?: (
    event: CalendarEvent,
    targetDate: Date,
    options?: { preserveTime: boolean }
  ) => void;
  onEventResize?: (
    event: CalendarEvent,
    targetDate: Date,
    options?: { preserveTime: boolean }
  ) => void;
  loading?: boolean;
  showHeader?: boolean;
}

type DragAction = "move" | "resize";

interface DragPayload {
  type: DragAction;
  eventId: string;
  direction?: "left" | "right"; // Para resize
}

const HEX_COLOR_PATTERN = /^#([0-9A-F]{3}|[0-9A-F]{6})$/i;
const DEFAULT_EVENT_COLOR = "#023E87";
const BRAND_PRIMARY_COLOR = "hsl(var(--brand-primary, var(--primary)))";
const BRAND_ACCENT_COLOR = "hsl(var(--brand-accent, var(--secondary)))";
const SURFACE_GRADIENT =
  "linear-gradient(180deg, hsl(var(--color-surface, var(--surface))) 0%, hsl(var(--color-background, var(--background))) 100%)";
const SURFACE_MUTED_BG = "hsl(var(--color-surface, var(--surface)))";
const MUTED_BORDER_COLOR = "hsl(var(--border))";
const EVENT_SHADOW = "0 8px 20px rgba(2, 62, 135, 0.14)";

// Constantes para barras multi-día
const MULTI_DAY_BAR_HEIGHT = 28;
const MULTI_DAY_BAR_GAP = 4;
const MAX_VISIBLE_BARS = 3;

const normalizeHexColor = (color?: string | null): string | null => {
  if (!color) {
    return null;
  }
  const trimmed = color.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return null;
  }
  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return trimmed;
};

const parseHexColor = (hex: string) => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
};

const srgbChannelToLinear = (value: number) => {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
};

const getEventTextColor = (color: string) => {
  const normalized = normalizeHexColor(color);
  if (!normalized) {
    return "hsl(var(--color-text-primary))";
  }
  const { r, g, b } = parseHexColor(normalized);
  const luminance =
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b);
  return luminance > 0.55 ? "hsl(var(--color-text-primary))" : "#FFFFFF";
};

const getEventStyles = (
  color: string,
  options?: {
    variant?: "solid" | "soft";
    borderColor?: string;
    enableShadow?: boolean;
  }
): CSSProperties => {
  const variant = options?.variant ?? "solid";
  const fallbackColor = color?.trim() || DEFAULT_EVENT_COLOR;
  const backgroundColor = fallbackColor;

  return {
    backgroundColor,
    color: getEventTextColor(fallbackColor),
    borderLeft: `3px solid ${options?.borderColor ?? BRAND_PRIMARY_COLOR}`,
    boxShadow:
      (options?.enableShadow ?? variant === "solid") ? EVENT_SHADOW : "none",
    backdropFilter: variant === "soft" ? "blur(8px)" : undefined,
    transition: "box-shadow 150ms ease, transform 150ms ease",
  };
};

// Función para crear tooltips estructurados con buena UX
const createStructuredTooltip = (event: CalendarEvent): string => {
  const lines = [];

  // Título principal
  lines.push(`📋 ${event.title}`);

  // Determinar correctamente si es tarea o evento
  const isEvent =
    event.metadata?.activity_type === "event" ||
    event.all_day ||
    event.source_type !== "task";

  const activityType = isEvent ? "evento" : "tarea";
  lines.push(`🏷️ Tipo: ${activityType === "tarea" ? "Tarea" : "Evento"}`);

  // Estado
  if (event.status) {
    const statusLabels = {
      todo: "Por Hacer",
      in_progress: "En Progreso",
      done: "Completada",
      on_hold: "En Pausa",
      cancelled: "Cancelada",
      blocked: "Bloqueada",
      review: "En Revisión",
    };
    lines.push(
      `📊 Estado: ${statusLabels[event.status as keyof typeof statusLabels] || event.status}`
    );
  }

  // Horario
  if (event.all_day) {
    lines.push(`⏰ Todo el día`);
  } else {
    const startTime = event.start_time ? new Date(event.start_time) : null;
    const endTime = event.end_time ? new Date(event.end_time) : null;

    if (startTime) {
      lines.push(`🕐 Inicio: ${format(startTime, "HH:mm")}`);
    }
    if (endTime) {
      lines.push(`🕐 Fin: ${format(endTime, "HH:mm")}`);
    }
  }

  // Descripción si existe
  if (event.description) {
    lines.push(`📝 ${event.description}`);
  }

  // Prioridad si es tarea
  if (activityType === "tarea" && event.calendar_id) {
    const priority = event.calendar_id.replace("tasks-", "");
    const priorityLabels = {
      low: "Baja",
      medium: "Media",
      high: "Alta",
      urgent: "Urgente",
    };
    if (priorityLabels[priority as keyof typeof priorityLabels]) {
      lines.push(
        `⚡ Prioridad: ${priorityLabels[priority as keyof typeof priorityLabels]}`
      );
    }
  }

  // Fecha de creación/modificación
  if (event.updated_at) {
    lines.push(
      `🔄 Actualizado: ${format(new Date(event.updated_at), "dd/MM HH:mm")}`
    );
  }

  return lines.join("\n");
};

interface MonthDayCellProps {
  day: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  onEventCreate?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent, mouseEvent?: React.MouseEvent) => void;
  renderEvent: (event: CalendarEvent) => ReactNode;
}

function MonthDayCell({
  day,
  isCurrentMonth,
  isToday,
  events,
  onEventCreate,
  onEventClick: _onEventClick,
  renderEvent,
}: MonthDayCellProps) {
  const { t } = useTranslation();
  const visibleEvents = events.slice(0, 3);
  const hiddenEvents = Math.max(events.length - visibleEvents.length, 0);
  const { setNodeRef, isOver } = useDroppable({
    id: `month-cell-${day.toISOString()}`,
    data: { date: day, preserveTime: false },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group border-border/60 bg-[hsl(var(--surface))] border-r last:border-r-0 relative",
        !isCurrentMonth
          ? "bg-muted/30 text-muted-foreground"
          : "bg-[hsl(var(--surface))]",
        isOver && "ring-2 ring-primary/40"
      )}
      data-outside-cell={!isCurrentMonth}
      data-today={isToday || undefined}
      onClick={(event) => {
        if (
          (event.target as HTMLElement)?.closest(
            '[role="button"][data-calendar-event="true"]'
          )
        ) {
          return;
        }
        onEventCreate?.(day);
      }}
    >
      <div className="data-dragging:bg-accent flex h-full flex-col overflow-hidden px-1.5 py-2 gap-1 min-h-[80px]">
        <div
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center self-start rounded-full text-[11px] font-medium",
            isToday
              ? "bg-foreground text-background font-semibold"
              : "text-muted-foreground/60"
          )}
        >
          {format(day, "d")}
        </div>
        <div className="flex-1 space-y-1">
          {visibleEvents.map((event, index) => (
            <div key={`${event.id}-${index}`}>{renderEvent(event)}</div>
          ))}
          {hiddenEvents > 0 && (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              +{hiddenEvents} {t("calendar.labels.more")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface DraggableEventProps {
  event: CalendarEvent;
  children: ReactNode;
  action: DragAction;
}

function DraggableEvent({ event, children, action }: DraggableEventProps) {
  // Verificar si es tarea
  const isTask =
    event.source_type === "task" || event.metadata?.activity_type === "task";

  // Si es tarea, permitir move pero no resize
  // Si es evento, permitir ambos move y resize
  const isDraggable = !isTask || action === "move";

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${action}-${event.id}`,
    data: {
      type: action,
      eventId: event.id,
      ...(action === "resize" && { direction: "right" }), // Incluir dirección para resize
    } satisfies DragPayload,
    disabled: !isDraggable,
  });

  const style = {
    // Don't apply transform to the original — DragOverlay shows the ghost.
    // This prevents the visual offset between mouse and element.
    opacity: isDragging ? 0.3 : 1,
    cursor: isDraggable ? "move" : "pointer",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {isDraggable ? (
        <div {...listeners}>{children}</div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}

interface HourDropSlotProps {
  slotDate: Date;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  children?: ReactNode;
}

function HourDropSlot({
  slotDate,
  className,
  style,
  onClick,
  children,
}: HourDropSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `hour-slot-${slotDate.toISOString()}`,
    data: { date: slotDate, preserveTime: false },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && "ring-2 ring-primary/40 bg-primary/10"
      )}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CalendarView({
  events,
  calendars,
  viewType,
  currentDate,
  onDateChange,
  onViewTypeChange,
  onEventClick,
  onEventCreate,
  getEventColor,
  onEventMove,
  onEventResize,
  loading: _loading,
  showHeader = true,
}: CalendarViewProps) {
  const { t, language } = useTranslation();
  const dateLocale = language === "en" ? enUS : es;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const { handleResize } = useEventResize({ onEventResize });

  // Fetch configurable icons
  const { data: iconConfigs } = useActivityIcons();
  const { data: defaultIcons } = useDefaultActivityIcons();

  // Memoize icon map for performance
  const iconMap = useMemo(() => {
    const map: Record<
      string,
      Record<string, { icon: string; className: string }>
    > = {};

    if (iconConfigs && iconConfigs.length > 0) {
      iconConfigs.forEach((config) => {
        if (!map[config.activity_type]) {
          map[config.activity_type] = {};
        }
        const activityMap = map[config.activity_type];
        if (activityMap) {
          activityMap[config.status] = {
            icon: config.icon,
            className: config.class_name || "text-white",
          };
        }
      });
    } else if (defaultIcons) {
      Object.entries(defaultIcons).forEach(([activityType, statuses]) => {
        if (statuses) {
          map[activityType] = {};
          const activityMap = map[activityType];
          if (activityMap) {
            Object.entries(statuses).forEach(([status, config]) => {
              if (config) {
                activityMap[status] = {
                  icon: config.icon,
                  className: config.class_name || "text-white",
                };
              }
            });
          }
        }
      });
    }

    return map;
  }, [iconConfigs, defaultIcons]);

  // Function to get icon for activity type and status
  const getActivityIcon = (event: CalendarEvent) => {
    // Priorizar metadata.activity_type sobre source_type para el ícono
    const activityType =
      event.metadata?.activity_type || event.source_type || "task";
    const status = event.status || "todo";

    // Asegurarse de que activityType sea una clave válida
    const icon = iconMap[activityType as keyof typeof iconMap]?.[status];
    if (icon) {
      return icon;
    }

    // Fallback específico para eventos
    if (activityType === "event") {
      return (
        DEFAULT_EVENT_STATUS_VISUALS[status] ||
        DEFAULT_EVENT_STATUS_VISUALS["event"]
      );
    }

    // Fallback to default visuals para tareas
    return (
      DEFAULT_EVENT_STATUS_VISUALS[status] || {
        icon: "•",
        className: "text-white/70",
      }
    );
  };

  const getCalendarColor = (calendarId: string) => {
    const calendar = calendars.find((c) => c.id === calendarId);
    return calendar?.color || "#023E87";
  };

  const resolveEventColor = (event: CalendarEvent) => {
    return getEventColor?.(event) ?? getCalendarColor(event.calendar_id);
  };

  const getEventTimeLabel = (
    event: CalendarEvent,
    mode: "month" | "day" | "agenda"
  ) => {
    if (event.all_day) {
      return "";
    }
    const displayTime = event.metadata?.display_time as
      | string
      | undefined
      | null;
    const isDueOnly = Boolean(event.metadata?.due_only);
    if (isDueOnly) {
      return displayTime ?? "";
    }
    if (displayTime) {
      return displayTime;
    }

    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    if (mode === "month") {
      return format(start, "HH:mm");
    }
    return `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
  };

  const activeEvent = activeEventId
    ? events.find((event) => event.id === activeEventId) || null
    : null;

  const navigateDate = (direction: "prev" | "next") => {
    let newDate: Date;

    switch (viewType) {
      case "month":
        newDate =
          direction === "prev"
            ? subMonths(currentDate, 1)
            : addMonths(currentDate, 1);
        break;
      case "week":
        newDate =
          direction === "prev"
            ? subWeeks(currentDate, 1)
            : addWeeks(currentDate, 1);
        break;
      case "day":
        newDate =
          direction === "prev"
            ? subDays(currentDate, 1)
            : addDays(currentDate, 1);
        break;
      default:
        newDate = currentDate;
    }

    onDateChange(newDate);
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Separar eventos single-day vs multi-day
    const isMultiDayEvent = (event: CalendarEvent) => {
      const start = startOfDay(new Date(event.start_time));
      const end = startOfDay(new Date(event.end_time ?? event.start_time));
      return event.all_day || differenceInCalendarDays(end, start) >= 1;
    };

    const multiDayEvents = events.filter(isMultiDayEvent);
    const singleDayEvents = events.filter((e) => !isMultiDayEvent(e));

    // Calcular placements de barras multi-día por semana
    type BarPlacement = {
      event: CalendarEvent;
      startCol: number;
      spanDays: number;
      laneIndex: number;
    };

    const calculateWeekBars = (
      weekStart: Date,
      weekEnd: Date
    ): BarPlacement[] => {
      const weekMultiDayEvents = multiDayEvents.filter((event) => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time ?? event.start_time);
        return eventStart <= weekEnd && eventEnd >= weekStart;
      });

      const placements: BarPlacement[] = [];
      const lanes: number[] = []; // Track end column of each lane

      weekMultiDayEvents.forEach((event) => {
        const eventStart = startOfDay(new Date(event.start_time));
        const eventEnd = startOfDay(
          new Date(event.end_time ?? event.start_time)
        );

        const clampedStart = eventStart < weekStart ? weekStart : eventStart;
        const clampedEnd = eventEnd > weekEnd ? weekEnd : eventEnd;

        const startCol = differenceInCalendarDays(clampedStart, weekStart) + 1;
        const spanDays = differenceInCalendarDays(clampedEnd, clampedStart) + 1;

        // Find available lane
        let laneIndex = lanes.findIndex((endCol) => endCol < startCol);
        if (laneIndex === -1) {
          laneIndex = lanes.length;
          lanes.push(startCol + spanDays - 1);
        } else {
          lanes[laneIndex] = startCol + spanDays - 1;
        }

        placements.push({ event, startCol, spanDays, laneIndex });
      });

      return placements;
    };

    return (
      <div data-slot="month-view" className="contents">
        <div
          className="border-border/60 grid grid-cols-7 border-b"
          style={{ background: SURFACE_GRADIENT }}
        >
          {[
            t("calendar.weekdays.mon"),
            t("calendar.weekdays.tue"),
            t("calendar.weekdays.wed"),
            t("calendar.weekdays.thu"),
            t("calendar.weekdays.fri"),
            t("calendar.weekdays.sat"),
            t("calendar.weekdays.sun"),
          ].map((dayLabel) => (
            <div
              key={dayLabel}
              className="text-muted-foreground/70 py-3 text-center text-[11px] font-semibold uppercase tracking-wide"
            >
              {dayLabel}
            </div>
          ))}
        </div>
        <div className="flex flex-col bg-[hsl(var(--surface))]">
          {Array.from(
            { length: Math.ceil(days.length / 7) },
            (_, weekIndex) => {
              const weekDays = days.slice(weekIndex * 7, weekIndex * 7 + 7);
              const weekStart = startOfDay(weekDays[0]!);
              const weekEnd = endOfDay(weekDays[weekDays.length - 1]!);
              const weekBars = calculateWeekBars(weekStart, weekEnd);

              // Agrupar barras por lane
              const lanes: BarPlacement[][] = [];
              weekBars.forEach((bar) => {
                if (!lanes[bar.laneIndex]) {
                  lanes[bar.laneIndex] = [];
                }
                lanes[bar.laneIndex]!.push(bar);
              });

              const visibleLanes = lanes.slice(0, MAX_VISIBLE_BARS);
              const hiddenCount = Math.max(0, lanes.length - MAX_VISIBLE_BARS);

              return (
                <div
                  key={`week-${weekIndex}`}
                  className="flex flex-col border-b border-border/60 last:border-b-0"
                >
                  {/* Fila de celdas de días */}
                  <div className="grid grid-cols-7">
                    {weekDays.map((day) => {
                      const dayStart = startOfDay(day);
                      const dayEnd = endOfDay(day);
                      const dayEvents = singleDayEvents.filter((event) => {
                        const eventStart = new Date(event.start_time);
                        const eventEnd = new Date(
                          event.end_time ?? event.start_time
                        );
                        return eventStart <= dayEnd && eventEnd >= dayStart;
                      });
                      return (
                        <MonthDayCell
                          key={day.toISOString()}
                          day={day}
                          isCurrentMonth={isSameMonth(day, currentDate)}
                          isToday={isSameDay(day, new Date())}
                          events={dayEvents}
                          onEventCreate={onEventCreate}
                          onEventClick={onEventClick}
                          renderEvent={(event) => {
                            // Determinar si es tarea o evento
                            const isTask =
                              event.source_type === "task" ||
                              event.metadata?.activity_type === "task";

                            // Configurar data-attributes según el tipo
                            const activityType = isTask ? "task" : "event";
                            const activitySubtype = isTask ? "task" : "event";

                            const activityIcon = getActivityIcon(event);
                            const eventColor = resolveEventColor(event);
                            const textColor = getEventTextColor(eventColor);
                            const canResize = canResizeEvent(event) && !isTask; // Las tareas no pueden redimensionarse

                            return (
                              <div className="group/event flex w-full min-w-0 items-center gap-1 pr-2">
                                <DraggableEvent event={event} action="move">
                                  <button
                                    type="button"
                                    data-calendar-event="true"
                                    data-activity-type={activityType} // ← "task" o "event" según corresponda
                                    data-activity-subtype={activitySubtype} // ← "task" o "event" según corresponda
                                    title={createStructuredTooltip(event)}
                                    className="box-border relative flex w-full min-w-0 max-w-[calc(100%-8px)] items-center overflow-hidden rounded-full px-2 py-1.5 text-left text-xs font-medium shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[dragging=true]:cursor-grabbing"
                                    style={{
                                      backgroundColor: eventColor,
                                      color: textColor,
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEventClick?.(event, e);
                                    }}
                                  >
                                    {/* Resize Handle izquierdo */}
                                    {canResize && (
                                      <ResizeHandle
                                        event={event}
                                        direction="left"
                                        textColor={textColor}
                                      />
                                    )}

                                    <span
                                      className={cn(
                                        "mr-1.5 text-[10px]",
                                        activityIcon?.className ||
                                          "text-white/70"
                                      )}
                                    >
                                      {activityIcon?.icon || "📅"}
                                    </span>
                                    <span className="truncate min-w-0">
                                      {(() => {
                                        const timeLabel = getEventTimeLabel(
                                          event,
                                          "month"
                                        );
                                        return timeLabel ? `${timeLabel} ` : "";
                                      })()}
                                      {event.title}
                                    </span>

                                    {/* Resize Handle derecho */}
                                    {canResize && (
                                      <ResizeHandle
                                        event={event}
                                        direction="right"
                                        textColor={textColor}
                                      />
                                    )}
                                  </button>
                                </DraggableEvent>
                              </div>
                            );
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Barras multi-día */}
                  {visibleLanes.length > 0 && (
                    <div
                      className="relative px-1 pb-1"
                      style={{ paddingTop: MULTI_DAY_BAR_GAP }}
                    >
                      {/* Líneas de separación verticales */}
                      <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <div
                            key={i}
                            className="border-r border-border/20 last:border-r-0"
                          />
                        ))}
                      </div>

                      {visibleLanes.map((laneBars, laneIndex) => (
                        <div
                          key={`lane-${laneIndex}`}
                          className="relative grid grid-cols-7 gap-0"
                          style={{
                            height: MULTI_DAY_BAR_HEIGHT,
                            marginTop: laneIndex > 0 ? MULTI_DAY_BAR_GAP : 0,
                          }}
                        >
                          {laneBars.map((bar) => {
                            const activityIcon = getActivityIcon(bar.event);
                            const eventColor = resolveEventColor(bar.event);
                            const textColor = getEventTextColor(eventColor);
                            const isTask =
                              bar.event.source_type === "task" ||
                              bar.event.metadata?.activity_type === "task";
                            const canResize =
                              canResizeEvent(bar.event) && !isTask; // Las tareas no pueden redimensionarse

                            // Determinar si el evento empieza o termina en esta fila/semana
                            const isFirstLane = laneIndex === 0;
                            const isLastLane =
                              laneIndex === visibleLanes.length - 1;

                            // Para eventos multi-día, calcular las semanas reales que abarca el evento
                            const firstDayOfWeek = weekDays[0];
                            if (!firstDayOfWeek) return null;

                            const weekStart = startOfWeek(firstDayOfWeek, {
                              weekStartsOn: 1,
                            });
                            const weekEnd = endOfWeek(firstDayOfWeek, {
                              weekStartsOn: 1,
                            });
                            const eventStart = new Date(bar.event.start_time);
                            const eventEnd = new Date(
                              bar.event.end_time || bar.event.start_time
                            );

                            // Calcular semana de inicio y fin del evento
                            const eventStartWeek = startOfWeek(eventStart, {
                              weekStartsOn: 1,
                            });
                            const eventEndWeek = startOfWeek(eventEnd, {
                              weekStartsOn: 1,
                            });

                            // Calcular número de semanas que abarca el evento
                            const weeksDiff = Math.round(
                              (eventEndWeek.getTime() -
                                eventStartWeek.getTime()) /
                                (7 * 24 * 60 * 60 * 1000)
                            );
                            const totalEventWeeks = weeksDiff + 1;

                            // Calcular en qué semana del evento estamos (basado en la semana actual)
                            const currentEventWeek = Math.round(
                              (weekStart.getTime() - eventStartWeek.getTime()) /
                                (7 * 24 * 60 * 60 * 1000)
                            );
                            const isFirstEventWeek = currentEventWeek === 0;
                            const isLastEventWeek =
                              currentEventWeek === weeksDiff;

                            const eventStartsInThisWeek =
                              eventStart >= weekStart && eventStart <= weekEnd;
                            const eventEndsInThisWeek =
                              eventEnd >= weekStart && eventEnd <= weekEnd;

                            // Debug
                            console.warn("🔍 Multi-day event debug:", {
                              eventTitle: bar.event.title,
                              laneIndex,
                              totalLanes: visibleLanes.length,
                              totalEventWeeks,
                              currentEventWeek,
                              isFirstLane,
                              isLastLane,
                              isFirstEventWeek,
                              isLastEventWeek,
                              weekStart: weekStart.toISOString().split("T")[0],
                              weekEnd: weekEnd.toISOString().split("T")[0],
                              eventStart: eventStart
                                .toISOString()
                                .split("T")[0],
                              eventEnd: eventEnd.toISOString().split("T")[0],
                              eventStartsInThisWeek,
                              eventEndsInThisWeek,
                              showLeftHandle:
                                canResize &&
                                (isFirstEventWeek || eventStartsInThisWeek),
                              showRightHandle:
                                canResize &&
                                (isLastEventWeek || eventEndsInThisWeek),
                            });

                            // Mostrar handle izquierdo solo si es primera semana del evento O si el evento empieza en esta semana
                            const showLeftHandle =
                              canResize &&
                              (isFirstEventWeek || eventStartsInThisWeek);
                            // Mostrar handle derecho solo si es última semana del evento O si el evento termina en esta semana
                            const showRightHandle =
                              canResize &&
                              (isLastEventWeek || eventEndsInThisWeek);

                            return (
                              <div
                                key={bar.event.id}
                                className="relative z-10 px-0.5"
                                style={{
                                  gridColumn: `${bar.startCol} / span ${bar.spanDays}`,
                                }}
                              >
                                <DraggableEvent event={bar.event} action="move">
                                  <button
                                    type="button"
                                    data-calendar-event="true"
                                    data-activity-type="event"
                                    data-activity-subtype="event"
                                    title={bar.event.title}
                                    className="box-border relative flex h-full w-full min-w-0 max-w-full items-center overflow-hidden rounded-full px-3 py-1.5 text-left text-xs font-medium shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    style={{
                                      backgroundColor: eventColor,
                                      color: textColor,
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEventClick?.(bar.event, e);
                                    }}
                                  >
                                    {/* Resize Handle izquierdo - solo en primera fila o cuando empieza el evento */}
                                    {showLeftHandle && (
                                      <ResizeHandle
                                        event={bar.event}
                                        direction="left"
                                        textColor={textColor}
                                      />
                                    )}

                                    <span
                                      className={cn(
                                        "mr-1.5 text-[10px]",
                                        activityIcon?.className ||
                                          "text-white/70"
                                      )}
                                    >
                                      {activityIcon?.icon || "📅"}
                                    </span>
                                    <span className="truncate min-w-0">
                                      {bar.event.title}
                                    </span>

                                    {/* Resize Handle derecho - solo en última fila o cuando termina el evento */}
                                    {showRightHandle && (
                                      <ResizeHandle
                                        event={bar.event}
                                        direction="right"
                                        textColor={textColor}
                                      />
                                    )}
                                  </button>
                                </DraggableEvent>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Indicador de eventos ocultos */}
                  {hiddenCount > 0 && (
                    <div className="px-2 pb-1 text-right">
                      <span className="text-[10px] text-muted-foreground">
                        +{hiddenCount}{" "}
                        {hiddenCount === 1 ? "evento" : "eventos"}
                      </span>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // All-day events per day
    const allDayEventsPerDay = days.map((day) =>
      events.filter((event) => {
        if (!event.all_day) return false;
        const evStart = new Date(event.start_time);
        const evEnd = new Date(event.end_time);
        const dayStart = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate()
        );
        const dayEnd = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          23,
          59,
          59
        );
        return evStart <= dayEnd && evEnd >= dayStart;
      })
    );

    // Positioned timed events per day
    const positionedPerDay = days.map((day) => {
      const timedEvents = getTimedEventsForDay(events, day);
      return calculateEventPositions(timedEvents, day);
    });

    const nowDate = new Date();
    const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

    return (
      <div className="flex flex-col">
        {/* Header row */}
        <div
          className="grid gap-0 border-b border-border/60"
          style={{
            gridTemplateColumns: "60px repeat(7, 1fr)",
            background: SURFACE_GRADIENT,
          }}
        >
          <div className="p-2" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="text-center font-medium text-sm p-2 border-l"
              style={{ borderColor: MUTED_BORDER_COLOR }}
            >
              <div className="text-muted-foreground text-xs">
                {format(day, "EEE", { locale: dateLocale })}
              </div>
              <div
                className={cn(
                  "text-lg font-semibold mt-0.5",
                  isSameDay(day, nowDate) &&
                    "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                )}
              >
                {format(day, "d", { locale: dateLocale })}
              </div>
            </div>
          ))}
        </div>

        {/* All-day row */}
        <div
          className="grid gap-0 border-b border-border/60"
          style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}
        >
          <div
            className="text-[10px] text-muted-foreground p-1 text-right"
            style={{ background: SURFACE_MUTED_BG }}
          >
            {t("calendar.events.allDay")}
          </div>
          {days.map((day, index) => (
            <div
              key={`allday-${day.toISOString()}`}
              className="min-h-[32px] border-l p-0.5 space-y-0.5"
              style={{
                background: SURFACE_MUTED_BG,
                borderColor: MUTED_BORDER_COLOR,
              }}
            >
              {allDayEventsPerDay[index]?.map((event) => (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event, e);
                  }}
                >
                  <DraggableEvent event={event} action="move">
                    <button
                      type="button"
                      className="flex w-full items-center overflow-hidden rounded px-1 py-0.5 text-left text-[10px] backdrop-blur-md transition hover:opacity-90"
                      style={getEventStyles(resolveEventColor(event), {
                        variant: "soft",
                        borderColor: BRAND_ACCENT_COLOR,
                        enableShadow: false,
                      })}
                    >
                      <span className="truncate">{event.title}</span>
                    </button>
                  </DraggableEvent>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Time grid with absolute-positioned events */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          <div
            className="grid gap-0"
            style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}
          >
            {/* Hour labels column */}
            <div className="relative" style={{ height: TOTAL_DAY_HEIGHT }}>
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={hour}
                  className="absolute right-0 left-0 text-[10px] text-muted-foreground text-right pr-2 -translate-y-1/2"
                  style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                >
                  {hour > 0 ? `${hour.toString().padStart(2, "0")}:00` : ""}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, dayIndex) => (
              <div
                key={day.toISOString()}
                className="relative border-l"
                style={{
                  height: TOTAL_DAY_HEIGHT,
                  borderColor: MUTED_BORDER_COLOR,
                }}
              >
                {/* Hour grid lines — droppable targets */}
                {Array.from({ length: 24 }, (_, hour) => {
                  const slotDate = new Date(day);
                  slotDate.setHours(hour, 0, 0, 0);
                  return (
                    <HourDropSlot
                      key={hour}
                      slotDate={slotDate}
                      className="absolute left-0 right-0 border-t border-border/40 cursor-pointer hover:bg-primary/5 transition-colors"
                      style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                      onClick={() => onEventCreate?.(slotDate)}
                    />
                  );
                })}

                {/* Current time indicator */}
                {isSameDay(day, nowDate) && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                      <div className="flex-1 h-[2px] bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Positioned events */}
                {positionedPerDay[dayIndex]?.map((pos: PositionedEvent) => {
                  const eventColor = resolveEventColor(pos.event);
                  const textColor = getEventTextColor(eventColor);
                  const isTask =
                    pos.event.source_type === "task" ||
                    pos.event.metadata?.activity_type === "task";
                  const colWidth = 100 / pos.totalColumns;

                  return (
                    <div
                      key={pos.event.id}
                      className="absolute z-10 px-0.5"
                      style={{
                        top: pos.top,
                        height: pos.height,
                        left: `${pos.column * colWidth}%`,
                        width: `${colWidth}%`,
                      }}
                    >
                      <div
                        className="group/event relative h-full rounded-md overflow-hidden cursor-pointer transition-shadow hover:shadow-lg border border-white/20"
                        style={{
                          backgroundColor: eventColor,
                          color: textColor,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(pos.event, e);
                        }}
                      >
                        <DraggableEvent event={pos.event} action="move">
                          <div className="p-1 h-full flex flex-col overflow-hidden">
                            <span className="text-[10px] font-semibold leading-tight truncate">
                              {pos.event.title}
                            </span>
                            {pos.height > 30 && (
                              <span className="text-[9px] opacity-80 truncate">
                                {format(
                                  new Date(pos.event.start_time),
                                  "HH:mm"
                                )}
                                {" – "}
                                {format(new Date(pos.event.end_time), "HH:mm")}
                              </span>
                            )}
                          </div>
                        </DraggableEvent>

                        {/* Bottom resize handle */}
                        {!isTask && canResizeEvent(pos.event) && (
                          <DraggableEvent event={pos.event} action="resize">
                            <div className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize opacity-0 group-hover/event:opacity-100 transition-opacity bg-linear-to-t from-black/20 to-transparent" />
                          </DraggableEvent>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    // Include multi-day events that overlap with currentDate
    const allDayEvents = events.filter((event) => {
      if (!event.all_day) return false;
      const evStart = new Date(event.start_time);
      const evEnd = new Date(event.end_time);
      const dayStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate()
      );
      const dayEnd = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        23,
        59,
        59
      );
      return evStart <= dayEnd && evEnd >= dayStart;
    });

    // Positioned timed events
    const timedEvents = getTimedEventsForDay(events, currentDate);
    const positionedEvents = calculateEventPositions(timedEvents, currentDate);

    const nowDate = new Date();
    const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

    return (
      <div className="flex flex-col">
        {/* Day header */}
        <div
          className="text-center p-3 border-b border-border/60"
          style={{ background: SURFACE_GRADIENT }}
        >
          <div className="text-muted-foreground text-sm">
            {format(currentDate, "EEEE", { locale: dateLocale })}
          </div>
          <div
            className={cn(
              "text-2xl font-bold mt-1",
              isSameDay(currentDate, nowDate) &&
                "bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center mx-auto"
            )}
          >
            {format(currentDate, "d", { locale: dateLocale })}
          </div>
        </div>

        {/* All-day section */}
        <div
          className="border-b border-border/60 p-2"
          style={{ background: SURFACE_MUTED_BG }}
        >
          <div className="text-[10px] text-muted-foreground mb-1">
            {t("calendar.events.allDay")}
          </div>
          <div className="space-y-0.5">
            {allDayEvents.length === 0 && (
              <div className="text-[10px] text-muted-foreground italic">—</div>
            )}
            {allDayEvents.map((event) => (
              <div
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event, e);
                }}
              >
                <DraggableEvent event={event} action="move">
                  <button
                    type="button"
                    className="flex w-full items-center overflow-hidden rounded px-2 py-1 text-left text-xs backdrop-blur-md transition hover:opacity-90"
                    style={getEventStyles(resolveEventColor(event), {
                      variant: "soft",
                      borderColor: BRAND_ACCENT_COLOR,
                      enableShadow: false,
                    })}
                  >
                    <span className="truncate">{event.title}</span>
                  </button>
                </DraggableEvent>
              </div>
            ))}
          </div>
        </div>

        {/* Time grid with absolute-positioned events */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 320px)" }}
        >
          <div className="flex">
            {/* Hour labels */}
            <div
              className="relative shrink-0"
              style={{ width: 60, height: TOTAL_DAY_HEIGHT }}
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={hour}
                  className="absolute right-0 left-0 text-[10px] text-muted-foreground text-right pr-2 -translate-y-1/2"
                  style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                >
                  {hour > 0 ? `${hour.toString().padStart(2, "0")}:00` : ""}
                </div>
              ))}
            </div>

            {/* Day column */}
            <div
              className="relative flex-1 border-l"
              style={{
                height: TOTAL_DAY_HEIGHT,
                borderColor: MUTED_BORDER_COLOR,
              }}
            >
              {/* Hour grid lines */}
              {Array.from({ length: 24 }, (_, hour) => {
                const slotDate = new Date(currentDate);
                slotDate.setHours(hour, 0, 0, 0);
                return (
                  <HourDropSlot
                    key={hour}
                    slotDate={slotDate}
                    className="absolute left-0 right-0 border-t border-border/40 cursor-pointer hover:bg-primary/5 transition-colors"
                    style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => onEventCreate?.(slotDate)}
                  />
                );
              })}

              {/* Current time indicator */}
              {isSameDay(currentDate, nowDate) && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
                >
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5" />
                    <div className="flex-1 h-[2px] bg-red-500" />
                  </div>
                </div>
              )}

              {/* Positioned events */}
              {positionedEvents.map((pos: PositionedEvent) => {
                const eventColor = resolveEventColor(pos.event);
                const textColor = getEventTextColor(eventColor);
                const isTask =
                  pos.event.source_type === "task" ||
                  pos.event.metadata?.activity_type === "task";
                const colWidth = 100 / pos.totalColumns;

                return (
                  <div
                    key={pos.event.id}
                    className="absolute z-10 px-0.5"
                    style={{
                      top: pos.top,
                      height: pos.height,
                      left: `${pos.column * colWidth}%`,
                      width: `${colWidth}%`,
                    }}
                  >
                    <div
                      className="group/event relative h-full rounded-md overflow-hidden cursor-pointer transition-shadow hover:shadow-lg border border-white/20"
                      style={{
                        backgroundColor: eventColor,
                        color: textColor,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(pos.event, e);
                      }}
                    >
                      <DraggableEvent event={pos.event} action="move">
                        <div className="p-1.5 h-full flex flex-col overflow-hidden">
                          <span className="text-xs font-semibold leading-tight truncate">
                            {pos.event.title}
                          </span>
                          {pos.height > 35 && (
                            <span className="text-[10px] opacity-80 truncate mt-0.5">
                              {format(new Date(pos.event.start_time), "HH:mm")}
                              {" – "}
                              {format(new Date(pos.event.end_time), "HH:mm")}
                            </span>
                          )}
                          {pos.height > 60 && pos.event.description && (
                            <span className="text-[9px] opacity-60 truncate mt-0.5">
                              {pos.event.description}
                            </span>
                          )}
                        </div>
                      </DraggableEvent>

                      {/* Bottom resize handle */}
                      {!isTask && canResizeEvent(pos.event) && (
                        <DraggableEvent event={pos.event} action="resize">
                          <div className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize opacity-0 group-hover/event:opacity-100 transition-opacity bg-linear-to-t from-black/20 to-transparent" />
                        </DraggableEvent>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const sortedEvents = [...events].sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // Group events by date similar to AgendaView
    const today = startOfDay(new Date());
    const startDate = subDays(today, 30); // Incluir 30 días atrás
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + 60); // Show next 60 days

    const groupedEvents = sortedEvents.reduce<Record<string, CalendarEvent[]>>(
      (acc, event) => {
        const eventDate = startOfDay(new Date(event.start_time));

        // Show events within the extended range (past 30 days to future 60 days)
        if (eventDate >= startDate && eventDate <= endDate) {
          const dateKey = format(eventDate, "yyyy-MM-dd");
          (acc[dateKey] ??= []).push(event);
        }
        return acc;
      },
      {}
    );

    // Sort events within each day by start time
    Object.keys(groupedEvents).forEach((dateKey) => {
      const events = groupedEvents[dateKey];
      if (events) {
        events.sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
      }
    });

    // Convert to sorted array
    const groupedArray = Object.entries(groupedEvents)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([dateKey, dayEvents]) => ({
        date: new Date(dateKey),
        dateKey,
        events: dayEvents,
        isToday: isSameDay(new Date(dateKey), today),
      }));

    if (groupedArray.length === 0) {
      return (
        <Card className="border-border/60">
          <CardContent className="flex h-64 items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">
                {t("calendar.agenda.noEvents")}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="mx-4 mt-4 mb-4 space-y-4">
        {groupedArray.map(({ date, dateKey, events: dayEvents, isToday }) => (
          <Card
            key={dateKey}
            className={cn(
              "border-border/60 transition-colors",
              isToday && "border-primary/40 bg-primary/5"
            )}
          >
            <CardContent className="p-4">
              {/* Date header - estilo AgendaView */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-foreground">
                    {format(date, "d", { locale: dateLocale })}
                  </span>
                  <span className="text-xs text-muted-foreground uppercase">
                    {format(date, "MMM", { locale: dateLocale })}
                  </span>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {format(date, "EEEE", { locale: dateLocale })}
                    </h3>
                    {isToday && (
                      <Badge variant="default" className="text-xs">
                        {t("calendar.today")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(date, "PPP", { locale: dateLocale })}
                  </p>
                </div>
                <Badge variant="outline" className="ml-auto">
                  {dayEvents.length}{" "}
                  {dayEvents.length === 1
                    ? t("calendar.agenda.event")
                    : t("calendar.agenda.events")}
                </Badge>
              </div>

              {/* Events list - estilo AgendaView pero con colores de TaskCalendar */}
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const eventColor = resolveEventColor(event);

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(e) => onEventClick?.(event, e)}
                      className="group w-full rounded-lg border border-border/60 bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        {/* Color indicator - usando colores de TaskCalendar */}
                        <div
                          className="mt-1 h-10 w-1 rounded-full"
                          style={{ backgroundColor: eventColor }}
                        />

                        {/* Event details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {event.title}
                            </h4>
                            {event.status && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "shrink-0 text-xs",
                                  statusColors[event.status as TaskStatus] ||
                                    "bg-gray-100 text-gray-800 border-gray-200"
                                )}
                              >
                                {t(
                                  `tasks.statuses.${event.status}`
                                )}
                              </Badge>
                            )}
                          </div>

                          {event.description && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              {event.description}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {/* Time */}
                            {!event.all_day && (
                              <div className="flex items-center gap-1">
                                <span>🕐</span>
                                <span>
                                  {format(new Date(event.start_time), "HH:mm", {
                                    locale: dateLocale,
                                  })}{" "}
                                  -{" "}
                                  {format(new Date(event.end_time), "HH:mm", {
                                    locale: dateLocale,
                                  })}
                                </span>
                              </div>
                            )}

                            {event.all_day && (
                              <div className="flex items-center gap-1">
                                <span>📅</span>
                                <span>{t("calendar.events.allDay")}</span>
                              </div>
                            )}

                            {/* Location */}
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <span>📍</span>
                                <span className="truncate max-w-[200px]">
                                  {event.location}
                                </span>
                              </div>
                            )}

                            {/* Recurrence indicator */}
                            {event.recurrence_type &&
                              event.recurrence_type !== "none" && (
                                <div className="flex items-center gap-1">
                                  <span>🔄</span>
                                  <span>
                                    {t("calendar.recurrence.recurring")}
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Toolbar */}
      {showHeader && (
        <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
              onClick={() => navigateDate("prev")}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
              onClick={() => navigateDate("next")}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium truncate">
              {format(currentDate, "MMMM yyyy", { locale: dateLocale })}
            </div>
            <Button
              variant="outline"
              className="min-h-[44px] sm:min-h-0"
              onClick={() => onDateChange(new Date())}
            >
              {t("calendar.today")}
            </Button>
          </div>

          <div className="flex items-center gap-1 sm:space-x-2 overflow-x-auto">
            <Button
              variant={viewType === "month" ? "default" : "outline"}
              size="sm"
              className="min-h-[44px] sm:min-h-0 text-xs sm:text-sm"
              onClick={() => onViewTypeChange("month")}
            >
              {t("calendar.views.month")}
            </Button>
            <Button
              variant={viewType === "week" ? "default" : "outline"}
              size="sm"
              className="min-h-[44px] sm:min-h-0 text-xs sm:text-sm"
              onClick={() => onViewTypeChange("week")}
            >
              {t("calendar.views.week")}
            </Button>
            <Button
              variant={viewType === "day" ? "default" : "outline"}
              size="sm"
              className="min-h-[44px] sm:min-h-0 text-xs sm:text-sm"
              onClick={() => onViewTypeChange("day")}
            >
              {t("calendar.views.day")}
            </Button>
            <Button
              variant={viewType === "agenda" ? "default" : "outline"}
              size="sm"
              className="min-h-[44px] sm:min-h-0 text-xs sm:text-sm"
              onClick={() => onViewTypeChange("agenda")}
            >
              {t("calendar.views.agenda")}
            </Button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={(event) => {
          const payload = event.active.data.current as DragPayload | undefined;
          if (payload?.eventId) {
            setActiveEventId(payload.eventId);
          }
        }}
        onDragCancel={() => setActiveEventId(null)}
        onDragEnd={(event) => {
          const payload = event.active.data.current as DragPayload | undefined;
          const targetDate = event.over?.data.current?.date as Date | undefined;
          const preserveTime =
            (event.over?.data.current?.preserveTime as boolean | undefined) ??
            true;
          if (!payload?.eventId || !targetDate) {
            setActiveEventId(null);
            return;
          }

          const draggedEvent = events.find(
            (item) => item.id === payload.eventId
          );
          if (!draggedEvent) {
            setActiveEventId(null);
            return;
          }

          if (payload.type === "resize") {
            const direction = payload.direction;
            if (!direction) {
              setActiveEventId(null);
              return;
            }
            handleResize(draggedEvent, targetDate, direction, preserveTime);
          } else {
            onEventMove?.(draggedEvent, targetDate, { preserveTime });
          }
          setActiveEventId(null);
        }}
      >
        <div>
          {viewType === "month" && renderMonthView()}
          {viewType === "week" && renderWeekView()}
          {viewType === "day" && renderDayView()}
          {viewType === "agenda" && renderAgendaView()}
        </div>
        <DragOverlay>
          {activeEvent ? (
            <div className="text-xs px-2 py-1 rounded bg-background border shadow-sm">
              {activeEvent.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
