/**
 * TaskInbox component
 * Specialized view for quick task capture and triage processing
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InboxIcon,
  PlusSignIcon,
  CheckmarkBadge01Icon,
  Refresh01Icon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons";
import { useMyTasks, useCreateTask, useUpdateTask } from "../hooks/useTasks";
import { useAuthStore } from "~/stores/authStore";
import { showToast } from "~/components/common/Toast";
import type { TaskCreate } from "../types/task.types";

interface TaskInboxProps {
  onTaskProcessed?: () => void;
}

export function TaskInbox({ onTaskProcessed }: TaskInboxProps) {
  const { t } = useTranslation();
  const {
    data: tasksData,
    isLoading: isLoadingTasks,
    error: tasksError,
    refetch,
  } = useMyTasks({ page_size: 50 });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const currentUser = useAuthStore((state) => state.user);

  const tasks = tasksData?.data || [];

  // Debug logs
  console.warn("TaskInbox Debug:", {
    isLoadingTasks,
    tasksError,
    tasksCount: tasks.length,
    currentUser: currentUser?.id,
    createTaskPending: createTask.isPending,
    updateTaskPending: updateTask.isPending,
  });

  // Filter tasks that need triage (temporarily more permissive for debugging)
  const tasksNeedingTriage = tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled"
  );

  const [quickCaptureText, setQuickCaptureText] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Quick capture - parse text into task
  const handleQuickCapture = async () => {
    if (!quickCaptureText.trim()) return;

    try {
      const taskData: Partial<TaskCreate> = {
        title: quickCaptureText.trim(),
        status: "todo",
        priority: "medium",
        description: `${t("tasks.quickAdd.capturedFrom") || "Capturado desde Inbox"}: ${new Date().toLocaleString()}`,
      };

      await createTask.mutateAsync(taskData as TaskCreate);
      setQuickCaptureText("");
      void refetch();
      showToast(t("tasks.quickAdd.success"), "success");
      onTaskProcessed?.();
    } catch (error) {
      console.error("Error creating task:", error);
      showToast(t("tasks.quickAdd.error"), "error");
    }
  };

  // Process selected tasks with bulk action
  const handleBulkAction = async () => {
    if (selectedTasks.length === 0 || !bulkAction) return;

    setIsProcessing(true);
    try {
      const promises = selectedTasks.map((taskId) => {
        const updateData: Record<string, unknown> = {};

        switch (bulkAction) {
          case "assign_me":
            // ✅ FIXED: Use current user ID
            updateData.assigned_to_id = currentUser?.id;
            break;
          case "priority_high":
            updateData.priority = "high";
            break;
          case "priority_low":
            updateData.priority = "low";
            break;
          case "priority_urgent":
            updateData.priority = "urgent";
            break;
          case "in_progress":
            updateData.status = "in_progress";
            break;
          case "done":
            updateData.status = "done";
            break;
          case "on_hold":
            updateData.status = "on_hold";
            break;
          case "blocked":
            updateData.status = "blocked";
            break;
          case "review":
            updateData.status = "review";
            break;
          case "cancelled":
            updateData.status = "cancelled";
            break;
          default:
            return Promise.resolve();
        }

        return updateTask.mutateAsync({ id: taskId, payload: updateData });
      });

      await Promise.all(promises);
      setSelectedTasks([]);
      setBulkAction("");
      void refetch();
      showToast(
        t("tasks.quickAdd.bulkActionSuccess").replace(
          "{count}",
          selectedTasks.length.toString()
        ),
        "success"
      );
      onTaskProcessed?.();
    } catch (error) {
      console.error("Error processing bulk action:", error);
      showToast(t("tasks.quickAdd.bulkActionError"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle task selection
  const toggleTaskSelection = (taskId: string) => {
    console.warn("Toggle task selection:", {
      taskId,
      currentSelected: selectedTasks,
    });
    setSelectedTasks((prev) => {
      const newSelection = prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId];
      console.warn("New selection:", newSelection);
      return newSelection;
    });
  };

  // Select all tasks
  const selectAllTasks = () => {
    setSelectedTasks(tasksNeedingTriage.map((task) => task.id));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedTasks([]);
  };

  return (
    <div className="space-y-4">
      {/* Error and Loading States */}
      {tasksError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>
                {t("tasks.quickAdd.errorLoadingTasks")}: {tasksError.message}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                className="mt-2"
              >
                {t("tasks.quickAdd.retry")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoadingTasks && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>{t("tasks.quickAdd.loadingTasks")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Capture Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <HugeiconsIcon icon={InboxIcon} size={18} />
            {t("tasks.inbox.title") || "Captura Rápida"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex gap-2">
            <Input
              placeholder={
                t("tasks.inbox.placeholder") ||
                "Escribe una tarea rápida y presiona Enter..."
              }
              value={quickCaptureText}
              onChange={(e) => setQuickCaptureText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleQuickCapture();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={() => void handleQuickCapture()}
              disabled={!quickCaptureText.trim() || createTask.isPending}
            >
              {createTask.isPending ? (
                <HugeiconsIcon
                  icon={CheckmarkBadge01Icon}
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <HugeiconsIcon icon={PlusSignIcon} size={16} />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("tasks.inbox.description") ||
              "Captura ideas y tareas rápidamente. Usa Enter para crear, Shift+Enter para nueva línea."}
          </p>
        </CardContent>
      </Card>

      {/* Triage Section with Stats */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Main Triage Card */}
        <div className="flex-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HugeiconsIcon icon={CheckmarkBadge01Icon} size={18} />
                  {t("tasks.inbox.triage") || "Triage de Tareas"}
                  <Badge variant="secondary" className="text-xs">
                    {tasksNeedingTriage.length}{" "}
                    {t("tasks.inbox.pending") || "pendientes"}
                  </Badge>
                </CardTitle>
                <div className="flex gap-2">
                  {selectedTasks.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                      >
                        {t("common.clear") || "Limpiar"} ({selectedTasks.length}
                        )
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllTasks}
                      >
                        {t("common.selectAll") || "Seleccionar todas"}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void refetch()}
                    disabled={isLoadingTasks}
                    title={t("common.refresh") || "Actualizar tareas"}
                  >
                    <HugeiconsIcon
                      icon={Refresh01Icon}
                      size={16}
                      className={isLoadingTasks ? "animate-spin" : ""}
                    />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {/* Bulk Actions */}
              {selectedTasks.length > 0 && (
                <div
                  className="flex items-center gap-2 p-2 bg-muted rounded-md border-2 border-dashed border-muted-foreground/30"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const taskId = e.dataTransfer.getData("text/plain");
                    if (taskId && !selectedTasks.includes(taskId)) {
                      toggleTaskSelection(taskId);
                      showToast(
                        t("tasks.quickAdd.addedToSelection"),
                        "success"
                      );
                    }
                  }}
                >
                  <span className="text-sm font-medium">
                    {selectedTasks.length}{" "}
                    {t("tasks.inbox.selected") || "tareas seleccionadas"}:
                  </span>
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger className="w-48">
                      <SelectValue
                        placeholder={
                          t("tasks.inbox.bulkAction") || "Acción masiva..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assign_me">
                        {t("tasks.inbox.assignMe") || "Asignarme"}
                      </SelectItem>
                      <SelectItem value="priority_high">
                        {t("tasks.priorities.high") || "Prioridad Alta"}
                      </SelectItem>
                      <SelectItem value="priority_urgent">
                        {t("tasks.priorities.urgent") || "Prioridad Urgente"}
                      </SelectItem>
                      <SelectItem value="priority_low">
                        {t("tasks.priorities.low") || "Prioridad Baja"}
                      </SelectItem>
                      <SelectItem value="in_progress">
                        {t("tasks.statuses.in_progress") || "En Progreso"}
                      </SelectItem>
                      <SelectItem value="done">
                        {t("tasks.statuses.done") || "Completada"}
                      </SelectItem>
                      <SelectItem value="on_hold">
                        {t("tasks.statuses.on_hold") || "En Pausa"}
                      </SelectItem>
                      <SelectItem value="blocked">
                        {t("tasks.statuses.blocked") || "Bloqueada"}
                      </SelectItem>
                      <SelectItem value="review">
                        {t("tasks.statuses.review") || "En Revisión"}
                      </SelectItem>
                      <SelectItem value="cancelled">
                        {t("tasks.statuses.cancelled") || "Cancelada"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => void handleBulkAction()}
                    disabled={!bulkAction || isProcessing}
                  >
                    {isProcessing
                      ? t("common.processing") || "Procesando..."
                      : t("common.apply") || "Aplicar"}
                  </Button>
                </div>
              )}

              {/* Tasks List */}
              <div className="space-y-2">
                {tasksNeedingTriage.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <HugeiconsIcon
                      icon={CheckmarkBadge01Icon}
                      size={48}
                      className="mx-auto mb-4 opacity-50"
                    />
                    <p>
                      {t("tasks.inbox.noTasks") ||
                        "No hay tareas pendientes de triage"}
                    </p>
                  </div>
                ) : (
                  tasksNeedingTriage.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors cursor-move"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", task.id);
                        console.warn("Drag started:", task.id);
                      }}
                      onDragEnd={() => {
                        console.warn("Drag ended");
                      }}
                    >
                      <div className="flex items-center gap-1 cursor-grab">
                        <HugeiconsIcon
                          icon={MoreVerticalIcon}
                          size={16}
                          className="text-muted-foreground"
                        />
                        <Checkbox
                          checked={selectedTasks.includes(task.id)}
                          onCheckedChange={() => toggleTaskSelection(task.id)}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">
                            {t(`tasks.statuses.${task.status}`) || task.status}
                          </Badge>
                          <Badge variant="outline">
                            {t(`tasks.priorities.${task.priority}`) ||
                              task.priority}
                          </Badge>
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Sidebar */}
        <div className="w-full lg:w-72">
          <div className="space-y-3">
            <Card>
              <CardContent className="p-3">
                <div className="text-xl font-bold">
                  {tasksNeedingTriage.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("tasks.inbox.needingTriage") || "Pendientes de triage"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xl font-bold">{selectedTasks.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("tasks.inbox.selected") || "tareas seleccionadas"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xl font-bold">
                  {tasks.filter((t) => t.status === "done").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("tasks.inbox.completedToday") || "Completadas hoy"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
