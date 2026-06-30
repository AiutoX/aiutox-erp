import React, { useState, useCallback, useRef, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Progress } from "~/components/ui/progress";
import {
  Calendar,
  Clock,
  User,
  Tag,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  CheckCircle,
  Circle,
  AlertCircle,
  Loader,
  Copy,
  Archive,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { showToast } from "~/components/common/Toast";
import type { Task, TaskStatus } from "~/features/tasks/types/task.types";

interface TaskCardProps {
  task: Task & {
    assigned_to?: { id: string; name: string; email: string; avatar?: string };
    created_by?: { id: string; name: string; email: string; avatar?: string };
    tags?: string[];
    estimated_duration?: number;
    checklist_items?: Array<{ id: string; title: string; completed: boolean }>;
  };
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onAssign: (taskId: string, userId: string) => void;
  loading?: boolean;
  error?: string | null;
}

const statusConfig = {
  todo: { label: "tasks.statuses.todo", icon: Circle, color: "bg-gray-500" },
  in_progress: {
    label: "tasks.statuses.inProgress",
    icon: AlertCircle,
    color: "bg-blue-500",
  },
  done: {
    label: "tasks.statuses.done",
    icon: CheckCircle,
    color: "bg-green-500",
  },
  cancelled: {
    label: "tasks.statuses.cancelled",
    icon: AlertCircle,
    color: "bg-red-500",
  },
  on_hold: {
    label: "tasks.statuses.onHold",
    icon: AlertCircle,
    color: "bg-yellow-500",
  },
  blocked: {
    label: "tasks.statuses.blocked",
    icon: AlertCircle,
    color: "bg-red-600",
  },
  review: {
    label: "tasks.statuses.review",
    icon: AlertCircle,
    color: "bg-purple-500",
  },
} as const;

const priorityConfig = {
  low: { label: "tasks.priorities.low", color: "border-green-400" },
  medium: { label: "tasks.priorities.medium", color: "border-yellow-400" },
  high: { label: "tasks.priorities.high", color: "border-orange-400" },
  urgent: { label: "tasks.priorities.urgent", color: "border-red-400" },
} as const;

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onStatusChange,
  onEdit,
  onDelete,
  onAssign,
  loading = false,
  error = null,
}) => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== "done";
  const statusInfo = statusConfig[task.status] || statusConfig.todo;
  const priorityInfo = priorityConfig[task.priority] || priorityConfig.medium;

  const completionPercentage =
    task.checklist_items && task.checklist_items.length > 0
      ? Math.round(
          (task.checklist_items.filter((item) => item.completed).length /
            task.checklist_items.length) *
            100
        )
      : 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStatusChange = useCallback(
    async (newStatusString: string) => {
      setIsStatusChanging(true);
      try {
        // Convert string to TaskStatus
        const newStatus = newStatusString as TaskStatus;
        void onStatusChange(task.id, newStatus);
        showToast(t("tasks.statusChanged"), "success");
      } catch {
        showToast(t("tasks.errorChangingStatus"), "error");
      } finally {
        setIsStatusChanging(false);
      }
    },
    [task.id, onStatusChange, t]
  );

  const handleEdit = useCallback(() => {
    onEdit(task);
  }, [task, onEdit]);

  const handleDelete = useCallback(() => {
    if (window.confirm(t("tasks.confirmDelete"))) {
      onDelete(task.id);
    }
  }, [task.id, onDelete, t]);

  const handleAssign = useCallback(() => {
    // En una implementación real, esto abriría un modal para seleccionar usuario
    const userId = prompt(t("tasks.enterUserId"));
    if (userId) {
      onAssign(task.id, userId);
    }
  }, [task.id, onAssign, t]);

  const handleCopyTaskId = useCallback(() => {
    void navigator.clipboard.writeText(task.id);
    showToast(t("tasks.taskIdCopied"), "success");
  }, [task.id, t]);

  const handleArchive = useCallback(() => {
    showToast(t("tasks.archiveTask"), "info");
  }, [t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleEdit();
      } else if (e.key === "Delete" && e.ctrlKey) {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "c" && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        handleCopyTaskId();
      }
    },
    [handleEdit, handleDelete, handleCopyTaskId]
  );

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      ref={cardRef}
      className={`relative border-l-4 ${priorityInfo.color} transition-all duration-200 hover:shadow-lg ${isHovered ? "scale-[1.02]" : ""}`}
      style={{ borderLeftColor: task.color_override || undefined }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="task-card"
      role="article"
      aria-label={`Tarea: ${task.title}`}
    >
      {error && (
        <div className="absolute inset-0 bg-destructive/10 border border-destructive/20 rounded-lg p-2 z-10">
          <div
            className="flex items-center text-destructive text-sm"
            data-testid="error-message"
          >
            <HugeiconsIcon icon={AlertCircle} size={16} className="mr-2" />
            {error}
          </div>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-lg mb-1 cursor-pointer hover:text-primary transition-colors truncate"
              onClick={handleEdit}
              title={task.title}
              data-testid="task-title"
            >
              {task.title}
            </h3>
            {task.description && (
              <p
                className="text-sm text-muted-foreground mb-2 line-clamp-2"
                data-testid="task-description"
              >
                {task.description}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-1 ml-2">
            <Select
              value={task.status}
              onValueChange={handleStatusChange}
              disabled={isStatusChanging}
              data-testid="status-select"
              aria-label={t("tasks.changeStatus")}
            >
              <SelectTrigger className="w-32 h-8">
                {isStatusChanging ? (
                  <HugeiconsIcon
                    icon={Loader}
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center">
                      <HugeiconsIcon
                        icon={config.icon}
                        size={16}
                        className="mr-2"
                      />
                      {t(config.label)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              data-testid="menu-button"
              aria-label={t("tasks.moreOptions")}
              aria-expanded={isMenuOpen}
            >
              <HugeiconsIcon icon={MoreHorizontal} size={16} />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <Badge
            variant="secondary"
            className={`${statusInfo.color} text-white`}
            data-testid="task-status"
          >
            <HugeiconsIcon icon={statusInfo.icon} size={14} className="mr-1" />
            {t(statusInfo.label)}
          </Badge>

          <Badge
            variant="outline"
            className={`border-2 ${priorityInfo.color}`}
            data-testid="task-priority"
          >
            {t(priorityInfo.label)}
          </Badge>

          {isOverdue && (
            <Badge variant="destructive" data-testid="overdue-indicator">
              <HugeiconsIcon icon={AlertCircle} size={14} className="mr-1" />
              {t("tasks.overdue")}
            </Badge>
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center space-x-1">
              <HugeiconsIcon
                icon={Tag}
                size={14}
                className="text-muted-foreground"
              />
              <span className="text-xs text-muted-foreground">
                {task.tags.length}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Asignación y creador */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {task.assigned_to && (
              <div
                className="flex items-center space-x-2"
                data-testid="assigned-user"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={task.assigned_to.avatar} />
                  <AvatarFallback className="text-xs">
                    {task.assigned_to.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {task.assigned_to.name}
                </span>
              </div>
            )}

            {task.created_by && (
              <div
                className="flex items-center space-x-1 text-xs text-muted-foreground"
                data-testid="created-user"
              >
                <HugeiconsIcon icon={User} size={12} />
                <span>{t("tasks.createdBy")}</span>
              </div>
            )}
          </div>

          {isStatusChanging && (
            <div
              className="text-xs text-primary flex items-center"
              data-testid="status-changing"
            >
              <HugeiconsIcon
                icon={Loader}
                size={12}
                className="mr-1 animate-spin"
              />
              {t("tasks.updating")}
            </div>
          )}
        </div>

        {/* Fecha y duración */}
        <div className="flex items-center space-x-4 mb-3 text-sm text-muted-foreground">
          {task.due_date && (
            <div className="flex items-center space-x-1" data-testid="due-date">
              <HugeiconsIcon icon={Calendar} size={14} />
              <span className={isOverdue ? "text-destructive font-medium" : ""}>
                {format(new Date(task.due_date), "dd/MM/yyyy", { locale: es })}
              </span>
            </div>
          )}

          {task.estimated_duration && (
            <div
              className="flex items-center space-x-1"
              data-testid="estimated-duration"
            >
              <HugeiconsIcon icon={Clock} size={14} />
              <span>{t("tasks.estimatedDuration")}</span>
            </div>
          )}
        </div>

        {/* Checklist progress */}
        {task.checklist_items && task.checklist_items.length > 0 && (
          <div className="mb-3" data-testid="checklist-progress">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{t("tasks.progress")}</span>
              <span data-testid="completion-percentage">
                {completionPercentage}%
              </span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              {task.checklist_items.filter((item) => item.completed).length} /{" "}
              {task.checklist_items.length} {t("tasks.completed")}
            </div>
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div
            className="flex flex-wrap gap-1 mb-3"
            data-testid="tags-container"
          >
            {task.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-accent"
                data-testid={`tag-${tag}`}
              >
                <HugeiconsIcon icon={Tag} size={12} className="mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center space-x-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            data-testid="edit-button"
            className="h-8"
            aria-label={t("tasks.editTask")}
          >
            <HugeiconsIcon icon={Edit} size={14} className="mr-1" />
            {t("common.edit")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAssign}
            data-testid="assign-button"
            className="h-8"
            aria-label={t("tasks.assignTask")}
          >
            <HugeiconsIcon icon={UserPlus} size={14} className="mr-1" />
            {t("tasks.assign")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            data-testid="delete-button"
            aria-label={t("tasks.deleteTask")}
          >
            <HugeiconsIcon icon={Trash2} size={14} className="mr-1" />
            {t("common.delete")}
          </Button>
        </div>

        {/* Dropdown menu */}
        {isMenuOpen && (
          <div className="absolute top-2 right-2 bg-background border rounded-lg shadow-lg p-1 z-20 min-w-48">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="w-full justify-start h-8"
            >
              <HugeiconsIcon icon={Edit} size={16} className="mr-2" />
              {t("tasks.edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAssign}
              className="w-full justify-start h-8"
            >
              <HugeiconsIcon icon={UserPlus} size={16} className="mr-2" />
              {t("tasks.assign")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyTaskId}
              className="w-full justify-start h-8"
            >
              <HugeiconsIcon icon={Copy} size={16} className="mr-2" />
              {t("tasks.copyId")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              className="w-full justify-start h-8"
            >
              <HugeiconsIcon icon={Archive} size={16} className="mr-2" />
              {t("tasks.archive")}
            </Button>
            <div className="border-t my-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="w-full justify-start h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <HugeiconsIcon icon={Trash2} size={16} className="mr-2" />
              {t("common.delete")}
            </Button>
          </div>
        )}

        {/* Keyboard shortcuts hint */}
        {isHovered && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground opacity-75">
            <span title={t("tasks.keyboardShortcuts")}>
              ⌘E • ⌘⇧C • Ctrl+Del
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
