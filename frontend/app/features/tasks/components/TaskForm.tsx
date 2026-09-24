/**
 * Task Form Component
 * Form for creating and editing tasks
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { showToast } from "~/components/common/Toast";
import { ArrowLeftIcon, PlugIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useTask,
  useCreateTask,
  useUpdateTask,
  useChecklistItems,
  useChecklistMutations,
} from "~/features/tasks/hooks/useTasks";
import { useUsers } from "~/features/users/hooks/useUsers";
import {
  dueDateToInputValue,
  dueDateInputValueToIso,
} from "~/lib/utils/taskDates";
import type {
  TaskCreate,
  TaskStatus,
  TaskPriority,
} from "~/features/tasks/types/task.types";

interface TaskFormProps {
  taskId?: string;
  initialData?: Partial<TaskCreate>;
  onSubmit?: (taskData: Partial<TaskCreate>) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function TaskForm({
  taskId,
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
  isSubmitting,
}: TaskFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: taskResponse, isLoading } = useTask(taskId || "");
  const { users } = useUsers({ page_size: 100 });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: checklistResponse } = useChecklistItems(taskId || "");
  const { createItem, deleteItem } = useChecklistMutations();

  const task = taskResponse?.data;
  const checklistItems = checklistResponse?.data ?? [];

  const [formData, setFormData] = useState<Partial<TaskCreate>>({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    due_date: "",
    assigned_to_id: undefined,
    ...initialData,
  });

  const [newChecklistTitle, setNewChecklistTitle] = useState("");

  useEffect(() => {
    if (task && taskId) {
      setFormData({
        title: task.title,
        description: task.description,
        assigned_to_id: task.assigned_to_id,
        status: task.status,
        priority: task.priority,
        due_date: dueDateToInputValue(task.due_date, true),
      });
    }
  }, [task, taskId]);

  const handleAddChecklistItem = async () => {
    const trimmed = newChecklistTitle.trim();
    if (!trimmed || !taskId) return;
    await createItem.mutateAsync({
      taskId,
      payload: { title: trimmed, completed: false },
    });
    setNewChecklistTitle("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const submitData = {
        ...formData,
        due_date: dueDateInputValueToIso(formData.due_date || "", true),
        all_day: Boolean(formData.due_date),
      } as TaskCreate;

      if (onSubmit) {
        await onSubmit(submitData);
        if (onCancel) onCancel();
      } else if (taskId) {
        await updateTask.mutateAsync({ id: taskId, payload: submitData });
        showToast(t("tasks.updateSuccess"), "success");
        void navigate("/tasks");
      } else {
        await createTask.mutateAsync(submitData);
        showToast(t("tasks.createdSuccess"), "success");
        void navigate("/tasks");
      }
    } catch (error) {
      console.error("Error al guardar tarea:", error);
      showToast(t("tasks.saveError"), "error");
    }
  };

  const isLoadingData =
    isLoading || createTask.isPending || updateTask.isPending;

  if (isLoadingData) {
    return (
      <PageLayout title={taskId ? t("tasks.editTask") : t("tasks.title")} loading>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-20 bg-gray-200 rounded mb-4" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={taskId ? t("tasks.editTask") : t("tasks.title")}
      breadcrumb={[
        { label: t("tasks.title"), href: "/tasks" },
        { label: taskId ? t("tasks.editTask") : t("tasks.title") },
      ]}
    >
      <div className="max-w-2xl mx-auto">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("tasks.details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {t("tasks.titleLabel")} *
                </label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={t("tasks.titlePlaceholder")}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {t("tasks.description")}
                </label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={t("tasks.descriptionPlaceholder")}
                  rows={4}
                />
              </div>

              <div>
                <label
                  htmlFor="assigned_to_id"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {t("tasks.assignedTo")}
                </label>
                <Select
                  value={formData.assigned_to_id || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assigned_to_id: value })
                  }
                >
                  <SelectTrigger id="assigned_to_id">
                    <SelectValue placeholder={t("tasks.filtersAssignedToPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Status & Priority */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("tasks.status.title")} & {t("tasks.priority.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t("tasks.status.title")}
                  </label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => {
                      if (!value) return;
                      setFormData({ ...formData, status: value as TaskStatus });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("tasks.status.title")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">{t("tasks.statuses.todo")}</SelectItem>
                      <SelectItem value="in_progress">
                        {t("tasks.statuses.inProgress")}
                      </SelectItem>
                      <SelectItem value="on_hold">{t("tasks.statuses.onHold")}</SelectItem>
                      <SelectItem value="done">{t("tasks.statuses.done")}</SelectItem>
                      <SelectItem value="cancelled">
                        {t("tasks.statuses.cancelled")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="priority"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t("tasks.priority.title")}
                  </label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => {
                      if (!value) return;
                      setFormData({
                        ...formData,
                        priority: value as TaskPriority,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("tasks.priority.title")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t("tasks.priorities.low")}</SelectItem>
                      <SelectItem value="medium">{t("tasks.priorities.medium")}</SelectItem>
                      <SelectItem value="high">{t("tasks.priorities.high")}</SelectItem>
                      <SelectItem value="urgent">{t("tasks.priorities.urgent")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="due_date"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {t("tasks.dueDate")}
                </label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {taskId && (
            <Card>
              <CardHeader>
                <CardTitle>{t("tasks.checklist.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checklistItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Input value={item.title} readOnly className="flex-1" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={deleteItem.isPending}
                        onClick={() => void deleteItem.mutateAsync(item.id)}
                      >
                        {t("common.delete")}
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      placeholder={t("tasks.checklist.placeholder")}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={createItem.isPending || !newChecklistTitle.trim()}
                      onClick={() => void handleAddChecklistItem()}
                    >
                      <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
                      {t("tasks.checklist.addItem")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => void navigate("/tasks")}
            >
              <HugeiconsIcon icon={ArrowLeftIcon} size={16} className="mr-2" />
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingData}>
              <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
              {isSubmitting || isLoadingData
                ? t("common.saving")
                : submitLabel || (taskId ? t("common.update") : t("tasks.createActivity"))}
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
