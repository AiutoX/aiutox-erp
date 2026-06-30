/**
 * BoardView component
 * Kanban-style board for tasks grouped by status
 */

import { useMemo, useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { Task } from "../types/task.types";
import type { TaskStatus } from "../types/status.types";

interface BoardViewProps {
  tasks: Task[];
  statuses: TaskStatus[];
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (taskId: string, newStatusId: string, newOrder: number) => void;
  onCreateTask?: (statusId: string) => void;
  loading?: boolean;
}

const priorityColors: Record<string, string> = {
  low: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  medium:
    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

// Mapeo de nombres de status en español a claves de traducción
const statusNameToKey: Record<string, string> = {
  "Por Hacer": "todo",
  "En Progreso": "inProgress",
  Completado: "done",
  Cancelado: "cancelled",
  "En Espera": "onHold",
  Bloqueada: "blocked",
  "En Revisión": "review",
};

export function BoardView({
  tasks,
  statuses,
  onTaskClick,
  onTaskMove,
  onCreateTask,
  loading = false,
}: BoardViewProps) {
  const { t, language } = useTranslation();
  const dateLocale = language === "en" ? enUS : es;
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const groups = new Map<string, Task[]>();

    // Initialize all status groups
    statuses.forEach((status) => {
      groups.set(status.id, []);
    });

    // Group tasks
    tasks.forEach((task) => {
      const statusId = task.status_id || "";
      if (groups.has(statusId)) {
        groups.get(statusId)!.push(task);
      }
    });

    // Sort tasks within each status by board_order
    groups.forEach((statusTasks) => {
      statusTasks.sort((a, b) => {
        const orderA = a.board_order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.board_order ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    });

    return groups;
  }, [tasks, statuses]);

  // Sort statuses by order
  const sortedStatuses = useMemo(() => {
    return [...statuses].sort((a, b) => a.order - b.order);
  }, [statuses]);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    // Establecer data transfer para mejor compatibilidad
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  };

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(statusId);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverStatus(null);
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    setDragOverStatus(null);

    if (!draggedTask || !onTaskMove) {
      return;
    }

    // Si la tarea ya está en este estado, no hacer nada
    if (draggedTask.status_id === statusId) {
      setDraggedTask(null);
      return;
    }

    const targetTasks = tasksByStatus.get(statusId) || [];
    const newOrder = targetTasks.length;

    onTaskMove(draggedTask.id, statusId, newOrder);
    setDraggedTask(null);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-3 overflow-x-auto pb-4">
      {sortedStatuses.map((status) => {
        const statusTasks = tasksByStatus.get(status.id) || [];
        const isClosedType =
          status.type === "completed" || status.type === "canceled";

        return (
          <div
            key={status.id}
            className={cn(
              "flex min-w-[280px] max-h-[600px] flex-col rounded-lg transition-all",
              dragOverStatus === status.id &&
                "bg-primary/5 ring-2 ring-primary/20"
            )}
            onDragOver={(e) => handleDragOver(e, status.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status.id)}
          >
            {/* Column header */}
            <Card className="mb-2 border-border/60">
              <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <h3 className="font-semibold text-foreground">
                      {t(
                        `tasks.statuses.${statusNameToKey[status.name] || status.name}`
                      ) || status.name}
                    </h3>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {statusTasks.length}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Tasks list */}
            <div className="flex-1 space-y-1.5 overflow-y-auto min-h-[400px]">
              {statusTasks.map((task) => (
                <Card
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "cursor-move border-border/60 transition-all hover:border-primary/40 hover:shadow-md",
                    draggedTask?.id === task.id && "opacity-50"
                  )}
                  onClick={() => onTaskClick?.(task)}
                >
                  <CardContent className="p-3">
                    {/* Task title */}
                    <h4 className="mb-1.5 font-medium text-foreground line-clamp-2 text-sm">
                      {task.title}
                    </h4>

                    {/* Task description */}
                    {task.description && (
                      <p className="mb-2 text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Task metadata */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Priority badge */}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          priorityColors[task.priority] || priorityColors.medium
                        )}
                      >
                        {t(`tasks.priorities.${task.priority}` as const)}
                      </Badge>

                      {/* Due date */}
                      {task.due_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>📅</span>
                          <span>
                            {format(new Date(task.due_date), "MMM d", {
                              locale: dateLocale,
                            })}
                          </span>
                        </div>
                      )}

                      {/* Assigned user indicator */}
                      {task.assigned_to_id && (
                        <div className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {task.assigned_to_id.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Checklist progress */}
                    {task.checklist_items &&
                      task.checklist_items.length > 0 && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>☑</span>
                          <span>
                            {
                              task.checklist_items.filter(
                                (item: { completed: boolean }) => item.completed
                              ).length
                            }
                            /{task.checklist_items.length}
                          </span>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}

              {/* Add task button */}
              {!isClosedType && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                  onClick={() => onCreateTask?.(status.id)}
                >
                  + {t("tasks.createActivity") || "Crear Actividad"}
                </Button>
              )}

              {/* Empty state */}
              {statusTasks.length === 0 && (
                <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-border/60">
                  <p className="text-sm text-muted-foreground">
                    {t("tasks.board.emptyColumn")}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
