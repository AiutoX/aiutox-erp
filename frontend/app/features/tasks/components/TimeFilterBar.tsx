/**
 * Time Filter Bar Component
 * Allows users to filter statistics by time period
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { CalendarIcon, FilterIcon, XIcon } from "lucide-react";
import type { TimeFilter } from "../api/statistics.api";

interface TimeFilterBarProps {
  value: TimeFilter;
  onChange: (filter: TimeFilter) => void;
}

const presetFilters = [
  { key: "today", label: "tasks.statistics.filters.today" },
  { key: "thisWeek", label: "tasks.statistics.filters.thisWeek" },
  { key: "thisMonth", label: "tasks.statistics.filters.thisMonth" },
  { key: "thisQuarter", label: "tasks.statistics.filters.thisQuarter" },
  { key: "thisYear", label: "tasks.statistics.filters.thisYear" },
] as const;

export function TimeFilterBar({ value, onChange }: TimeFilterBarProps) {
  const { t } = useTranslation();
  const [showCustom, setShowCustom] = useState(false);

  const getPresetDateRange = (preset: string): TimeFilter => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
      case "today":
        return {
          date_from: today.toISOString().split("T")[0],
          date_to: today.toISOString().split("T")[0],
        };

      case "thisWeek": {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          date_from: weekStart.toISOString().split("T")[0],
          date_to: today.toISOString().split("T")[0],
        };
      }

      case "thisMonth": {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          date_from: monthStart.toISOString().split("T")[0],
          date_to: today.toISOString().split("T")[0],
        };
      }

      case "thisQuarter": {
        const quarterStart = new Date(
          today.getFullYear(),
          Math.floor(today.getMonth() / 3) * 3,
          1
        );
        return {
          date_from: quarterStart.toISOString().split("T")[0],
          date_to: today.toISOString().split("T")[0],
        };
      }

      case "thisYear": {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return {
          date_from: yearStart.toISOString().split("T")[0],
          date_to: today.toISOString().split("T")[0],
        };
      }

      default:
        return {};
    }
  };

  const handlePresetClick = (preset: (typeof presetFilters)[number]) => {
    const filter = getPresetDateRange(preset.key);
    onChange(filter);
  };

  const handleClearFilter = () => {
    onChange({});
  };

  const hasActiveFilter = Object.keys(value).length > 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {t("tasks.statistics.timeFilter")}
            </span>
            {hasActiveFilter && (
              <Badge variant="secondary" className="text-xs">
                {t("tasks.statistics.active")}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Preset Filters */}
            <div className="flex items-center gap-1">
              {presetFilters.map((preset) => (
                <Button
                  key={preset.key}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className="text-xs"
                >
                  {t(preset.label)}
                </Button>
              ))}
            </div>

            {/* Custom Filter */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustom(!showCustom)}
              className="text-xs"
            >
              <CalendarIcon className="h-3 w-3 mr-1" />
              {t("tasks.statistics.custom")}
            </Button>

            {/* Clear Filter */}
            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilter}
                className="text-xs"
              >
                <XIcon className="h-3 w-3 mr-1" />
                {t("common.clear")}
              </Button>
            )}
          </div>
        </div>

        {/* Custom Date Range */}
        {showCustom && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  {t("tasks.statistics.dateFrom")}
                </label>
                <input
                  type="date"
                  value={value.date_from || ""}
                  onChange={(e) =>
                    onChange({ ...value, date_from: e.target.value })
                  }
                  className="w-full mt-1 px-2 py-1 text-sm border rounded"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  {t("tasks.statistics.dateTo")}
                </label>
                <input
                  type="date"
                  value={value.date_to || ""}
                  onChange={(e) =>
                    onChange({ ...value, date_to: e.target.value })
                  }
                  className="w-full mt-1 px-2 py-1 text-sm border rounded"
                />
              </div>
            </div>

            {/* Status and Priority Filters */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  {t("tasks.statistics.status")}
                </label>
                <select
                  value={value.status || ""}
                  onChange={(e) =>
                    onChange({ ...value, status: e.target.value || undefined })
                  }
                  className="w-full mt-1 px-2 py-1 text-sm border rounded"
                >
                  <option value="">{t("common.all")}</option>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  {t("tasks.statistics.priority")}
                </label>
                <select
                  value={value.priority || ""}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      priority: e.target.value || undefined,
                    })
                  }
                  className="w-full mt-1 px-2 py-1 text-sm border rounded"
                >
                  <option value="">{t("common.all")}</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Display */}
        {hasActiveFilter && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t("tasks.statistics.currentFilter")}:</span>
            {value.date_from && (
              <Badge variant="outline" className="text-xs">
                {t("tasks.statistics.from")}: {value.date_from}
              </Badge>
            )}
            {value.date_to && (
              <Badge variant="outline" className="text-xs">
                {t("tasks.statistics.to")}: {value.date_to}
              </Badge>
            )}
            {value.status && (
              <Badge variant="outline" className="text-xs">
                {t("tasks.statistics.status")}: {value.status}
              </Badge>
            )}
            {value.priority && (
              <Badge variant="outline" className="text-xs">
                {t("tasks.statistics.priority")}: {value.priority}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
