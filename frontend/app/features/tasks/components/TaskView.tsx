/**
 * TaskView component
 * Read-only modal for viewing task details
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { EyeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Checkbox } from "~/components/ui/checkbox";
import type { Task, TaskStatus, TaskPriority } from "../types/task.types";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

interface TaskViewProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskView({ task, open, onOpenChange }: TaskViewProps) {
  const { t, language } = useTranslation();
  const dateLocale = language === "es" ? es : enUS;

  if (!task) return null;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "PPP", { locale: dateLocale });
  };

  const getStatusBadge = (status: TaskStatus) => {
    const statusColors: Record<TaskStatus, string> = {
      todo: "bg-gray-100 text-gray-800 border-gray-200",
      in_progress: "bg-blue-100 text-blue-800 border-blue-200",
      done: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
      on_hold: "bg-yellow-100 text-yellow-800 border-yellow-200",
      blocked: "bg-orange-100 text-orange-800 border-orange-200",
      review: "bg-purple-100 text-purple-800 border-purple-200",
    };

    return (
      <Badge variant="outline" className={statusColors[status]}>
        {t(`tasks.statuses.${status}`)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    const priorityColors: Record<TaskPriority, string> = {
      low: "bg-gray-100 text-gray-800 border-gray-200",
      medium: "bg-blue-100 text-blue-800 border-blue-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      urgent: "bg-red-100 text-red-800 border-red-200",
    };

    return (
      <Badge variant="outline" className={priorityColors[priority]}>
        {t(`tasks.priorities.${priority}`)}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={EyeIcon} size={20} />
            {t("tasks.details")}
          </DialogTitle>
          <DialogDescription>
            {t("tasks.title")}: {task.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                {t("tasks.status.title")}
              </label>
              {getStatusBadge(task.status)}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                {t("tasks.priority.title")}
              </label>
              {getPriorityBadge(task.priority)}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              {t("tasks.dueDate")}
            </label>
            <p className="text-sm">{formatDate(task.due_date)}</p>
          </div>

          {/* Assigned To */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              {t("tasks.assignedTo")}
            </label>
            <p className="text-sm">{task.assigned_to_id || "-"}</p>
          </div>

          {/* Source Module */}
          {task.source_module && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                {t("tasks.sourceModule")}
              </label>
              <Badge variant="secondary">{task.source_module}</Badge>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                {t("tasks.description")}
              </label>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Checklist */}
          {task.checklist && task.checklist.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                {t("tasks.checklist.title")}
              </label>
              <div className="space-y-2">
                {task.checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox checked={item.completed} disabled />
                    <span
                      className={`text-sm ${
                        item.completed
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Created/Updated Info */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Creado
              </label>
              <p className="text-xs">{formatDate(task.created_at)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Actualizado
              </label>
              <p className="text-xs">{formatDate(task.updated_at)}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
