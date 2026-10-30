/**
 * SavedViewForm component
 * Form for creating and editing saved views with filters, sort, and column config.
 */

import { useState } from "react";
import { Save, X } from "lucide-react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import type {
  ViewCreate,
  SavedView,
  TaskStatus,
  TaskPriority,
} from "~/features/tasks/types/task.types";

interface SavedViewFormProps {
  initialData?: SavedView;
  onSubmit: (data: ViewCreate) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const STATUS_OPTIONS: TaskStatus[] = [
  "todo",
  "in_progress",
  "on_hold",
  "blocked",
  "review",
  "done",
  "cancelled",
];

const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high", "urgent"];

const SORT_FIELDS = [
  { value: "created_at", labelKey: "tasks.savedViews.sortFields.createdAt" },
  { value: "updated_at", labelKey: "tasks.savedViews.sortFields.updatedAt" },
  { value: "due_date", labelKey: "tasks.savedViews.sortFields.dueDate" },
  { value: "priority", labelKey: "tasks.savedViews.sortFields.priority" },
  { value: "status", labelKey: "tasks.savedViews.sortFields.status" },
  { value: "title", labelKey: "tasks.savedViews.sortFields.title" },
];

export function SavedViewForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: SavedViewFormProps) {
  const { t } = useTranslation();

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>(
    initialData?.filters?.status ?? []
  );
  const [selectedPriorities, setSelectedPriorities] = useState<TaskPriority[]>(
    initialData?.filters?.priority ?? []
  );
  const [sortField, setSortField] = useState(
    initialData?.sort_config?.field ?? "created_at"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialData?.sort_config?.direction ?? "desc"
  );
  const [isDefault, setIsDefault] = useState(initialData?.is_default ?? false);
  const [isPublic, setIsPublic] = useState(initialData?.is_public ?? false);

  const toggleStatus = (status: TaskStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const togglePriority = (priority: TaskPriority) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority)
        ? prev.filter((p) => p !== priority)
        : [...prev, priority]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data: ViewCreate = {
      name: name.trim(),
      description: description.trim() || undefined,
      filters: {
        status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        priority:
          selectedPriorities.length > 0 ? selectedPriorities : undefined,
      },
      sort_config: {
        field: sortField,
        direction: sortDirection,
      },
      column_config: initialData?.column_config ?? {},
      is_default: isDefault,
      is_public: isPublic,
    };

    await onSubmit(data);
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="view-name">{t("tasks.savedViews.name")}</Label>
        <Input
          id="view-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("tasks.savedViews.namePlaceholder")}
          required
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="view-description">
          {t("tasks.savedViews.description")}
        </Label>
        <Textarea
          id="view-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("tasks.savedViews.descriptionPlaceholder")}
          rows={2}
        />
      </div>

      {/* Status filters */}
      <div className="space-y-1.5">
        <Label>{t("tasks.savedViews.filterByStatus")}</Label>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((status) => (
            <Badge
              key={status}
              variant={
                selectedStatuses.includes(status) ? "default" : "outline"
              }
              className="cursor-pointer select-none"
              onClick={() => toggleStatus(status)}
            >
              {t(`tasks.statuses.${status}`)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Priority filters */}
      <div className="space-y-1.5">
        <Label>{t("tasks.savedViews.filterByPriority")}</Label>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITY_OPTIONS.map((priority) => (
            <Badge
              key={priority}
              variant={
                selectedPriorities.includes(priority) ? "default" : "outline"
              }
              className="cursor-pointer select-none"
              onClick={() => togglePriority(priority)}
            >
              {t(`tasks.priorities.${priority}`)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Sort config */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t("tasks.savedViews.sortBy")}</Label>
          <Select value={sortField} onValueChange={setSortField}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_FIELDS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {t(f.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("tasks.savedViews.sortDirection")}</Label>
          <Select
            value={sortDirection}
            onValueChange={(v) => setSortDirection(v as "asc" | "desc")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">
                {t("tasks.savedViews.ascending")}
              </SelectItem>
              <SelectItem value="desc">
                {t("tasks.savedViews.descending")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="view-default">
            {t("tasks.savedViews.setAsDefault")}
          </Label>
          <Switch
            id="view-default"
            checked={isDefault}
            onCheckedChange={setIsDefault}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="view-public">
            {t("tasks.savedViews.makePublic")}
          </Label>
          <Switch
            id="view-public"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} size="sm">
          <X className="mr-1.5 h-3.5 w-3.5" />
          {t("common.cancel")}
        </Button>
        <Button type="submit" size="sm" disabled={!name.trim() || isSubmitting}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {isSubmitting
            ? t("common.saving")
            : initialData
              ? t("common.update")
              : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
