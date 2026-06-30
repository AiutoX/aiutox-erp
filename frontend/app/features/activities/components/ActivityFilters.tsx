/**
 * ActivityFilters component
 * Filters for activities list
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import type {
  ActivityType,
  ActivityFilters,
} from "~/features/activities/types/activity.types";

interface ActivityFiltersProps {
  filters: ActivityFilters;
  onFiltersChange: (filters: ActivityFilters) => void;
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
}

const activityTypeOptions: { value: ActivityType; label: string }[] = [
  { value: "comment", label: "activities.types.comment" },
  { value: "call", label: "activities.types.call" },
  { value: "email", label: "activities.types.email" },
  { value: "meeting", label: "activities.types.meeting" },
  { value: "task", label: "activities.types.task" },
  { value: "status_change", label: "activities.types.status_change" },
  { value: "note", label: "activities.types.note" },
  { value: "file_upload", label: "activities.types.file_upload" },
  { value: "custom", label: "activities.types.custom" },
];

export function ActivityFilters({
  filters,
  onFiltersChange,
  onApply,
  onReset,
  loading,
}: ActivityFiltersProps) {
  const { t } = useTranslation();

  const handleActivityTypeToggle = (type: ActivityType) => {
    const newTypes = filters.activity_types.includes(type)
      ? filters.activity_types.filter((t) => t !== type)
      : [...filters.activity_types, type];

    onFiltersChange({
      ...filters,
      activity_types: newTypes,
    });
  };

  const handleDateChange = (field: "date_from" | "date_to", value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value,
    });
  };

  const activeFiltersCount =
    filters.activity_types.length > 0 ||
    !!filters.date_from ||
    !!filters.date_to ||
    !!filters.search
      ? 1
      : 0;

  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t("activities.filters.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">{t("activities.filters.search")}</Label>
          <Input
            id="search"
            value={filters.search || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("activities.filters.search.placeholder")}
          />
        </div>

        {/* Activity Types */}
        <div className="space-y-2">
          <Label>{t("activities.filters.types")}</Label>
          <div className="flex flex-wrap gap-2">
            {activityTypeOptions.map((type) => {
              const isSelected = filters.activity_types.includes(type.value);
              return (
                <Badge
                  key={type.value}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleActivityTypeToggle(type.value)}
                >
                  {t(type.label)}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date_from">
              {t("activities.filters.dateFrom")}
            </Label>
            <Input
              id="date_from"
              type="date"
              value={filters.date_from || ""}
              onChange={(e) => handleDateChange("date_from", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_to">{t("activities.filters.dateTo")}</Label>
            <Input
              id="date_to"
              type="date"
              value={filters.date_to || ""}
              onChange={(e) => handleDateChange("date_to", e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {hasActiveFilters ? (
              <span>
                {t("activities.filters.active")} ({activeFiltersCount})
              </span>
            ) : (
              <span>{t("activities.filters.noActive")}</span>
            )}
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={onReset} disabled={loading}>
              {t("activities.filters.reset")}
            </Button>
            <Button onClick={onApply} disabled={loading || !hasActiveFilters}>
              {loading ? t("common.loading") : t("activities.filters.apply")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
