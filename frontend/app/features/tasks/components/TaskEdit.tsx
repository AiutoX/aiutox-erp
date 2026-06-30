/**
 * TaskEdit component
 * Task editing form for updating existing tasks
 */

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Switch } from "~/components/ui/switch";
import { Edit01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useUpdateTask, useDeleteTask } from "../hooks/useTasks";
import { useUsers } from "~/features/users/hooks/useUsers";
import { useTags } from "~/features/tags/hooks/useTags";
import { useAuthStore } from "~/stores/authStore";
import { CalendarSyncToggle } from "./CalendarSyncToggle";
import { FileUploader } from "./FileUploader";
import { CommentThread } from "./CommentThread";
import {
  createAssignment,
  deleteAssignment,
  listAssignments,
} from "../api/tasks.api";
import { MultiSelect } from "~/components/ui/multi-select";
import type {
  Task,
  TaskUpdate,
  TaskStatus,
  TaskPriority,
} from "../types/task.types";

interface TaskEditProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated?: () => void;
}

export function TaskEdit({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
}: TaskEditProps) {
  const { t } = useTranslation();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { users } = useUsers({ page_size: 100 });
  const { data: tagList = [] } = useTags();
  const { user } = useAuthStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteTask = () => {
    if (!task) return;

    void deleteTask
      .mutateAsync(task.id)
      .then(() => {
        onTaskUpdated?.();
        onOpenChange(false);
      })
      .catch((error) => {
        console.error("Error al eliminar tarea:", error);
      });
  };

  const DATE_INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";
  const toDateTimeLocalValue = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return format(date, DATE_INPUT_FORMAT);
  };

  const toUTCISOString = (value?: string | null) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
  };

  const [formData, setFormData] = useState<Partial<TaskUpdate>>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    due_date: "",
    start_at: "",
    end_at: "",
    all_day: false,
    tag_ids: [],
    color_override: "",
    assigned_to_id: null,
  });

  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [assignedGroupIds, setAssignedGroupIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Update form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: toDateTimeLocalValue(task.due_date),
        start_at: toDateTimeLocalValue(task.start_at ?? undefined),
        end_at: toDateTimeLocalValue(task.end_at ?? undefined),
        all_day: task.all_day ?? false,
        tag_ids: task.tag_ids ?? [],
        color_override: task.color_override ?? "",
        assigned_to_id: task.assigned_to_id,
      });

      setFormError(null);

      // Cargar asignaciones existentes
      void loadExistingAssignments(task.id);
    }
  }, [task]);

  useEffect(() => {
    if (!open) {
      setFormError(null);
    }
  }, [open]);

  const loadExistingAssignments = async (taskId: string) => {
    try {
      const response = await listAssignments(taskId);
      const userIds = response.data
        .filter((a) => a.assigned_to_id)
        .map((a) => a.assigned_to_id!);
      const groupIds = response.data
        .filter((a) => a.assigned_to_group_id)
        .map((a) => a.assigned_to_group_id!);

      setAssignedUserIds(userIds);
      setAssignedGroupIds(groupIds);
    } catch (error) {
      console.error("Error al cargar asignaciones:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!task) return;

    if (task.start_at || task.end_at) {
      if (!formData.start_at || !formData.end_at) {
        setFormError(
          t("tasks.errors.eventTimesRequired") ||
            "Debes indicar inicio y fin para un evento"
        );
        return;
      }
      if (new Date(formData.end_at) < new Date(formData.start_at)) {
        setFormError(
          t("tasks.errors.invalidEventRange") ||
            "La hora de fin debe ser posterior al inicio"
        );
        return;
      }
    }

    try {
      const basePayload: TaskUpdate = {
        ...(formData as TaskUpdate),
        color_override: formData.color_override || undefined,
        tag_ids: formData.tag_ids?.length ? formData.tag_ids : undefined,
      };

      const payload: TaskUpdate =
        task.start_at || task.end_at
          ? {
              ...basePayload,
              due_date: undefined,
              start_at: toUTCISOString(formData.start_at) ?? null,
              end_at: toUTCISOString(formData.end_at) ?? null,
              all_day: Boolean(formData.all_day),
            }
          : {
              ...basePayload,
              due_date: toUTCISOString(formData.due_date),
              start_at: undefined,
              end_at: undefined,
              all_day: false,
            };

      await updateTask.mutateAsync({
        id: task.id,
        payload,
      });

      // Sincronizar asignaciones de usuarios
      const existingAssignments = await listAssignments(task.id);
      const existingUserIds = existingAssignments.data
        .filter((a) => a.assigned_to_id)
        .map((a) => a.assigned_to_id!);
      const existingGroupIds = existingAssignments.data
        .filter((a) => a.assigned_to_group_id)
        .map((a) => a.assigned_to_group_id!);

      // Eliminar asignaciones que ya no están seleccionadas
      for (const assignment of existingAssignments.data) {
        if (
          assignment.assigned_to_id &&
          !assignedUserIds.includes(assignment.assigned_to_id)
        ) {
          await deleteAssignment(task.id, assignment.id);
        }
        if (
          assignment.assigned_to_group_id &&
          !assignedGroupIds.includes(assignment.assigned_to_group_id)
        ) {
          await deleteAssignment(task.id, assignment.id);
        }
      }

      // Crear nuevas asignaciones de usuarios
      for (const userId of assignedUserIds) {
        if (!existingUserIds.includes(userId)) {
          await createAssignment(task.id, {
            task_id: task.id,
            assigned_to_id: userId,
            created_by_id: user?.id || "",
          });
        }
      }

      // Crear nuevas asignaciones de grupos
      for (const groupId of assignedGroupIds) {
        if (!existingGroupIds.includes(groupId)) {
          await createAssignment(task.id, {
            task_id: task.id,
            assigned_to_group_id: groupId,
            created_by_id: user?.id || "",
          });
        }
      }

      // Notificar que la tarea fue actualizada pero no cerrar el modal
      onTaskUpdated?.();
    } catch (error) {
      console.error("Error al actualizar tarea:", error);
    }
  };

  const isLoading = updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Edit01Icon} size={20} />
            {task
              ? task.start_at && task.end_at && !task.due_date
                ? "Editar Evento"
                : task.all_day
                  ? "Editar Evento"
                  : t("tasks.editTask")
              : t("tasks.editTask")}
          </DialogTitle>
          <DialogDescription>
            {t("tasks.editTaskDescription")}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className="space-y-3 pr-1"
        >
          <div>
            <label
              htmlFor="edit-title"
              className="block text-sm font-medium mb-1"
            >
              {t("common.name")} *
            </label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder={t("tasks.titlePlaceholder")}
              required
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="edit-description"
              className="block text-sm font-medium mb-1"
            >
              {t("tasks.description")}
            </label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder={t("tasks.descriptionPlaceholder")}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="edit-status"
                className="block text-sm font-medium mb-1"
              >
                {t("tasks.status.title")}
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as TaskStatus })
                }
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="edit-priority"
                className="block text-sm font-medium mb-1"
              >
                {t("tasks.priority.title")}
              </label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value as TaskPriority })
                }
              >
                <SelectTrigger id="edit-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
          </div>

          {task && (task.start_at || task.end_at) ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-all-day">
                  {t("calendar.events.allDay")}
                </Label>
                <Switch
                  id="edit-all-day"
                  checked={Boolean(formData.all_day)}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, all_day: checked })
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-start-at"
                    className="block text-sm font-medium mb-1"
                  >
                    {t("calendar.labels.start")}
                  </label>
                  <Input
                    id="edit-start-at"
                    type="datetime-local"
                    value={formData.start_at ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, start_at: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-end-at"
                    className="block text-sm font-medium mb-1"
                  >
                    {t("calendar.labels.end")}
                  </label>
                  <Input
                    id="edit-end-at"
                    type="datetime-local"
                    value={formData.end_at ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, end_at: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="edit-due-date"
                className="block text-sm font-medium mb-1"
              >
                {t("tasks.dueDate")}
              </label>
              <Input
                id="edit-due-date"
                type="datetime-local"
                value={formData.due_date ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
              />
            </div>
          )}

          {/* Calendar Sync Toggle - Sprint 2.1 Fase 2 */}
          {task &&
            (formData.start_at || formData.due_date || formData.end_at) && (
              <div className="pt-4 border-t">
                <CalendarSyncToggle taskId={task.id} compact showStatus />
              </div>
            )}

          <div>
            <label className="block text-sm font-medium mb-1">
              {t("tasks.assignedTo")}
            </label>
            <MultiSelect
              options={users.map((u) => ({
                value: u.id,
                label: `${u.first_name} ${u.last_name}`.trim() || u.email,
              }))}
              selected={assignedUserIds}
              onChange={setAssignedUserIds}
              placeholder="Seleccionar responsables..."
              label="Asignar responsables"
            />
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("tags.title") || "Tags"}
              </label>
              <MultiSelect
                options={tagList.map((tag) => ({
                  value: tag.id,
                  label: tag.name,
                }))}
                selected={formData.tag_ids || []}
                onChange={(values) =>
                  setFormData({ ...formData, tag_ids: values })
                }
                placeholder={t("tags.select") || "Seleccionar tags"}
                label={t("tags.title") || "Tags"}
              />
            </div>

            <div>
              <label
                htmlFor="edit-color-override"
                className="block text-sm font-medium mb-1"
              >
                {t("tasks.colorOverride") || "Color override"}
              </label>
              <Input
                id="edit-color-override"
                type="color"
                value={formData.color_override || "#023E87"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    color_override: e.target.value,
                  })
                }
                className="h-10 w-20 p-1"
              />
            </div>
          </div>

          {/* Files Section - Sprint 2.3 Fase 2 */}
          {task && (
            <div className="space-y-4 pt-4 border-t">
              {(() => {
                console.warn(
                  "[TaskEdit] Rendering FileUploader with task.id:",
                  task?.id
                );
                return null;
              })()}
              <FileUploader taskId={task.id} />
            </div>
          )}

          {/* Comments Section - Sprint 2.4 Fase 2 */}
          {task && (
            <div className="pt-4 border-t">
              <CommentThread taskId={task.id} showTitle />
            </div>
          )}

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t("common.cancel")}
            </Button>
            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
              >
                {t("common.delete")}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isLoading}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteTask}
                  disabled={deleteTask.isPending || isLoading}
                >
                  {deleteTask.isPending
                    ? t("common.deleting") || "Eliminando..."
                    : t("common.confirmDelete") || "Confirmar Eliminación"}
                </Button>
              </>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("common.saving") : t("tasks.update")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
