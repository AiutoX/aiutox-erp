/**
 * BoardViewWrapper component
 * Wrapper para BoardView que provee los statuses y handlers necesarios
 */

import { useMemo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { BoardView } from "./BoardView";
import { TaskStatusManagerModal } from "./TaskStatusManagerModal";
import { useUpdateTask } from "../hooks/useTasks";
import { useTaskStatuses } from "../hooks/useTaskStatuses";
import { showToast } from "~/components/common/Toast";
import { Button } from "~/components/ui/button";
import { Settings } from "lucide-react";
import type { Task } from "../types/task.types";

interface BoardViewWrapperProps {
  tasks: Task[];
  loading?: boolean;
  onTaskClick?: (task: Task) => void;
  onRefresh?: () => void;
}

export function BoardViewWrapper({
  tasks,
  loading = false,
  onTaskClick,
  onRefresh,
}: BoardViewWrapperProps) {
  const { t } = useTranslation();
  const { statuses: userStatuses } = useTaskStatuses();
  const updateTaskMutation = useUpdateTask();

  // Combinar estados del sistema con estados del usuario
  const allStatuses = useMemo(() => {
    const systemStatuses = [
      {
        id: "todo",
        name: "Por Hacer",
        type: "open" as const,
        color: "#6b7280",
        order: 0,
        tenant_id: "",
        is_system: true,
        created_at: "",
        updated_at: "",
      },
      {
        id: "in_progress",
        name: "En Progreso",
        type: "in_progress" as const,
        color: "#3b82f6",
        order: 1,
        tenant_id: "",
        is_system: true,
        created_at: "",
        updated_at: "",
      },
      {
        id: "on_hold",
        name: "En Espera",
        type: "on_hold" as const,
        color: "#f59e0b",
        order: 2,
        tenant_id: "",
        is_system: true,
        created_at: "",
        updated_at: "",
      },
      {
        id: "done",
        name: "Completado",
        type: "completed" as const,
        color: "#22c55e",
        order: 3,
        tenant_id: "",
        is_system: true,
        created_at: "",
        updated_at: "",
      },
      {
        id: "cancelled",
        name: "Cancelado",
        type: "canceled" as const,
        color: "#ef4444",
        order: 4,
        tenant_id: "",
        is_system: true,
        created_at: "",
        updated_at: "",
      },
    ];

    return [...systemStatuses, ...(userStatuses || [])].sort(
      (a, b) => a.order - b.order
    );
  }, [userStatuses]);

  // Preparar tareas con status_id mapeado desde status
  const preparedTasks = useMemo(() => {
    return tasks.map((task) => ({
      ...task,
      // Asegurar que cada tarea tenga status_id
      status_id: task.status_id || task.status || "todo",
      // Asegurar board_order
      board_order: task.board_order ?? 0,
    }));
  }, [tasks]);

  // Handler para movimiento de tareas con actualización a DB
  const handleTaskMove = (
    taskId: string,
    newStatusId: string,
    newOrder: number
  ) => {
    // Validar que newStatusId es un TaskStatus válido
    const validStatuses = [
      "todo",
      "in_progress",
      "on_hold",
      "blocked",
      "review",
      "done",
      "cancelled",
    ];
    if (!validStatuses.includes(newStatusId)) {
      showToast(t("tasks.board.invalidStatus"), "error");
      return;
    }

    // Actualizar tarea en la base de datos
    updateTaskMutation.mutate(
      {
        id: taskId,
        payload: {
          status: newStatusId as Task["status"], // Cast a TaskStatus
          status_id: newStatusId,
          board_order: newOrder,
        },
      },
      {
        onSuccess: () => {
          showToast(t("tasks.board.taskMovedSuccess"), "success");
          // Refrescar lista de tareas
          if (onRefresh) {
            onRefresh();
          }
        },
        onError: () => {
          showToast(t("tasks.board.taskMoveError"), "error");
        },
      }
    );
  };

  // Handler para creación de tareas
  const handleCreateTask = (statusId: string) => {
    // TODO: Implementar creación de tarea con estado preseleccionado
    // Por ahora, este handler está preparado para futuras implementaciones
    showToast(
      t("tasks.board.createTaskInStatus").replace("{status}", statusId),
      "info"
    );
  };

  return (
    <div className="h-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("tasks.tabs.board")}</h3>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {t("tasks.board.dragDropHint")}
          </div>
          <TaskStatusManagerModal
            trigger={
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                {t("tasks.statusManager.title")}
              </Button>
            }
          />
        </div>
      </div>

      <div className="h-[600px]">
        <BoardView
          tasks={preparedTasks}
          statuses={allStatuses}
          onTaskClick={onTaskClick}
          onTaskMove={handleTaskMove}
          onCreateTask={handleCreateTask}
          loading={loading}
        />
      </div>
    </div>
  );
}
