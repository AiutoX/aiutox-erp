/**
 * TaskAgendaViewIntegrated Component
 * Vista de agenda integrada para tareas
 * Sprint 2.3 - Fase 2
 */

import { useCallback } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon, ClockIcon } from "@hugeicons/core-free-icons";
import { useTasks } from "../hooks/useTasks";
import { format, isToday, isTomorrow, isPast, addDays } from "date-fns";
import type { Task } from "../types/task.types";
import { es } from "date-fns/locale";

interface TaskAgendaViewIntegratedProps {
  daysAhead?: number;
}

export function TaskAgendaViewIntegrated({
  daysAhead = 7,
}: TaskAgendaViewIntegratedProps) {
  const { t } = useTranslation();

  const { data: tasks, isLoading } = useTasks({});

  const getTasksForDate = useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return (
        tasks?.data?.filter((task: Task) => task.due_date === dateStr) || []
      );
    },
    [tasks]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "blocked":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-gray-400";
    }
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Hoy";
    if (isTomorrow(date)) return "Mañana";
    if (isPast(date)) return "Atrasado";
    return format(date, "EEEE d", { locale: es });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Cargando agenda...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate dates for the next few days
  const dates = Array.from({ length: daysAhead }, (_, i) =>
    addDays(new Date(), i)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Calendar01Icon} size={24} />
            Agenda de Tareas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dates.map((date) => {
              const dayTasks = getTasksForDate(date);
              const hasOverdue =
                isPast(date) && !isToday(date) && dayTasks.length > 0;

              return (
                <div key={date.toISOString()} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{getDateLabel(date)}</h3>
                      <span className="text-sm text-muted-foreground">
                        {format(date, "d MMMM", { locale: es })}
                      </span>
                      {hasOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          Atrasado
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {dayTasks.length} tarea{dayTasks.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  {dayTasks.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">
                      <HugeiconsIcon
                        icon={ClockIcon}
                        size={32}
                        className="mx-auto mb-2 opacity-50"
                      />
                      <p className="text-sm">No hay tareas para este día</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayTasks.map((task: Task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                        >
                          <div
                            className={`w-px h-4 rounded-full ${getPriorityColor(task.priority)}`}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">
                                {task.title}
                              </h4>
                              <Badge className={getStatusColor(task.status)}>
                                {t(`tasks.statuses.${task.status}`)}
                              </Badge>
                            </div>

                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-2">
                              <HugeiconsIcon
                                icon={ClockIcon}
                                size={14}
                                className="text-muted-foreground"
                              />
                              <span className="text-xs text-muted-foreground">
                                {task.due_date &&
                                  format(new Date(task.due_date), "HH:mm")}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <Button variant="ghost" size="sm">
                              Ver
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
