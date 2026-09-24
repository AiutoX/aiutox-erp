/**
 * BulkActionsBar component
 * Floating bar that appears when tasks are selected, offering bulk operations.
 */

import { X, Trash2, Flag, CheckCircle } from "lucide-react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type {
  TaskStatus,
  TaskPriority,
} from "~/features/tasks/types/task.types";

interface BulkActionsBarProps {
  selectedCount: number;
  onUpdateStatus: (status: TaskStatus) => void;
  onUpdatePriority: (priority: TaskPriority) => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isProcessing: boolean;
}

const STATUSES: { value: TaskStatus; labelKey: string }[] = [
  { value: "todo", labelKey: "tasks.statuses.todo" },
  { value: "in_progress", labelKey: "tasks.statuses.in_progress" },
  { value: "on_hold", labelKey: "tasks.statuses.on_hold" },
  { value: "review", labelKey: "tasks.statuses.review" },
  { value: "done", labelKey: "tasks.statuses.done" },
  { value: "cancelled", labelKey: "tasks.statuses.cancelled" },
];

const PRIORITIES: { value: TaskPriority; labelKey: string }[] = [
  { value: "low", labelKey: "tasks.priorities.low" },
  { value: "medium", labelKey: "tasks.priorities.medium" },
  { value: "high", labelKey: "tasks.priorities.high" },
  { value: "urgent", labelKey: "tasks.priorities.urgent" },
];

export function BulkActionsBar({
  selectedCount,
  onUpdateStatus,
  onUpdatePriority,
  onDelete,
  onClearSelection,
  isProcessing,
}: BulkActionsBarProps) {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border bg-background px-4 py-2.5 shadow-lg">
      {/* Selection count */}
      <span className="text-sm font-medium whitespace-nowrap">
        {selectedCount} {t("tasks.bulkActions.selected")}
      </span>

      {/* Status change */}
      <Select
        onValueChange={(v) => onUpdateStatus(v as TaskStatus)}
        disabled={isProcessing}
      >
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <CheckCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
          <SelectValue placeholder={t("tasks.bulkActions.changeStatus")} />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {t(s.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority change */}
      <Select
        onValueChange={(v) => onUpdatePriority(v as TaskPriority)}
        disabled={isProcessing}
      >
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <Flag className="h-3.5 w-3.5 mr-1 shrink-0" />
          <SelectValue placeholder={t("tasks.bulkActions.changePriority")} />
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {t(p.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Delete */}
      <Button
        variant="destructive"
        size="sm"
        className="h-8 gap-1 text-xs"
        onClick={onDelete}
        disabled={isProcessing}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("tasks.bulkActions.delete")}
      </Button>

      {/* Clear selection */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={onClearSelection}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
