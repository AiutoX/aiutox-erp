/**
 * TaskCalendar component
 * Calendar view for tasks with due dates
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths,
  addHours,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
} from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { EmptyState } from "~/components/common/EmptyState";
import { HugeiconsIcon } from "@hugeicons/react";
import { Refresh01Icon } from "@hugeicons/core-free-icons";
import { TaskQuickAdd, type TaskFormMode } from "./TaskQuickAdd";
import { TaskEdit } from "./TaskEdit";
import { EventEdit } from "~/features/calendar/components/EventEdit";
import { CalendarView } from "~/features/calendar/components/CalendarView";
import { useMyTasks, useUpdateTask } from "../hooks/useTasks";
import { useTags } from "~/features/tags/hooks/useTags";
import {
  useEvents,
  useUpdateEvent,
} from "~/features/calendar/hooks/useCalendar";
import type { Task, TaskListParams, TaskUpdate } from "../types/task.types";
import type {
  CalendarEvent,
  Calendar,
  CalendarViewType,
  EventUpdate,
} from "~/features/calendar/types/calendar.types";

interface TaskCalendarProps {
  tasks?: Task[];
  loading?: boolean;
  onRefresh?: () => void;
  onTaskClick?: (task: Task) => void;
  onTaskCreate?: () => void;
  fetchParams?: TaskListParams;
}

interface TaskCalendarFilters {
  status: "all" | Task["status"];
  priority: "all" | Task["priority"];
  search: string;
}

const priorityPalette: Record<string, string> = {
  low: "#16a34a",
  medium: "#f59e0b",
  high: "#f97316",
  urgent: "#ef4444",
};

type QuickAddDefaults = {
  mode: TaskFormMode;
  start: Date | null;
  end: Date | null;
  allDay: boolean;
};

const initialQuickAddDefaults: QuickAddDefaults = {
  mode: "event",
  start: null,
  end: null,
  allDay: false,
};

const applyPreservedTime = (
  targetDate: Date,
  reference?: string | null,
  preserveTime?: boolean
) => {
  const nextDate = new Date(targetDate);
  if (preserveTime && reference) {
    const existing = new Date(reference);
    if (!Number.isNaN(existing.getTime())) {
      nextDate.setHours(
        existing.getHours(),
        existing.getMinutes(),
        existing.getSeconds(),
        existing.getMilliseconds()
      );
    }
  }
  return nextDate;
};

const resolveTaskTimes = (task: Task) => {
  const startAt = task.start_at ? new Date(task.start_at) : null;
  const endAt = task.end_at ? new Date(task.end_at) : null;
  const dueDateRaw = task.due_date ?? null;
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const dueHasTime = Boolean(dueDateRaw && dueDateRaw.includes("T"));

  if (startAt) {
    const end = endAt ?? addHours(startAt, 1);
    return { start: startAt, end, dueDate, displayTime: null };
  }

  if (dueDate) {
    const start = startOfDay(dueDate);
    const end = addHours(start, 1);
    return {
      start,
      end,
      dueDate,
      displayTime: dueHasTime ? format(dueDate, "HH:mm") : null,
    };
  }

  return null;
};

const buildTaskUpdatePayload = (
  task: Task,
  targetDate: Date,
  action: "move" | "resize",
  preserveTime?: boolean
) => {
  const hasStart = !!task.start_at;
  const hasEnd = !!task.end_at;

  if (hasStart || hasEnd) {
    const baseStart = task.start_at ?? task.end_at;
    const baseEnd = task.end_at ?? task.start_at;

    if (action === "move") {
      const nextStart = applyPreservedTime(targetDate, baseStart, preserveTime);
      if (task.start_at && task.end_at) {
        const duration =
          new Date(task.end_at).getTime() - new Date(task.start_at).getTime();
        const nextEnd = new Date(nextStart.getTime() + duration);
        return {
          start_at: nextStart.toISOString(),
          end_at: nextEnd.toISOString(),
        };
      }

      return {
        start_at: nextStart.toISOString(),
        end_at: task.end_at ? new Date(task.end_at).toISOString() : null,
      };
    }

    const nextEnd = applyPreservedTime(targetDate, baseEnd, preserveTime);
    return {
      end_at: nextEnd.toISOString(),
    };
  }

  if (task.due_date) {
    const nextDue = applyPreservedTime(targetDate, task.due_date, preserveTime);
    return {
      due_date: nextDue.toISOString(),
    };
  }

  return {};
};

interface MiniCalendarProps {
  monthDate: Date;
  selectedDate: Date;
  highlightDates: Set<string>;
  onSelectDate: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  labels: {
    month: string;
    weekdays: string[];
    today: string;
  };
}

function MiniCalendar({
  monthDate,
  selectedDate,
  highlightDates,
  onSelectDate,
  onMonthChange,
  labels,
}: MiniCalendarProps) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="rounded-xl border border-border/60 dark:border-border/40 bg-[hsl(var(--surface))] dark:bg-[hsl(var(--background))] p-2.5 space-y-2 shadow-sm">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMonthChange(subMonths(monthDate, 1))}
        >
          ‹
        </Button>
        <div className="text-sm font-semibold text-foreground">
          {labels.month}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMonthChange(addMonths(monthDate, 1))}
        >
          ›
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground">
        {labels.weekdays.map((day) => (
          <div key={day} className="text-center">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-sm">
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthDate);
          const hasEvents = highlightDates.has(dayKey);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={`relative h-8 w-8 rounded-md text-xs transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted dark:hover:bg-muted/50"
              } ${!isCurrentMonth ? "text-muted-foreground opacity-50" : "text-foreground"}`}
            >
              {format(day, "d")}
              {hasEvents && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onSelectDate(new Date())}
      >
        {labels.today}
      </Button>
    </div>
  );
}

export function TaskCalendar({
  tasks,
  loading,
  onRefresh,
  onTaskClick,
  onTaskCreate,
  fetchParams,
}: TaskCalendarProps) {
  const { t, language } = useTranslation();
  const dateLocale = language === "en" ? enUS : es;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>("month");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const [quickAddDefaults, setQuickAddDefaults] = useState<QuickAddDefaults>(
    initialQuickAddDefaults
  );
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [calendarTasks, setCalendarTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskCalendarFilters>({
    status: "all",
    priority: "all",
    search: "",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [miniMonthDate, setMiniMonthDate] = useState(currentDate);

  const tasksQuery = useMyTasks(fetchParams ?? { page: 1, page_size: 100 });
  const updateTaskMutation = useUpdateTask();
  const updateEventMutation = useUpdateEvent();
  const { data: tagList = [] } = useTags();

  // Obtener eventos del calendario
  const { data: eventsData } = useEvents();
  const calendarEvents = useMemo(
    () => eventsData?.data || [],
    [eventsData?.data]
  );

  const resolvedTasks = useMemo(
    () => tasks ?? tasksQuery.data?.data ?? [],
    [tasks, tasksQuery.data?.data]
  );
  const isLoading = loading ?? tasksQuery.isLoading;

  useEffect(() => {
    setMiniMonthDate(currentDate);
  }, [currentDate]);

  useEffect(() => {
    setCalendarTasks(resolvedTasks);
  }, [resolvedTasks]);

  const filteredTasks = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return calendarTasks.filter((task) => {
      if (!task.due_date && !task.start_at && !task.end_at) {
        return false;
      }
      if (filters.status !== "all" && task.status !== filters.status) {
        return false;
      }
      if (filters.priority !== "all" && task.priority !== filters.priority) {
        return false;
      }
      if (
        search &&
        !task.title.toLowerCase().includes(search) &&
        !(task.description || "").toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });
  }, [calendarTasks, filters]);

  const calendars = useMemo<Calendar[]>(() => {
    const tenantId =
      filteredTasks[0]?.tenant_id ?? calendarTasks[0]?.tenant_id ?? "";
    return (["low", "medium", "high", "urgent"] as const).map((priority) => ({
      id: `tasks-${priority}`,
      tenant_id: tenantId,
      name: t(`tasks.priorities.${priority}` as const),
      calendar_type: "tasks",
      is_public: false,
      is_default: priority === "medium",
      color: priorityPalette[priority],
      created_at: "",
      updated_at: "",
    }));
  }, [filteredTasks, calendarTasks, t]);

  const tagsById = useMemo(() => {
    return new Map(tagList.map((tag) => [tag.id, tag]));
  }, [tagList]);

  const resolveTaskColor = useCallback(
    (task: Task) => {
      if (task.color_override) {
        return task.color_override;
      }
      const firstTagId = task.tag_ids?.[0];
      const tagColor = firstTagId ? tagsById.get(firstTagId)?.color : undefined;
      return tagColor || priorityPalette[task.priority] || "#023E87";
    },
    [tagsById]
  );

  const taskColorsById = useMemo(() => {
    return new Map(
      filteredTasks.map((task) => [task.id, resolveTaskColor(task)])
    );
  }, [filteredTasks, resolveTaskColor]);

  const { eventTasks, dueOnlyTasks } = useMemo(() => {
    const eventsBucket: Task[] = [];
    const dueBucket: Task[] = [];
    filteredTasks.forEach((task) => {
      if (task.start_at || task.end_at) {
        eventsBucket.push(task);
        return;
      }
      if (task.due_date) {
        dueBucket.push(task);
      }
    });
    return { eventTasks: eventsBucket, dueOnlyTasks: dueBucket };
  }, [filteredTasks]);

  const events = useMemo<CalendarEvent[]>(() => {
    // Convertir tareas a eventos
    const taskEvents = [...eventTasks, ...dueOnlyTasks].flatMap((task) => {
      const times = resolveTaskTimes(task);
      if (!times) {
        return [];
      }

      return [
        {
          id: task.id,
          tenant_id: task.tenant_id,
          calendar_id: `tasks-${task.priority}`,
          title: task.title,
          description: task.description ?? "",
          start_time: times.start.toISOString(),
          end_time: times.end.toISOString(),
          location: null,
          all_day: task.all_day ?? false,
          status: task.status,
          source_type: "task",
          recurrence_type: "none" as const,
          recurrence_end_date: null,
          recurrence_count: null,
          recurrence_interval: 1,
          recurrence_days_of_week: null,
          recurrence_day_of_month: null,
          recurrence_month_of_year: null,
          organizer_id: task.created_by_id ?? undefined,
          metadata: {
            ...task.metadata,
            display_time: times.displayTime ?? null,
            color_override: task.color_override ?? null,
            tag_ids: task.tag_ids ?? undefined,
            activity_type:
              (task.start_at && task.end_at && !task.due_date) || task.all_day
                ? "event"
                : "task",
          },
          read_only: false,
          created_at: task.created_at,
          updated_at: task.updated_at,
        },
      ];
    });

    // Combinar con eventos del calendario
    return [...taskEvents, ...calendarEvents];
  }, [eventTasks, dueOnlyTasks, calendarEvents]);

  const highlightDates = useMemo(() => {
    const set = new Set<string>();

    // Agregar fechas de tareas
    filteredTasks.forEach((task) => {
      const anchor = task.start_at || task.due_date || task.end_at;
      if (anchor) {
        const day = format(new Date(anchor), "yyyy-MM-dd");
        set.add(day);
      }
    });

    // Agregar fechas de eventos del calendario
    calendarEvents.forEach((event) => {
      if (event.start_time) {
        const day = format(new Date(event.start_time), "yyyy-MM-dd");
        set.add(day);
      }
    });

    return set;
  }, [filteredTasks, calendarEvents]);

  const applyTaskDateUpdate = (task: Task, payload: Partial<TaskUpdate>) => {
    const nextTask = { ...task };
    if ("start_at" in payload) {
      nextTask.start_at = payload.start_at ?? null;
    }
    if ("end_at" in payload) {
      nextTask.end_at = payload.end_at ?? null;
    }
    if ("due_date" in payload) {
      nextTask.due_date = payload.due_date ?? undefined;
    }
    return nextTask;
  };

  const applyOptimisticUpdate = (
    taskId: string,
    payload: Partial<TaskUpdate>
  ) => {
    setCalendarTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? applyTaskDateUpdate(task, payload) : task
      )
    );
  };

  const handleRefresh = () => {
    onRefresh?.();
    if (!tasks) {
      void tasksQuery.refetch();
    }
  };

  const openQuickAdd = useCallback(
    (config?: Partial<QuickAddDefaults> & { dueDate?: Date | null }) => {
      const start = config?.start ?? null;
      const end = config?.end ?? (start ? addHours(start, 1) : null);
      setQuickAddDefaults({
        mode: config?.mode ?? "event",
        start,
        end,
        allDay: config?.allDay ?? false,
      });
      setQuickAddDate(config?.dueDate ?? null);
      setIsQuickAddOpen(true);
    },
    []
  );

  const handleEventCreate = (date: Date) => {
    const baseStart = new Date(date);
    const isMonthView = viewType === "month";
    if (isMonthView) {
      baseStart.setHours(9, 0, 0, 0);
    }
    openQuickAdd({
      mode: "event",
      start: baseStart,
      end: addHours(baseStart, 1),
      allDay: isMonthView,
    });
  };

  const handleTaskClick = (task: Task) => {
    if (onTaskClick) {
      onTaskClick(task);
      return;
    }
    setEditingTask(task);
  };

  const handleEventMove = (
    event: CalendarEvent,
    targetDate: Date,
    options?: { preserveTime: boolean }
  ) => {
    const task = calendarTasks.find((item) => item.id === event.id);
    if (!task) {
      return;
    }

    const payload = buildTaskUpdatePayload(
      task,
      targetDate,
      "move",
      options?.preserveTime
    );
    applyOptimisticUpdate(task.id, payload);
    updateTaskMutation.mutate(
      {
        id: task.id,
        payload: {
          ...payload,
        },
      },
      {
        onSuccess: () => {
          handleRefresh();
        },
        onError: () => {
          handleRefresh();
        },
      }
    );
  };

  const handleEventResize = (
    event: CalendarEvent,
    targetDate: Date,
    options?: { preserveTime: boolean }
  ) => {
    // Determinar si es tarea o evento
    const isTask =
      event.source_type === "task" || event.metadata?.activity_type === "task";

    if (isTask) {
      // Manejar resize de tarea
      const task = calendarTasks.find((item) => item.id === event.id);
      if (!task) {
        return;
      }

      const payload = buildTaskUpdatePayload(
        task,
        targetDate,
        "resize",
        options?.preserveTime
      );
      applyOptimisticUpdate(task.id, payload);
      updateTaskMutation.mutate(
        {
          id: task.id,
          payload: {
            ...payload,
          },
        },
        {
          onSuccess: () => {
            handleRefresh();
          },
          onError: (error) => {
            console.error("Failed to update task:", error);
            // Revertir optimist update si falla
            handleRefresh();
          },
        }
      );
    } else {
      // Manejar resize de evento - usar las fechas del evento actualizado
      // El CalendarView ya calculó las fechas correctas usando buildResizedEventTimesWithValidation
      // y las pasó en el objeto event actualizado
      const eventPayload: EventUpdate = {
        start_time: event.start_time,
        end_time: event.end_time,
      };

      updateEventMutation.mutate(
        {
          id: event.id,
          payload: eventPayload,
        },
        {
          onSuccess: () => {
            handleRefresh();
          },
          onError: (error: unknown) => {
            console.error("Failed to update event:", error);
            // Revertir optimist update si falla
            handleRefresh();
          },
        }
      );
    }
  };

  const hasEvents = events.length > 0;
  const monthLabel = format(
    currentDate,
    viewType === "day" ? "PPP" : "MMMM yyyy",
    { locale: dateLocale }
  );

  const miniMonthLabel = format(miniMonthDate, "MMMM yyyy", {
    locale: dateLocale,
  });

  const navigateDate = (direction: "prev" | "next") => {
    if (viewType === "month") {
      setCurrentDate(
        direction === "prev"
          ? subMonths(currentDate, 1)
          : addMonths(currentDate, 1)
      );
      return;
    }
    if (viewType === "week") {
      setCurrentDate(
        direction === "prev"
          ? subWeeks(currentDate, 1)
          : addWeeks(currentDate, 1)
      );
      return;
    }
    if (viewType === "day") {
      setCurrentDate(
        direction === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1)
      );
    }
  };

  const upcomingTasks = useMemo(() => {
    return [...eventTasks]
      .filter((task) => task.start_at || task.end_at)
      .sort((a, b) => {
        const aDate = new Date(a.start_at ?? a.end_at ?? a.updated_at);
        const bDate = new Date(b.start_at ?? b.end_at ?? b.updated_at);
        return aDate.getTime() - bDate.getTime();
      })
      .slice(0, 3);
  }, [eventTasks]);

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const done = filteredTasks.filter((task) => task.status === "done").length;
    const overdue = filteredTasks.filter((task) => {
      if (!task.due_date) return false;
      return new Date(task.due_date) < new Date();
    }).length;
    const today = filteredTasks.filter((task) => {
      const anchor = task.start_at ?? task.due_date;
      if (!anchor) return false;
      const anchorDate = new Date(anchor);
      const now = new Date();
      return (
        anchorDate.getDate() === now.getDate() &&
        anchorDate.getMonth() === now.getMonth() &&
        anchorDate.getFullYear() === now.getFullYear()
      );
    }).length;
    return { total, done, overdue, today };
  }, [filteredTasks]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-[hsl(var(--card))] dark:bg-[hsl(var(--surface))] dark:border-border/40 px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              {t("calendar.today")}
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("common.previous")}
                onClick={() => navigateDate("prev")}
              >
                ‹
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("common.next")}
                onClick={() => navigateDate("next")}
              >
                ›
              </Button>
            </div>
            <div className="text-lg font-semibold text-foreground">
              {monthLabel}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(["month", "week", "day", "agenda"] as CalendarViewType[]).map(
              (option) => (
                <Button
                  key={option}
                  variant={viewType === option ? "default" : "ghost"}
                  size="sm"
                  className={
                    viewType === option ? "shadow-sm" : "text-muted-foreground"
                  }
                  onClick={() => setViewType(option)}
                >
                  {t(`calendar.views.${option}` as const)}
                </Button>
              )
            )}
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <HugeiconsIcon icon={Refresh01Icon} size={16} />
            </Button>
            <Button
              size="sm"
              onClick={() =>
                openQuickAdd({
                  mode: "event",
                  start: new Date(),
                  end: addHours(new Date(), 1),
                })
              }
            >
              {t("tasks.createActivity") || "Crear Actividad"}
            </Button>
          </div>
        </div>
      </div>

      <TaskQuickAdd
        open={isQuickAddOpen}
        onOpenChange={(open) => {
          setIsQuickAddOpen(open);
          if (!open) {
            setQuickAddDate(null);
            setQuickAddDefaults(initialQuickAddDefaults);
          }
        }}
        initialDueDate={quickAddDate}
        initialStartDate={quickAddDefaults.start}
        initialEndDate={quickAddDefaults.end}
        initialAllDay={quickAddDefaults.allDay}
        defaultMode={quickAddDefaults.mode}
        onTaskCreated={() => {
          setIsQuickAddOpen(false);
          setQuickAddDate(null);
          setQuickAddDefaults(initialQuickAddDefaults);
          onTaskCreate?.();
          handleRefresh();
        }}
      />
      {!onTaskClick && (
        <TaskEdit
          task={editingTask}
          open={Boolean(editingTask)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingTask(null);
            }
          }}
          onTaskUpdated={() => {
            setEditingTask(null);
            handleRefresh();
          }}
        />
      )}
      <EventEdit
        event={editingEvent}
        open={Boolean(editingEvent)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEvent(null);
          }
        }}
        onEventUpdated={() => {
          setEditingEvent(null);
          handleRefresh();
        }}
      />

      <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="border border-border bg-[hsl(var(--card))] dark:bg-[hsl(var(--surface))] dark:border-border/40 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t("calendar.filters.title")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("calendar.filters.description") ||
                    t("calendar.filters.title")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFiltersOpen((prev) => !prev)}
                aria-label={t("common.toggle")}
              >
                {filtersOpen ? "–" : "+"}
              </Button>
            </div>
            {filtersOpen && (
              <div className="space-y-3 border-t px-4 py-4">
                <Input
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: event.target.value,
                    }))
                  }
                  placeholder={t("calendar.filters.search")}
                />
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: value as TaskCalendarFilters["status"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("tasks.status.title")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="todo">
                      {t("tasks.statuses.todo")}
                    </SelectItem>
                    <SelectItem value="in_progress">
                      {t("tasks.statuses.inProgress")}
                    </SelectItem>
                    <SelectItem value="on_hold">
                      {t("tasks.statuses.onHold")}
                    </SelectItem>
                    <SelectItem value="blocked">
                      {t("tasks.statuses.blocked")}
                    </SelectItem>
                    <SelectItem value="review">
                      {t("tasks.statuses.review")}
                    </SelectItem>
                    <SelectItem value="done">
                      {t("tasks.statuses.done")}
                    </SelectItem>
                    <SelectItem value="cancelled">
                      {t("tasks.statuses.cancelled")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.priority}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      priority: value as TaskCalendarFilters["priority"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("tasks.priority.title")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="low">
                      {t("tasks.priorities.low")}
                    </SelectItem>
                    <SelectItem value="medium">
                      {t("tasks.priorities.medium")}
                    </SelectItem>
                    <SelectItem value="high">
                      {t("tasks.priorities.high")}
                    </SelectItem>
                    <SelectItem value="urgent">
                      {t("tasks.priorities.urgent")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() =>
                    setFilters({ status: "all", priority: "all", search: "" })
                  }
                >
                  {t("common.clear")}
                </Button>
              </div>
            )}
          </Card>

          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : (
            <MiniCalendar
              monthDate={miniMonthDate}
              selectedDate={currentDate}
              highlightDates={highlightDates}
              onSelectDate={(date) => {
                setCurrentDate(date);
              }}
              onMonthChange={setMiniMonthDate}
              labels={{
                month: miniMonthLabel,
                weekdays: [
                  t("calendar.weekdays.mon"),
                  t("calendar.weekdays.tue"),
                  t("calendar.weekdays.wed"),
                  t("calendar.weekdays.thu"),
                  t("calendar.weekdays.fri"),
                  t("calendar.weekdays.sat"),
                  t("calendar.weekdays.sun"),
                ],
                today: t("calendar.today"),
              }}
            />
          )}

          <Card className="border border-border bg-[hsl(var(--card))] dark:bg-[hsl(var(--surface))] dark:border-border/40 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {t("tasks.summary.reminders") || "Recordatorios"}
              </p>
              <Badge variant="outline">{dueOnlyTasks.length}</Badge>
            </div>
            <Separator className="my-3" />
            <div className="space-y-2">
              {dueOnlyTasks.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("tasks.summary.noDueOnly") || "Sin tareas por vencer"}
                </p>
              )}
              {dueOnlyTasks.slice(0, 5).map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className="w-full rounded-lg border dark:border-border/40 dark:bg-[hsl(var(--background))] px-3 py-2 text-left transition hover:border-primary/60 hover:bg-primary/5 dark:hover:bg-primary/10"
                  onClick={() => handleTaskClick(task)}
                >
                  <p className="text-sm font-medium text-foreground">
                    {task.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {task.due_date
                      ? format(new Date(task.due_date), "PPPp", {
                          locale: dateLocale,
                        })
                      : t("tasks.summary.noDate") || "Sin fecha"}
                  </p>
                </button>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="space-y-2">
              {upcomingTasks.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("tasks.summary.empty") || "No hay tareas programadas"}
                </p>
              )}
              {upcomingTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className="w-full text-left rounded-lg border dark:border-border/40 dark:bg-[hsl(var(--background))] px-3 py-2 hover:border-primary/60 hover:bg-primary/5 dark:hover:bg-primary/10"
                  onClick={() => handleTaskClick(task)}
                >
                  <p className="text-sm font-medium text-foreground">
                    {task.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {task.start_at
                      ? format(new Date(task.start_at), "PPPp", {
                          locale: dateLocale,
                        })
                      : task.due_date
                        ? format(new Date(task.due_date), "PPP", {
                            locale: dateLocale,
                          })
                        : t("tasks.summary.noDate") || "Sin fecha"}
                  </p>
                </button>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          {isLoading ? (
            <Skeleton className="h-[520px] w-full rounded-2xl" />
          ) : !hasEvents ? (
            <EmptyState
              title={t("calendar.emptyTitle")}
              description={t("calendar.emptyDescription")}
              action={
                <Button
                  onClick={() =>
                    openQuickAdd({
                      mode: "event",
                      start: new Date(),
                      end: addHours(new Date(), 1),
                    })
                  }
                >
                  {t("tasks.createActivity") || "Crear Actividad"}
                </Button>
              }
            />
          ) : (
            <div
              className="rounded-2xl border border-border bg-[hsl(var(--card))] dark:bg-[hsl(var(--surface))] dark:border-border/40 flex flex-col overflow-hidden shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
              style={{
                ["--event-height" as string]: "26px",
                ["--event-gap" as string]: "6px",
              }}
            >
              <div className="flex flex-col">
                <CalendarView
                  events={events}
                  calendars={calendars}
                  viewType={viewType}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                  onViewTypeChange={setViewType}
                  getEventColor={(event) =>
                    taskColorsById.get(event.id) || "#023E87"
                  }
                  onEventClick={(event) => {
                    // Verificar si es una tarea
                    const task = calendarTasks.find(
                      (item) => item.id === event.id
                    );
                    if (task) {
                      handleTaskClick(task);
                      return;
                    }

                    // Si no es tarea, es un evento del calendario
                    const calendarEvent = calendarEvents.find(
                      (item) => item.id === event.id
                    );
                    if (calendarEvent) {
                      setEditingEvent(calendarEvent);
                    }
                  }}
                  onEventCreate={handleEventCreate}
                  onEventMove={handleEventMove}
                  onEventResize={handleEventResize}
                  showHeader={false}
                />
              </div>
              <div className="border-t border-border/50 dark:border-border/40 bg-[hsl(var(--surface))] dark:bg-[hsl(var(--background))] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("tasks.summary.title") || "Resumen de tareas"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("tasks.summary.subtitle") || "Actividad reciente"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">
                      {t("tasks.summary.today") || "Para hoy"}
                    </p>
                    <p className="font-semibold text-base">{stats.today}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">
                      {t("tasks.summary.overdue") || "Atrasadas"}
                    </p>
                    <p className="font-semibold text-base text-red-500">
                      {stats.overdue}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">
                      {t("tasks.summary.completed") || "Completadas"}
                    </p>
                    <p className="font-semibold text-base text-emerald-600">
                      {stats.done}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">
                      {t("tasks.summary.total") || "Total"}
                    </p>
                    <Badge variant="secondary">{stats.total}</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
