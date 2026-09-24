/**
 * Task Filters Component
 * Filters for task list
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  SearchIcon,
  DownloadIcon,
  UploadIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type {
  TaskStatus,
  TaskPriority,
} from "~/features/tasks/types/task.types";

export interface TaskFilters {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  due_date_from?: string;
  due_date_to?: string;
}

interface TaskFiltersProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  onReset: () => void;
}

export function TaskFilters({ filters, onChange, onReset }: TaskFiltersProps) {
  const { t } = useTranslation();

  // Debug: Verificar qué traducciones está cargando el hook
  console.log("Debug - tasks.advancedFilters:", t("tasks.advancedFilters"));
  console.log(
    "Debug - tasks.filtersAssignedToPlaceholder:",
    t("tasks.filtersAssignedToPlaceholder")
  );
  console.log("Debug - savedFilters.title:", t("savedFilters.title"));

  const [isCollapsed, setIsCollapsed] = useState(true);

  // Set default "to" date to today if not already set
  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const updateFilter = (
    key: keyof TaskFilters,
    value: string | string[] | boolean | null | undefined
  ) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilter = (key: keyof TaskFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onChange(newFilters);
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== null && value !== ""
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>{t("tasks.filtersTitle")}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-6 w-6 p-0"
            >
              <HugeiconsIcon
                icon={isCollapsed ? ArrowDown01Icon : ArrowUp01Icon}
                size={16}
              />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Badge variant="outline" className="text-xs">
                {
                  Object.keys(filters).filter(
                    (key) => filters[key as keyof TaskFilters]
                  ).length
                }{" "}
                {t("tasks.filtersActive")}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onReset}>
              <HugeiconsIcon icon={DownloadIcon} size={16} className="mr-2" />
              {t("tasks.filtersReset")}
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Search, Status, Priority, Assigned To - 2 columns for large screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("tasks.filtersSearch")}
              </label>
              <div className="relative">
                <HugeiconsIcon
                  icon={SearchIcon}
                  size={16}
                  className="absolute left-3 top-1/2 text-gray-400"
                />
                <Input
                  placeholder={t("tasks.filtersSearchPlaceholder")}
                  value={filters.search || ""}
                  onChange={(e) => updateFilter("search", e.target.value)}
                  className="pl-10"
                />
                {filters.search && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearFilter("search")}
                    className="absolute right-1 top-1/2"
                  >
                    <HugeiconsIcon
                      icon={DownloadIcon}
                      size={12}
                      className="absolute right-1 top-1/2"
                    />
                  </Button>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("tasks.filtersStatusLabel")}
              </label>
              <Select
                value={filters.status || ""}
                onValueChange={(value) =>
                  updateFilter("status", value || undefined)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("tasks.filtersAllStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("tasks.filtersAllStatuses")}
                  </SelectItem>
                  <SelectItem value="todo">
                    {t("tasks.statuses.todo")}
                  </SelectItem>
                  <SelectItem value="in_progress">
                    {t("tasks.statuses.inProgress")}
                  </SelectItem>
                  <SelectItem value="done">
                    {t("tasks.statuses.done")}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {t("tasks.statuses.cancelled")}
                  </SelectItem>
                  <SelectItem value="on_hold">
                    {t("tasks.statuses.onHold")}
                  </SelectItem>
                </SelectContent>
              </Select>
              {filters.status && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearFilter("status")}
                  className="ml-2"
                >
                  <HugeiconsIcon
                    icon={DownloadIcon}
                    size={12}
                    className="ml-2"
                  />
                </Button>
              )}
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("tasks.filtersPriorityLabel")}
              </label>
              <Select
                value={filters.priority || ""}
                onValueChange={(value) =>
                  updateFilter("priority", value || undefined)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("tasks.filtersAllPriorities")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("tasks.filtersAllPriorities")}
                  </SelectItem>
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
              {filters.priority && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearFilter("priority")}
                  className="ml-2"
                >
                  <HugeiconsIcon
                    icon={DownloadIcon}
                    size={12}
                    className="ml-2"
                  />
                </Button>
              )}
            </div>

            {/* Assigned To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("tasks.filtersAssignedTo")} - {t("tasks.status.title")}
              </label>
              <div className="relative">
                <HugeiconsIcon
                  icon={UploadIcon}
                  size={16}
                  className="absolute left-3 top-1/2 text-gray-400"
                />
                <Input
                  placeholder="PRUEBA DIRECTA"
                  value={filters.assigned_to || ""}
                  onChange={(e) => updateFilter("assigned_to", e.target.value)}
                  className="pl-10"
                />
                {filters.assigned_to && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearFilter("assigned_to")}
                    className="absolute right-1 top-1/2"
                  >
                    <HugeiconsIcon
                      icon={DownloadIcon}
                      size={12}
                      className="absolute right-1 top-1/2"
                    />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Due Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("tasks.filtersDueDateRange")}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t("tasks.filtersFrom")}
                </label>
                <div className="relative">
                  <HugeiconsIcon
                    icon={DownloadIcon}
                    size={16}
                    className="absolute left-3 top-1/2 text-gray-400"
                  />
                  <Input
                    type="date"
                    value={filters.due_date_from || ""}
                    onChange={(e) =>
                      updateFilter("due_date_from", e.target.value)
                    }
                    className="pl-10"
                  />
                  {filters.due_date_from && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearFilter("due_date_from")}
                      className="absolute right-1 top-1/2"
                    >
                      <HugeiconsIcon
                        icon={DownloadIcon}
                        size={12}
                        className="absolute right-1 top-1/2"
                      />
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t("tasks.filtersTo")}
                </label>
                <div className="relative">
                  <HugeiconsIcon
                    icon={DownloadIcon}
                    size={16}
                    className="absolute left-3 top-1/2 text-gray-400"
                  />
                  <Input
                    type="date"
                    value={filters.due_date_to || getTodayDate()}
                    onChange={(e) =>
                      updateFilter("due_date_to", e.target.value)
                    }
                    className="pl-10"
                  />
                  {filters.due_date_to && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearFilter("due_date_to")}
                      className="absolute right-1 top-1/2"
                    >
                      <HugeiconsIcon
                        icon={DownloadIcon}
                        size={12}
                        className="absolute right-1 top-1/2"
                      />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <HugeiconsIcon
                  icon={UploadIcon}
                  size={16}
                  className="text-gray-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  {t("tasks.filtersActiveSummary")}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.search && (
                  <Badge variant="outline" className="text-xs">
                    {t("tasks.filtersSearchLabel")}: &quot;{filters.search}
                    &quot;
                  </Badge>
                )}
                {filters.status && (
                  <Badge variant="outline" className="text-xs">
                    {t("tasks.filtersStatusLabel")}:{" "}
                    {t(
                      `tasks.statuses.${filters.status === "in_progress" ? "inProgress" : filters.status === "on_hold" ? "onHold" : filters.status}`
                    )}
                  </Badge>
                )}
                {filters.priority && (
                  <Badge variant="outline" className="text-xs">
                    {t("tasks.filtersPriorityLabel")}:{" "}
                    {t(`tasks.priorities.${filters.priority}`)}
                  </Badge>
                )}
                {filters.assigned_to && (
                  <Badge variant="outline" className="text-xs">
                    {t("tasks.filtersAssignedLabel")}: {filters.assigned_to}
                  </Badge>
                )}
                {filters.due_date_from && (
                  <Badge variant="outline" className="text-xs">
                    {t("tasks.filtersFromLabel")}: {filters.due_date_from}
                  </Badge>
                )}
                {filters.due_date_to && (
                  <Badge variant="outline" className="text-xs">
                    {t("tasks.filtersToLabel")}: {filters.due_date_to}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
