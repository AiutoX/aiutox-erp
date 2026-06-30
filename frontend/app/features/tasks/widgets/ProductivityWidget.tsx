/**
 * Productivity Widget
 * Displays key productivity indicators and metrics
 */

import { useMemo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Progress } from "~/components/ui/progress";
import {
  TargetIcon,
  ZapIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  ClockIcon,
  CheckCircle2Icon,
} from "lucide-react";

import { useTasksStatistics } from "../hooks/useTasksStatistics";
import type { TimeFilter } from "../api/statistics.api";

interface ProductivityWidgetProps {
  timeFilter?: TimeFilter;
  className?: string;
}

interface KPIData {
  title: string;
  value: number | string;
  format: "number" | "percentage" | "time";
  icon: React.ReactNode;
  color: string;
  trend?: number;
  description?: string;
}

export function ProductivityWidget({
  timeFilter,
  className,
}: ProductivityWidgetProps) {
  const { t } = useTranslation();
  const { data: statistics, isLoading, error } = useTasksStatistics(timeFilter);

  const kpis = useMemo(() => {
    if (!statistics) return [];

    const kpiData: KPIData[] = [
      {
        title: t("tasks.statistics.totalTasks"),
        value: statistics.total_tasks,
        format: "number",
        icon: <TargetIcon className="h-4 w-4" />,
        color: "text-blue-600",
        description: t("tasks.statistics.totalTasksDesc"),
      },
      {
        title: t("tasks.statistics.completionRate"),
        value: statistics.completion_rate,
        format: "percentage",
        icon: <CheckCircle2Icon className="h-4 w-4" />,
        color: "text-green-600",
        description: t("tasks.statistics.completionRateDesc"),
      },
      {
        title: t("tasks.statistics.completedTasks"),
        value: statistics.completed_tasks,
        format: "number",
        icon: <CheckCircle2Icon className="h-4 w-4" />,
        color: "text-emerald-600",
        description: t("tasks.statistics.completedTasksDesc"),
      },
      {
        title: t("tasks.statistics.overdueTasks"),
        value: statistics.overdue_tasks,
        format: "number",
        icon: <AlertTriangleIcon className="h-4 w-4" />,
        color: "text-orange-600",
        description: t("tasks.statistics.overdueTasksDesc"),
      },
    ];

    // Add trend indicators (simplified for now)
    return kpiData.map((kpi, index) => ({
      ...kpi,
      trend: index % 2 === 0 ? 5.2 : -2.1, // Mock trend data
    }));
  }, [statistics, t]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ZapIcon className="h-5 w-5" />
            {t("tasks.statistics.productivity")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ZapIcon className="h-5 w-5" />
            {t("tasks.statistics.productivity")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {t("common.error.loadingData")}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatValue = (value: number | string, format: string) => {
    switch (format) {
      case "percentage":
        return `${Number(value).toFixed(1)}%`;
      case "time":
        // For time metrics, we'd need to implement proper formatting
        return typeof value === "number" ? `${value}h` : value;
      case "number":
      default:
        return Number(value).toLocaleString();
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) {
      return <TrendingUpIcon className="h-3 w-3 text-green-500" />;
    } else if (trend < 0) {
      return <TrendingUpIcon className="h-3 w-3 text-red-500 rotate-180" />;
    }
    return null;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-gray-500";
  };

  const getProgressValue = (kpi: KPIData) => {
    if (kpi.format === "percentage") {
      return Math.min(100, Math.max(0, Number(kpi.value)));
    }
    // For other metrics, use a normalized value based on typical ranges
    const normalizedValue = Number(kpi.value);
    if (kpi.title.includes(t("tasks.statistics.totalTasks"))) {
      return Math.min(100, (normalizedValue / 100) * 100); // Assume 100 is good baseline
    }
    if (kpi.title.includes(t("tasks.statistics.overdueTasks"))) {
      return Math.min(100, normalizedValue * 10); // 10 overdue = 100%
    }
    return Math.min(100, normalizedValue);
  };

  const getProgressColor = (kpi: KPIData) => {
    if (kpi.format === "percentage") {
      if (Number(kpi.value) >= 80) return "bg-green-500";
      if (Number(kpi.value) >= 50) return "bg-yellow-500";
      return "bg-red-500";
    }
    if (kpi.title.includes(t("tasks.statistics.overdueTasks"))) {
      if (Number(kpi.value) === 0) return "bg-green-500";
      if (Number(kpi.value) <= 5) return "bg-yellow-500";
      return "bg-red-500";
    }
    return "bg-blue-500";
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ZapIcon className="h-5 w-5" />
          {t("tasks.statistics.productivity")}
          <Badge variant="outline" className="ml-auto">
            {t("tasks.statistics.realTime")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-4">
            {kpis.map((kpi, index) => (
              <div key={index} className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1 rounded-lg ${kpi.color.replace("text", "bg")} bg-opacity-10`}
                    >
                      {kpi.icon}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{kpi.title}</div>
                      {kpi.description && (
                        <div className="text-xs text-muted-foreground">
                          {kpi.description}
                        </div>
                      )}
                    </div>
                  </div>
                  {kpi.trend !== undefined && (
                    <div className="flex items-center gap-1">
                      {getTrendIcon(kpi.trend)}
                      <span
                        className={`text-xs font-medium ${getTrendColor(kpi.trend)}`}
                      >
                        {Math.abs(kpi.trend).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-between">
                  <div className={`text-2xl font-bold ${kpi.color}`}>
                    {formatValue(kpi.value, kpi.format)}
                  </div>
                  <div className="text-right">
                    <Progress
                      value={getProgressValue(kpi)}
                      className="h-2 w-16"
                      style={{
                        backgroundColor: getProgressColor(kpi),
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Productivity Insights */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <ClockIcon className="h-4 w-4" />
              {t("tasks.statistics.insights")}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                <span className="text-muted-foreground">
                  {t("tasks.statistics.productivityScore")}
                </span>
                <Badge
                  variant={
                    (statistics?.completion_rate ?? 0) >= 70
                      ? "default"
                      : "secondary"
                  }
                  className={
                    (statistics?.completion_rate ?? 0) >= 70
                      ? "bg-green-600"
                      : "bg-orange-600"
                  }
                >
                  {(statistics?.completion_rate ?? 0) >= 70
                    ? t("tasks.statistics.excellent")
                    : (statistics?.completion_rate ?? 0) >= 50
                      ? t("tasks.statistics.good")
                      : t("tasks.statistics.needsImprovement")}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                <span className="text-muted-foreground">
                  {t("tasks.statistics.workload")}
                </span>
                <Badge variant="outline">
                  {(statistics?.total_tasks ?? 0) > 50
                    ? t("tasks.statistics.high")
                    : (statistics?.total_tasks ?? 0) > 20
                      ? t("tasks.statistics.moderate")
                      : t("tasks.statistics.low")}
                </Badge>
              </div>

              {statistics?.overdue_tasks && statistics.overdue_tasks > 0 && (
                <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                  <span className="text-orange-600 dark:text-orange-400">
                    {t("tasks.statistics.attentionRequired")}
                  </span>
                  <Badge variant="destructive">
                    {statistics.overdue_tasks} {t("tasks.statistics.overdue")}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
