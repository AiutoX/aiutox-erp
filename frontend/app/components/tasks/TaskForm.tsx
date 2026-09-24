import React, { useState, useCallback, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import {
  Plus,
  X,
  Upload,
  Loader,
  Save,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  FileText,
  Users,
  Tag,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { showToast } from "~/components/common/Toast";
import type {
  Task,
  TaskStatus,
  TaskPriority,
} from "~/features/tasks/types/task.types";

// Schema de validación
const taskFormSchema = z.object({
  title: z
    .string()
    .min(1, "El título es requerido")
    .max(200, "El título no puede exceder 200 caracteres"),
  description: z
    .string()
    .max(2000, "La descripción no puede exceder 2000 caracteres")
    .optional(),
  status: z.enum([
    "todo",
    "in_progress",
    "done",
    "cancelled",
    "on_hold",
    "blocked",
    "review",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  due_date: z.string().optional(),
  estimated_duration: z
    .number()
    .min(1, "La duración debe ser al menos 1 minuto")
    .max(1440, "La duración no puede exceder 24 horas")
    .optional(),
  assigned_user_ids: z.array(z.string()).optional(),
  assigned_group_ids: z.array(z.string()).optional(),
  tag_ids: z.array(z.string()).optional(),
  color_override: z.string().optional(),
  checklist_items: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        completed: z.boolean(),
      })
    )
    .optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  task?: Task & {
    assigned_to?: { id: string; name: string; email: string; avatar?: string };
    created_by?: { id: string; name: string; email: string; avatar?: string };
    tags?: string[];
    estimated_duration?: number;
    checklist_items?: Array<{ id: string; title: string; completed: boolean }>;
  };
  onSubmit: (data: TaskFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

const statusOptions = [
  { value: "todo", label: "tasks.statuses.todo" },
  { value: "in_progress", label: "tasks.statuses.inProgress" },
  { value: "done", label: "tasks.statuses.done" },
  { value: "cancelled", label: "tasks.statuses.cancelled" },
  { value: "on_hold", label: "tasks.statuses.onHold" },
  { value: "blocked", label: "tasks.statuses.blocked" },
  { value: "review", label: "tasks.statuses.review" },
] as const;

const priorityOptions = [
  { value: "low", label: "tasks.priorities.low" },
  { value: "medium", label: "tasks.priorities.medium" },
  { value: "high", label: "tasks.priorities.high" },
  { value: "urgent", label: "tasks.priorities.urgent" },
] as const;

export const TaskForm: React.FC<TaskFormProps> = ({
  task,
  onSubmit,
  onCancel,
  loading = false,
  error = null,
}) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checklistItems, setChecklistItems] = useState<
    Array<{ id: string; title: string; completed: boolean }>
  >(task?.checklist_items || []);
  const [selectedTags, setSelectedTags] = useState<string[]>(task?.tags || []);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      status: task?.status || "todo",
      priority: task?.priority || "medium",
      due_date: task?.due_date
        ? format(new Date(task.due_date), "yyyy-MM-dd")
        : "",
      estimated_duration: task?.estimated_duration || undefined,
      assigned_user_ids: [],
      assigned_group_ids: [],
      tag_ids: task?.tags || [],
      color_override: task?.color_override || "#023E87",
      checklist_items: task?.checklist_items || [],
    },
  });

  const watchedValues = watch();

  // Efecto para actualizar el formulario cuando cambia la tarea
  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        due_date: task.due_date
          ? format(new Date(task.due_date), "yyyy-MM-dd")
          : "",
        estimated_duration: task.estimated_duration || undefined,
        assigned_user_ids: [],
        assigned_group_ids: [],
        tag_ids: task.tags || [],
        color_override: task.color_override || "#023E87",
        checklist_items: task.checklist_items || [],
      });
      setChecklistItems(task.checklist_items || []);
      setSelectedTags(task.tags || []);
    }
  }, [task, reset]);

  const handleFormSubmit = useCallback(
    async (data: TaskFormData) => {
      setIsSubmitting(true);
      try {
        const formData = {
          ...data,
          checklist_items: checklistItems,
          tag_ids: selectedTags,
          assigned_user_ids: selectedUserIds,
          assigned_group_ids: selectedGroupIds,
        };

        await onSubmit(formData);
        showToast(t("tasks.form.success"), "success");
      } catch {
        showToast(t("tasks.form.error"), "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      checklistItems,
      selectedTags,
      selectedUserIds,
      selectedGroupIds,
      onSubmit,
      t,
    ]
  );

  const handleAddChecklistItem = useCallback(() => {
    const newItem = {
      id: crypto.randomUUID(),
      title: "",
      completed: false,
    };
    setChecklistItems([...checklistItems, newItem]);
  }, [checklistItems]);

  const handleUpdateChecklistItem = useCallback((id: string, title: string) => {
    setChecklistItems((items) =>
      items.map((item) => (item.id === id ? { ...item, title } : item))
    );
  }, []);

  const handleRemoveChecklistItem = useCallback((id: string) => {
    setChecklistItems((items) => items.filter((item) => item.id !== id));
  }, []);

  const handleToggleChecklistItem = useCallback((id: string) => {
    setChecklistItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  }, []);

  const handleAddTag = useCallback(
    (tag: string) => {
      if (tag && !selectedTags.includes(tag)) {
        setSelectedTags([...selectedTags, tag]);
        setValue("tag_ids", [...selectedTags, tag]);
      }
    },
    [selectedTags, setValue]
  );

  const handleRemoveTag = useCallback(
    (tag: string) => {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
      setValue(
        "tag_ids",
        selectedTags.filter((t) => t !== tag)
      );
    },
    [selectedTags, setValue]
  );

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      const validFiles = files.filter((file) => {
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
        const isValidType = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "image/png",
          "image/jpeg",
        ].includes(file.type);

        if (!isValidSize) {
          showToast(t("tasks.form.files.maxSize"), "error");
          return false;
        }

        if (!isValidType) {
          showToast(t("tasks.form.files.allowedTypes"), "error");
          return false;
        }

        return true;
      });

      setUploadedFiles([...uploadedFiles, ...validFiles]);
      showToast(t("tasks.form.files.uploadSuccess"), "success");
    },
    [uploadedFiles, t]
  );

  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles((files) => files.filter((_, i) => i !== index));
  }, []);

  const handleAddUser = useCallback(() => {
    const userId = prompt(t("tasks.enterUserId"));
    if (userId && !selectedUserIds.includes(userId)) {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  }, [selectedUserIds, t]);

  const handleRemoveUser = useCallback(
    (userId: string) => {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    },
    [selectedUserIds]
  );

  const handleAddGroup = useCallback(() => {
    const groupId = prompt(t("tasks.enterGroupId"));
    if (groupId && !selectedGroupIds.includes(groupId)) {
      setSelectedGroupIds([...selectedGroupIds, groupId]);
    }
  }, [selectedGroupIds, t]);

  const handleRemoveGroup = useCallback(
    (groupId: string) => {
      setSelectedGroupIds(selectedGroupIds.filter((id) => id !== groupId));
    },
    [selectedGroupIds]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        void handleSubmit(handleFormSubmit)();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (isDirty) {
          if (window.confirm(t("tasks.form.confirmCancel"))) {
            onCancel();
          }
        } else {
          onCancel();
        }
      }
    },
    [handleFormSubmit, isDirty, onCancel, handleSubmit, t]
  );

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      {/* Información básica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={FileText} size={20} />
            {task ? t("tasks.edit") : t("tasks.create")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-sm font-medium">
              {t("tasks.form.title")}
            </Label>
            <Input
              id="title"
              {...register("title")}
              placeholder={t("tasks.form.titlePlaceholder")}
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              {t("tasks.form.description")}
            </Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder={t("tasks.form.descriptionPlaceholder")}
              rows={3}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && (
              <p className="text-sm text-destructive mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status" className="text-sm font-medium">
                {t("tasks.status")}
              </Label>
              <Select
                value={watchedValues.status}
                onValueChange={(value: string) =>
                  setValue("status", value as TaskStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority" className="text-sm font-medium">
                {t("tasks.priority")}
              </Label>
              <Select
                value={watchedValues.priority}
                onValueChange={(value: string) =>
                  setValue("priority", value as TaskPriority)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="due_date" className="text-sm font-medium">
                {t("tasks.dueDate")}
              </Label>
              <Input
                id="due_date"
                type="date"
                {...register("due_date")}
                className={errors.due_date ? "border-destructive" : ""}
              />
              {errors.due_date && (
                <p className="text-sm text-destructive mt-1">
                  {errors.due_date.message}
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="estimated_duration"
                className="text-sm font-medium"
              >
                {t("tasks.estimatedDuration")}
              </Label>
              <Input
                id="estimated_duration"
                type="number"
                {...register("estimated_duration", { valueAsNumber: true })}
                placeholder={t("tasks.form.estimatedDuration")}
                className={
                  errors.estimated_duration ? "border-destructive" : ""
                }
              />
              {errors.estimated_duration && (
                <p className="text-sm text-destructive mt-1">
                  {errors.estimated_duration.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="color_override" className="text-sm font-medium">
              {t("tasks.form.colorOverride")}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="color_override"
                type="color"
                {...register("color_override")}
                className="w-20 h-10 p-1"
              />
              <span className="text-sm text-muted-foreground">
                {watchedValues.color_override}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asignación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Users} size={20} />
            {t("tasks.assignedTo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              {t("tasks.form.assignedTo")}
            </Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder={t("tasks.form.assignedTo")}
                  value={selectedUserIds.join(", ")}
                  readOnly
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleAddUser}>
                  <HugeiconsIcon icon={Plus} size={16} className="mr-2" />
                  {t("tasks.assign")}
                </Button>
              </div>
              {selectedUserIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUserIds.map((userId) => (
                    <Badge
                      key={userId}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {userId}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(userId)}
                        className="h-4 w-4 p-0 ml-1 hover:text-destructive"
                      >
                        <HugeiconsIcon icon={X} size={12} />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              {t("tasks.assignTeams")}
            </Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder={t("tasks.enterGroupId")}
                  value={selectedGroupIds.join(", ")}
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddGroup}
                >
                  <HugeiconsIcon icon={Plus} size={16} className="mr-2" />
                  {t("tasks.addTeam")}
                </Button>
              </div>
              {selectedGroupIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedGroupIds.map((groupId) => (
                    <Badge
                      key={groupId}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {groupId}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveGroup(groupId)}
                        className="h-4 w-4 p-0 ml-1 hover:text-destructive"
                      >
                        <HugeiconsIcon icon={X} size={12} />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={CheckCircle} size={20} />
              {t("tasks.form.checklist.title")}
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddChecklistItem}
            >
              <HugeiconsIcon icon={Plus} size={16} className="mr-2" />
              {t("tasks.form.checklist.addItem")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checklistItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleToggleChecklistItem(item.id)}
                  className="h-4 w-4"
                />
                <Input
                  value={item.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdateChecklistItem(item.id, e.target.value)
                  }
                  placeholder={t("tasks.form.checklist.placeholder")}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveChecklistItem(item.id)}
                  className="h-8 w-8 p-0"
                >
                  <HugeiconsIcon icon={X} size={16} />
                </Button>
              </div>
            ))}
            {checklistItems.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                {t("tasks.detail.noChecklist")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Archivos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Upload} size={20} />
            {t("tasks.form.files.attach")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <HugeiconsIcon icon={Upload} size={16} className="mr-2" />
              {t("tasks.form.files.attach")}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              {t("tasks.form.files.maxSize")} •{" "}
              {t("tasks.form.files.allowedTypes")}
            </p>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={FileText} size={16} />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                    className="h-6 w-6 p-0 hover:text-destructive"
                  >
                    <HugeiconsIcon icon={X} size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Etiquetas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Tag} size={20} />
            {t("tasks.tags")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder={t("tasks.tags")}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag(e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
                className="flex-1"
              />
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <HugeiconsIcon icon={Tag} size={12} />
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTag(tag)}
                      className="h-4 w-4 p-0 ml-1 hover:text-destructive"
                    >
                      <HugeiconsIcon icon={X} size={12} />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center text-destructive">
            <HugeiconsIcon icon={AlertCircle} size={20} className="mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-4 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex items-center gap-2"
        >
          <HugeiconsIcon icon={ArrowLeft} size={16} />
          {t("tasks.form.cancel")}
        </Button>
        <Button
          type="submit"
          onClick={() => void handleSubmit(handleFormSubmit)()}
          disabled={isSubmitting || loading}
          className="flex items-center gap-2"
        >
          {isSubmitting || loading ? (
            <>
              <HugeiconsIcon icon={Loader} size={16} className="animate-spin" />
              {t("tasks.form.saving")}
            </>
          ) : (
            <>
              <HugeiconsIcon icon={Save} size={16} />
              {task ? t("tasks.form.update") : t("tasks.form.save")}
            </>
          )}
        </Button>
      </div>

      {/* Atajos de teclado */}
      <div className="text-xs text-muted-foreground text-center">
        <p>
          {t("tasks.keyboardShortcuts")}: Ctrl+Enter {t("common.save")} • Esc{" "}
          {t("common.cancel")}
        </p>
      </div>
    </div>
  );
};
