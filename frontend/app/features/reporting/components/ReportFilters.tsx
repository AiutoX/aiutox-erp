/**
 * ReportFilters component
 * Advanced filtering for reports
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Filter, X } from "lucide-react";
import type { ReportListParams } from "~/features/reporting/types/reporting.types";

interface ReportFiltersProps {
  filters: ReportListParams;
  onFiltersChange: (filters: ReportListParams) => void;
  onReset: () => void;
  modules: string[];
  dataSources: string[];
}

export function ReportFilters({
  filters,
  onFiltersChange,
  onReset,
  modules,
  dataSources,
}: ReportFiltersProps) {
  const { t } = useTranslation();
  const handleFilterChange = (
    key: keyof ReportListParams,
    value: string | number | boolean | undefined
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const removeFilter = (key: keyof ReportListParams) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const getActiveFiltersCount = () => {
    return Object.keys(filters).filter(
      (key) => filters[key as keyof ReportListParams] !== undefined
    ).length;
  };

  const hasActiveFilters = getActiveFiltersCount() > 0;

  const renderDateRange = () => {
    // This would be implemented with a date range picker component
    // For now, showing a simple implementation
    return (
      <div className="flex space-x-2">
        <Input
          type="date"
          placeholder={t("reporting.filters.startDate")}
          value={filters.start_date || ""}
          onChange={(e) => handleFilterChange("start_date", e.target.value)}
        />
        <Input
          type="date"
          placeholder={t("reporting.filters.endDate")}
          value={filters.end_date || ""}
          onChange={(e) => handleFilterChange("end_date", e.target.value)}
        />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>{t("reporting.filters.title")}</span>
            {hasActiveFilters && (
              <Badge variant="secondary">
                {getActiveFiltersCount()} {t("reporting.filters.active")}
              </Badge>
            )}
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={onReset}>
              <X className="h-4 w-4 mr-2" />
              {t("reporting.filters.reset")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">{t("reporting.filters.search")}</Label>
            <Input
              id="search"
              placeholder={t("reporting.filters.search.placeholder")}
              value={filters.search || ""}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>

          {/* Module */}
          <div className="space-y-2">
            <Label>{t("reporting.filters.module")}</Label>
            <Select
              value={filters.module || ""}
              onValueChange={(value) => handleFilterChange("module", value)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("reporting.filters.module.placeholder")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("reporting.filters.all")}</SelectItem>
                {modules.map((module) => (
                  <SelectItem key={module} value={module}>
                    {t(`reporting.modules.${module}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Source */}
          <div className="space-y-2">
            <Label>{t("reporting.filters.dataSource")}</Label>
            <Select
              value={filters.data_source || ""}
              onValueChange={(value) =>
                handleFilterChange("data_source", value)
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("reporting.filters.dataSource.placeholder")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("reporting.filters.all")}</SelectItem>
                {dataSources.map((ds) => (
                  <SelectItem key={ds} value={ds}>
                    {ds}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>{t("reporting.filters.status")}</Label>
            <Select
              value={
                filters.is_active === true
                  ? "active"
                  : filters.is_active === false
                    ? "inactive"
                    : ""
              }
              onValueChange={(value) => {
                if (value === "active") handleFilterChange("is_active", true);
                else if (value === "inactive")
                  handleFilterChange("is_active", false);
                else handleFilterChange("is_active", undefined);
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("reporting.filters.status.placeholder")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("reporting.filters.all")}</SelectItem>
                <SelectItem value="active">
                  {t("reporting.status.active")}
                </SelectItem>
                <SelectItem value="inactive">
                  {t("reporting.status.inactive")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center space-x-2 mb-4">
            <Label className="text-sm font-medium">
              {t("reporting.filters.advanced")}
            </Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Page Size */}
            <div className="space-y-2">
              <Label>{t("reporting.filters.pageSize")}</Label>
              <Select
                value={filters.page_size?.toString() || "20"}
                onValueChange={(value) =>
                  handleFilterChange("page_size", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>{t("reporting.filters.dateRange")}</Label>
              {renderDateRange()}
            </div>

            {/* Created By (if available) */}
            <div className="space-y-2">
              <Label>{t("reporting.filters.createdBy")}</Label>
              <Input
                placeholder={t("reporting.filters.createdBy.placeholder")}
                // This would be implemented when user filtering is available
                disabled
              />
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2 mb-2">
              <Label className="text-sm font-medium">
                {t("reporting.filters.activeFilters")}
              </Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge
                  variant="outline"
                  className="flex items-center space-x-1"
                >
                  <span>
                    {t("reporting.filters.search")}: {filters.search}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter("search")}
                  />
                </Badge>
              )}
              {filters.module && (
                <Badge
                  variant="outline"
                  className="flex items-center space-x-1"
                >
                  <span>
                    {t("reporting.filters.module")}: {filters.module}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter("module")}
                  />
                </Badge>
              )}
              {filters.data_source && (
                <Badge
                  variant="outline"
                  className="flex items-center space-x-1"
                >
                  <span>
                    {t("reporting.filters.dataSource")}: {filters.data_source}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter("data_source")}
                  />
                </Badge>
              )}
              {filters.is_active !== undefined && (
                <Badge
                  variant="outline"
                  className="flex items-center space-x-1"
                >
                  <span>
                    {t("reporting.filters.status")}:{" "}
                    {filters.is_active
                      ? t("reporting.status.active")
                      : t("reporting.status.inactive")}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter("is_active")}
                  />
                </Badge>
              )}
              {filters.page_size && (
                <Badge
                  variant="outline"
                  className="flex items-center space-x-1"
                >
                  <span>
                    {t("reporting.filters.pageSize")}: {filters.page_size}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter("page_size")}
                  />
                </Badge>
              )}
              {filters.start_date && (
                <Badge
                  variant="outline"
                  className="flex items-center space-x-1"
                >
                  <span>
                    {t("reporting.filters.startDate")}: {filters.start_date}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter("start_date")}
                  />
                </Badge>
              )}
              {filters.end_date && (
                <Badge
                  variant="outline"
                  className="flex items-center space-x-1"
                >
                  <span>
                    {t("reporting.filters.endDate")}: {filters.end_date}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter("end_date")}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
