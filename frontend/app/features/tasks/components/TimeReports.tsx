/**
 * TimeReports component
 * Displays time tracking reports with summary, per-task breakdown, and efficiency metrics.
 */

import { useState, useMemo } from "react";
import { Clock, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import type { Task } from "~/features/tasks/types/task.types";
import type { TimeEntry } from "~/features/tasks/hooks/useTimeTracking";

interface TimeReportsProps {
  tasks: Task[];
  timeEntriesByTask: Record<string, TimeEntry[]>;
  estimatedHoursByTask?: Record<string, number>;
}

type DateRange = "all" | "thisWeek" | "thisMonth" | "last30Days";

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0 && m === 0) return "0m";
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getDateRangeStart(range: DateRange): Date | null {
  const now = new Date();
  switch (range) {
    case "thisWeek": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "thisMonth": {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    case "last30Days": {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    default:
      return null;
  }
}

export function TimeReports({
  tasks,
  timeEntriesByTask,
  estimatedHoursByTask = {},
}: TimeReportsProps) {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const filteredEntries = useMemo(() => {
    const rangeStart = getDateRangeStart(dateRange);
    const result: Record<string, TimeEntry[]> = {};

    for (const [taskId, entries] of Object.entries(timeEntriesByTask)) {
      const filtered = rangeStart
        ? entries.filter((e) => new Date(e.start_time) >= rangeStart)
        : entries;
      if (filtered.length > 0) {
        result[taskId] = filtered;
      }
    }

    return result;
  }, [timeEntriesByTask, dateRange]);

  const taskReports = useMemo(() => {
    return tasks
      .map((task) => {
        const entries = filteredEntries[task.id] ?? [];
        const trackedSeconds = entries.reduce(
          (acc, e) => acc + (e.duration_seconds ?? 0),
          0
        );
        const trackedHours = trackedSeconds / 3600;
        const estimatedHours = estimatedHoursByTask[task.id] ?? 0;
        const diffHours =
          estimatedHours > 0 ? trackedHours - estimatedHours : 0;

        return {
          task,
          entries,
          trackedHours,
          estimatedHours,
          diffHours,
          entryCount: entries.length,
        };
      })
      .filter((r) => r.entryCount > 0)
      .sort((a, b) => b.trackedHours - a.trackedHours);
  }, [tasks, filteredEntries, estimatedHoursByTask]);

  const summary = useMemo(() => {
    const totalTracked = taskReports.reduce(
      (acc, r) => acc + r.trackedHours,
      0
    );
    const totalEstimated = taskReports.reduce(
      (acc, r) => acc + r.estimatedHours,
      0
    );
    const efficiency =
      totalEstimated > 0
        ? Math.round((totalEstimated / totalTracked) * 100)
        : null;

    return { totalTracked, totalEstimated, efficiency };
  }, [taskReports]);

  const handleExportCsv = () => {
    const headers = [
      t("tasks.timeReports.taskName"),
      t("tasks.timeReports.tracked"),
      t("tasks.timeReports.estimated"),
      t("tasks.timeReports.difference"),
    ];
    const rows = taskReports.map((r) => [
      `"${r.task.title.replace(/"/g, '""')}"`,
      formatHours(r.trackedHours),
      r.estimatedHours > 0 ? formatHours(r.estimatedHours) : "-",
      r.estimatedHours > 0 ? formatHours(Math.abs(r.diffHours)) : "-",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "time-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (taskReports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            {t("tasks.timeReports.noEntries")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {t("tasks.timeReports.noEntriesDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with date range and export */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t("tasks.timeReports.title")}
        </h3>
        <div className="flex items-center gap-2">
          <Select
            value={dateRange}
            onValueChange={(v) => setDateRange(v as DateRange)}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("tasks.timeReports.allTime")}
              </SelectItem>
              <SelectItem value="thisWeek">
                {t("tasks.timeReports.thisWeek")}
              </SelectItem>
              <SelectItem value="thisMonth">
                {t("tasks.timeReports.thisMonth")}
              </SelectItem>
              <SelectItem value="last30Days">
                {t("tasks.timeReports.last30Days")}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleExportCsv}
          >
            <Download className="h-3.5 w-3.5" />
            {t("tasks.timeReports.exportCsv")}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("tasks.timeReports.totalTracked")}
            </p>
            <p className="text-2xl font-bold">
              {formatHours(summary.totalTracked)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("tasks.timeReports.totalEstimated")}
            </p>
            <p className="text-2xl font-bold">
              {summary.totalEstimated > 0
                ? formatHours(summary.totalEstimated)
                : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("tasks.timeReports.efficiency")}
            </p>
            <p
              className={cn(
                "text-2xl font-bold",
                summary.efficiency != null &&
                  summary.efficiency < 80 &&
                  "text-destructive",
                summary.efficiency != null &&
                  summary.efficiency >= 80 &&
                  summary.efficiency <= 120 &&
                  "text-green-600",
                summary.efficiency != null &&
                  summary.efficiency > 120 &&
                  "text-yellow-600"
              )}
            >
              {summary.efficiency != null ? `${summary.efficiency}%` : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-task breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("tasks.timeReports.byTask")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {taskReports.map((report) => {
              const hasEstimate = report.estimatedHours > 0;
              const isOver = hasEstimate && report.diffHours > 0;
              const isUnder = hasEstimate && report.diffHours < 0;

              return (
                <div
                  key={report.task.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {report.task.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {t("tasks.timeReports.tracked")}:{" "}
                        {formatHours(report.trackedHours)}
                      </span>
                      {hasEstimate && (
                        <>
                          <span>·</span>
                          <span>
                            {t("tasks.timeReports.estimated")}:{" "}
                            {formatHours(report.estimatedHours)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    {hasEstimate && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1 text-xs",
                          isOver && "border-red-200 text-red-700",
                          isUnder && "border-green-200 text-green-700",
                          !isOver && !isUnder && "border-blue-200 text-blue-700"
                        )}
                      >
                        {isOver && <TrendingUp className="h-3 w-3" />}
                        {isUnder && <TrendingDown className="h-3 w-3" />}
                        {!isOver && !isUnder && <Minus className="h-3 w-3" />}
                        {isOver
                          ? `+${formatHours(report.diffHours)}`
                          : isUnder
                            ? `-${formatHours(Math.abs(report.diffHours))}`
                            : t("tasks.timeReports.onTrack")}
                      </Badge>
                    )}
                    {/* Progress bar */}
                    {hasEstimate && (
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            isOver ? "bg-destructive" : "bg-primary"
                          )}
                          style={{
                            width: `${Math.min(
                              (report.trackedHours / report.estimatedHours) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
