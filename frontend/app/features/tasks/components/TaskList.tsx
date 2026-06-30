/**
 * TaskList component
 * Displays a list of tasks with filters and actions
 */

import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useState, useMemo, memo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { DataTable } from "~/components/common/DataTable";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete01Icon,
  Edit01Icon,
  Refresh01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { TaskEdit } from "./TaskEdit";
import { TaskView } from "./TaskView";
import { useTaskAssignments } from "../hooks/useTasks";
import { calculateSubtaskProgress } from "~/features/tasks/utils/subtasks";
import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskAssignment,
} from "~/features/tasks/types/task.types";

interface TaskListProps {
  tasks: Task[];
  assignments?: Record<string, TaskAssignment[]>; // taskId -> assignments
  loading?: boolean;
  onRefresh?: () => void;
  onTaskDelete?: (task: Task) => void;
  onTaskComplete?: (taskId: string, itemId: string) => void;
  onTaskCreate?: () => void;
  onFilterBySourceModule?: (sourceModule: string | null) => void;
  onFilterChange?: (filters: TaskFilters) => void;
}

interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  sourceModule?: string;
  assignedToId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-800 border-gray-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  on_hold: "bg-yellow-100 text-yellow-800 border-yellow-200",
  blocked: "bg-red-100 text-red-800 border-red-200",
  review: "bg-purple-100 text-purple-800 border-purple-200",
  done: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-800 border-gray-200",
  medium: "bg-orange-100 text-orange-800 border-orange-200",
  high: "bg-red-100 text-red-800 border-red-200",
  urgent: "bg-purple-100 text-purple-800 border-purple-200",
};

export const TaskAdvancedFilter = memo(
  ({
    tasks,
    assignments: _assignments,
    loading,
    onRefresh,
    onTaskDelete,
    onTaskComplete: _onTaskComplete,
    onTaskCreate,
    onFilterBySourceModule: _onFilterBySourceModule,
    onFilterChange,
  }: TaskListProps) => {
    const { t, language } = useTranslation();

    const dateLocale = language === "es" ? es : enUS;

    // Memoizar taskIds para evitar recalcular en cada render
    const taskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);
    const { assignments: assignmentsWithUsers } = useTaskAssignments(taskIds);

    const [filters, setFilters] = useState<TaskFilters>({});
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [viewingTask, setViewingTask] = useState<Task | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);

    // Memoizar filtrado de tareas
    const filteredTasks = useMemo(() => {
      return tasks.filter((task) => {
        if (filters.status && task.status !== filters.status) return false;
        if (filters.priority && task.priority !== filters.priority)
          return false;
        if (filters.sourceModule && task.source_module !== filters.sourceModule)
          return false;
        if (
          filters.search &&
          !task.title.toLowerCase().includes(filters.search.toLowerCase())
        )
          return false;
        if (
          filters.dueDateFrom &&
          task.due_date &&
          new Date(task.due_date) < new Date(filters.dueDateFrom)
        )
          return false;
        if (
          filters.dueDateTo &&
          task.due_date &&
          new Date(task.due_date) > new Date(filters.dueDateTo)
        )
          return false;
        return true;
      });
    }, [tasks, filters]);

    const handleFilterChange = (updates: Partial<TaskFilters>) => {
      const newFilters = { ...filters, ...updates };
      setFilters(newFilters);
      onFilterChange?.(newFilters);
    };

    const clearFilters = () => {
      setFilters({});
      onFilterChange?.({});
    };

    const handleEditTask = (task: Task) => {
      setEditingTask(task);
      setIsEditOpen(true);
    };

    const handleTaskUpdated = () => {
      // No cerrar el modal automáticamente, solo refrescar los datos
      // El usuario decidirá cuándo cerrar el modal
      onRefresh?.();
    };

    const handleViewTask = (task: Task) => {
      setViewingTask(task);
      setIsViewOpen(true);
    };

    const hasActiveFilters = Object.keys(filters).some(
      (key) =>
        filters[key as keyof TaskFilters] !== undefined &&
        filters[key as keyof TaskFilters] !== ""
    );

    const formatDate = (dateString: string) => {
      return format(new Date(dateString), "PPP", { locale: dateLocale });
    };

    const getStatusBadge = (status: TaskStatus) => {
      return (
        <Badge variant="outline" className={statusColors[status]}>
          {t(`tasks.statuses.${status}`)}
        </Badge>
      );
    };

    const getPriorityBadge = (priority: TaskPriority) => {
      return (
        <Badge variant="outline" className={priorityColors[priority]}>
          {t(`tasks.priorities.${priority}`)}
        </Badge>
      );
    };

    // Función para determinar el tipo de actividad
    const getActivityType = (task: Task): "tarea" | "evento" => {
      // Si tiene start_at y end_at definidos, es un evento
      if (task.start_at && task.end_at) {
        return "evento";
      }
      // Si solo tiene due_date o es del módulo calendar, es una tarea
      return "tarea";
    };

    // Función para formatear tiempo restante para humanos
    const getTimeRemaining = (endDate: string): string => {
      const now = new Date();
      const end = new Date(endDate);
      const diffMs = end.getTime() - now.getTime();

      if (diffMs <= 0) {
        return "Finalizado";
      }

      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(
        (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffDays > 0) {
        return `${diffDays} día${diffDays > 1 ? "s" : ""}`;
      } else if (diffHours > 0) {
        return `${diffHours} hora${diffHours > 1 ? "s" : ""}`;
      } else {
        return `${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""}`;
      }
    };

    // Función para formatear fechas de inicio y fin
    const formatStartEndDates = (
      startAt?: string | null,
      endAt?: string | null
    ): string => {
      if (!startAt && !endAt) return "-";

      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      };

      if (startAt && endAt) {
        return `${formatDate(startAt)} - ${formatDate(endAt)}`;
      } else if (startAt) {
        return `Desde: ${formatDate(startAt)}`;
      } else if (endAt) {
        return `Hasta: ${formatDate(endAt)}`;
      }

      return "-";
    };

    const columns = [
      {
        key: "title",
        header: "Descripción",
        cell: (task: Task) => {
          const activityType = getActivityType(task);
          const typeLabel = activityType === "evento" ? "Evento" : "Tarea";
          const progress = calculateSubtaskProgress(task);
          return (
            <div className="font-medium">
              <span>
                {typeLabel}: {task.title}
              </span>
              {progress.total > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 text-[10px] px-1.5 py-0"
                >
                  {progress.completed}/{progress.total}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        key: "status",
        header: t("tasks.statuses.title") || "Status",
        cell: (task: Task) => {
          const activityType = getActivityType(task);

          if (activityType === "evento") {
            // Para eventos, mostrar tiempo restante
            const timeRemaining = task.end_at
              ? getTimeRemaining(task.end_at)
              : "Sin fecha";
            return (
              <Badge
                variant="outline"
                className="bg-blue-100 text-blue-800 border-blue-200"
              >
                {timeRemaining}
              </Badge>
            );
          } else {
            // Para tareas, mostrar estado normal
            return getStatusBadge(task.status);
          }
        },
      },
      {
        key: "priority",
        header: t("tasks.priorities.title") || "Priority",
        cell: (task: Task) => getPriorityBadge(task.priority),
      },
      {
        key: "assigned_to",
        header: t("tasks.assignedTo"),
        cell: (task: Task) => {
          const taskAssignments = assignmentsWithUsers[task.id] || [];

          if (taskAssignments.length === 0) {
            return <span className="text-sm">-</span>;
          }

          return (
            <div className="flex flex-wrap gap-1">
              {taskAssignments.map(
                (assignment: { id: string; userName: string }) => (
                  <Badge
                    key={assignment.id}
                    variant="secondary"
                    className="text-xs"
                  >
                    {assignment.userName}
                  </Badge>
                )
              )}
            </div>
          );
        },
      },
      {
        key: "due_date",
        header: "Fechas",
        cell: (task: Task) => {
          const activityType = getActivityType(task);

          if (activityType === "evento") {
            // Para eventos, mostrar fechas de inicio y fin
            const dates = formatStartEndDates(task.start_at, task.end_at);
            return <span className="text-sm">{dates}</span>;
          } else {
            // Para tareas, mostrar fecha de vencimiento normal
            return (
              <span className="text-sm">
                {task.due_date ? formatDate(task.due_date) : "-"}
              </span>
            );
          }
        },
      },
      {
        key: "actions",
        header: t("common.actions"),
        cell: (task: Task) => (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleViewTask(task)}
            >
              <HugeiconsIcon icon={ViewIcon} size={12} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleEditTask(task)}
              disabled={task.status === "done" || task.status === "cancelled"}
            >
              <HugeiconsIcon icon={Edit01Icon} size={12} />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onTaskDelete?.(task)}
              disabled={task.status === "done" || task.status === "cancelled"}
            >
              <HugeiconsIcon icon={Delete01Icon} size={12} />
            </Button>
          </div>
        ),
      },
    ];

    if (loading) {
      return (
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary" />
              <span>{t("tasks.loading") || "Loading..."}</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!tasks.length) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">{t("tasks.noTasks")}</div>
            <Button onClick={onTaskCreate}>
              {t("tasks.createActivity") || "Crear Actividad"}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Advanced Filters */}
        <Card className="border-0 shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold">
                  {t("tasks.advancedFilters")}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {filteredTasks.length} {t("tasks.stats.total")}
                </Badge>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {t("tasks.clearFilters")}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label>{t("tasks.statuses.title") || "Status"}</Label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) =>
                    handleFilterChange({
                      status:
                        value === "all" ? undefined : (value as TaskStatus),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("tasks.filterAllStatuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("tasks.all")}</SelectItem>
                    <SelectItem value="todo">
                      {t("tasks.statuses.todo")}
                    </SelectItem>
                    <SelectItem value="in_progress">
                      {t("tasks.statuses.inProgress")}
                    </SelectItem>
                    <SelectItem value="done">
                      {t("tasks.statuses.done")}
                    </SelectItem>
                    <SelectItem value="on_hold">
                      {t("tasks.statuses.onHold")}
                    </SelectItem>
                    <SelectItem value="cancelled">
                      {t("tasks.statuses.cancelled")}
                    </SelectItem>
                    <SelectItem value="blocked">
                      {t("tasks.statuses.blocked")}
                    </SelectItem>
                    <SelectItem value="review">
                      {t("tasks.statuses.review")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label>{t("tasks.priorities.title") || "Priority"}</Label>
                <Select
                  value={filters.priority || "all"}
                  onValueChange={(value) =>
                    handleFilterChange({
                      priority:
                        value === "all" ? undefined : (value as TaskPriority),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("tasks.filterAllPriorities")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("tasks.all")}</SelectItem>
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
              </div>

              {/* Source Module Filter */}
              <div className="space-y-2">
                <Label>{t("tasks.sourceModule")}</Label>
                <Select
                  value={filters.sourceModule || "all"}
                  onValueChange={(value) =>
                    handleFilterChange({
                      sourceModule: value === "all" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("tasks.filterAllModules")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("tasks.all")}</SelectItem>
                    <SelectItem value="projects">
                      {t("tasks.modules.projects")}
                    </SelectItem>
                    <SelectItem value="workflows">
                      {t("tasks.modules.workflows")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date Range and Assigned To - Same Row */}
              <div className="space-y-2">
                <Label>{t("tasks.filtersDueDateRange")}</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.dueDateFrom || ""}
                    onChange={(e) =>
                      handleFilterChange({ dueDateFrom: e.target.value })
                    }
                    placeholder={t("tasks.from")}
                  />
                  <Input
                    type="date"
                    value={filters.dueDateTo || ""}
                    onChange={(e) =>
                      handleFilterChange({ dueDateTo: e.target.value })
                    }
                    placeholder={t("tasks.to")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("tasks.assignedTo")}</Label>
                <Input
                  value={filters.assignedToId || ""}
                  onChange={(e) =>
                    handleFilterChange({ assignedToId: e.target.value })
                  }
                  placeholder={t("tasks.filtersAssignedToPlaceholder")}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  onClick={onRefresh}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <HugeiconsIcon
                    icon={Refresh01Icon}
                    size={16}
                    className="mr-2"
                  />
                </Button>
                <Button onClick={onTaskCreate} size="sm">
                  {t("tasks.createActivity") || "Crear Actividad"}
                </Button>
              </div>
            </div>

            {/* Active Filters Badges */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mt-4">
                {filters.status && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Estado:{" "}
                    {t(`tasks.statuses.${filters.status}`) || filters.status}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={() => handleFilterChange({ status: undefined })}
                    >
                      <HugeiconsIcon icon={Delete01Icon} size={12} />
                    </Button>
                  </Badge>
                )}
                {filters.priority && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Prioridad:{" "}
                    {t(`tasks.priorities.${filters.priority}`) ||
                      filters.priority}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={() =>
                        handleFilterChange({ priority: undefined })
                      }
                    >
                      <HugeiconsIcon icon={Delete01Icon} size={12} />
                    </Button>
                  </Badge>
                )}
                {filters.sourceModule && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Módulo: {filters.sourceModule}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={() =>
                        handleFilterChange({ sourceModule: undefined })
                      }
                    >
                      <HugeiconsIcon icon={Delete01Icon} size={12} />
                    </Button>
                  </Badge>
                )}
                {(filters.dueDateFrom || filters.dueDateTo) && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Fechas: {filters.dueDateFrom || "..."} -{" "}
                    {filters.dueDateTo || "..."}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={() =>
                        handleFilterChange({
                          dueDateFrom: undefined,
                          dueDateTo: undefined,
                        })
                      }
                    >
                      <HugeiconsIcon icon={Delete01Icon} size={12} />
                    </Button>
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks table */}
        <DataTable
          columns={columns}
          data={filteredTasks}
          pagination={{
            page: 1,
            pageSize: 20,
            total: filteredTasks.length,
            onPageChange: () => {
              // Handle pagination
            },
          }}
          inCard={false}
        />

        {/* Task Edit Modal */}
        <TaskEdit
          task={editingTask}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onTaskUpdated={handleTaskUpdated}
        />

        {/* Task View Modal */}
        <TaskView
          task={viewingTask}
          open={isViewOpen}
          onOpenChange={setIsViewOpen}
        />
      </div>
    );
  }
);

TaskAdvancedFilter.displayName = "TaskAdvancedFilter";
