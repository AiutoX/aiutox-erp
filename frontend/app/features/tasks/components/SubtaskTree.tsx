/**
 * SubtaskTree component
 * Renders a hierarchical view of subtasks with collapse/expand,
 * progress indicators, and inline creation.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, GripVertical } from "lucide-react";
import { cn } from "~/lib/utils";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { useSubtasks } from "~/features/tasks/hooks/useSubtasks";
import { calculateSubtaskProgress } from "~/features/tasks/utils/subtasks";
import type { Task } from "~/features/tasks/types/task.types";

const INDENT_PX = 24;
const MAX_DEPTH = 3;

interface SubtaskTreeProps {
  task: Task;
  level?: number;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onTaskClick?: (task: Task) => void;
}

export function SubtaskTree({
  task,
  level = 0,
  onToggleComplete,
  onTaskClick,
}: SubtaskTreeProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const { subtasks, isLoading, createSubtask, isCreating } = useSubtasks(
    task.id
  );

  const progress = calculateSubtaskProgress({
    ...task,
    subtasks: subtasks.length > 0 ? subtasks : task.subtasks,
  });

  const hasSubtasks = subtasks.length > 0 || (task.subtasks?.length ?? 0) > 0;
  const displaySubtasks =
    subtasks.length > 0 ? subtasks : (task.subtasks ?? []);
  const canAddSubtask = level < MAX_DEPTH - 1;

  const handleAddSubtask = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    await createSubtask({ title: trimmed });
    setNewTitle("");
    setShowAddInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleAddSubtask();
    } else if (e.key === "Escape") {
      setShowAddInput(false);
      setNewTitle("");
    }
  };

  return (
    <div>
      {/* Current task row */}
      {level > 0 && (
        <div
          className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
          style={{ paddingLeft: level * INDENT_PX }}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-50 cursor-grab shrink-0" />

          {hasSubtasks ? (
            <button
              type="button"
              className="shrink-0 p-0.5 rounded hover:bg-muted"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-4.5 shrink-0" />
          )}

          <Checkbox
            checked={task.status === "done"}
            onCheckedChange={(checked) =>
              onToggleComplete(task.id, checked === true)
            }
            className="shrink-0"
          />

          <button
            type="button"
            className={cn(
              "flex-1 text-left text-sm truncate",
              task.status === "done" && "line-through text-muted-foreground"
            )}
            onClick={() => onTaskClick?.(task)}
          >
            {task.title}
          </button>

          {progress.total > 0 && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {progress.completed}/{progress.total}
            </Badge>
          )}
        </div>
      )}

      {/* Progress bar for root level */}
      {level === 0 && progress.total > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>
              {progress.completed}/{progress.total}{" "}
              {t("tasks.subtasks.completed")}
            </span>
            <span>{progress.percentage}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtasks list */}
      {expanded && (
        <div>
          {isLoading && level === 0 && (
            <div
              className="text-xs text-muted-foreground py-2"
              style={{ paddingLeft: (level + 1) * INDENT_PX }}
            >
              {t("common.loading")}...
            </div>
          )}

          {displaySubtasks.map((sub) => (
            <SubtaskTree
              key={sub.id}
              task={sub}
              level={level + 1}
              onToggleComplete={onToggleComplete}
              onTaskClick={onTaskClick}
            />
          ))}

          {/* Add subtask input */}
          {showAddInput && (
            <div
              className="flex items-center gap-2 py-1"
              style={{ paddingLeft: (level + 1) * INDENT_PX }}
            >
              <Input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("tasks.subtasks.newPlaceholder")}
                className="h-7 text-sm"
                disabled={isCreating}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => void handleAddSubtask()}
                disabled={isCreating || !newTitle.trim()}
              >
                {t("common.add")}
              </Button>
            </div>
          )}

          {/* Add subtask button */}
          {canAddSubtask && !showAddInput && (
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
              style={{ paddingLeft: (level + 1) * INDENT_PX }}
              onClick={() => setShowAddInput(true)}
            >
              <Plus className="h-3 w-3" />
              {t("tasks.subtasks.add")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
