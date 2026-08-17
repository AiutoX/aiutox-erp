/**
 * Custom States Widget
 * Displays custom task state metrics and usage statistics
 */

import { useMemo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Progress } from "~/components/ui/progress";
import { SettingsIcon, ClockIcon, BarChart3Icon, TagIcon } from "lucide-react";

import { useCustomStatesMetrics } from "../hooks/useCustomStatesMetrics";

interface CustomStatesWidgetProps {
  className?: string;
}

export function CustomStatesWidget({ className }: CustomStatesWidgetProps) {
  const { t } = useTranslation();
  const { data: metrics, isLoading, error } = useCustomStatesMetrics();

  const processedMetrics = useMemo(() => {
    if (!metrics || !Array.isArray(metrics)) return null;

    // Group by state type
    const groupedByType = metrics.reduce(
      (acc, metric) => {
        const stateType = metric.state_type || "unknown";
        if (!acc[stateType]) {
          acc[stateType] = [];
        }
        acc[stateType]?.push(metric);
        return acc;
      },
      {} as Record<string, Array<(typeof metrics)[0]>>
    );

    // Calculate totals
    const totalTasks = metrics.reduce(
      (sum, metric) => sum + metric.task_count,
      0
    );
    const totalAvgTime = metrics
      .filter((m) => m.avg_time_in_state_hours !== null)
      .reduce((sum, metric) => sum + (metric.avg_time_in_state_hours || 0), 0);
    const avgTimeCount = metrics.filter(
      (m) => m.avg_time_in_state_hours !== null
    ).length;
    const overallAvgTime =
      avgTimeCount > 0 ? totalAvgTime / avgTimeCount : null;

    return {
      metrics,
      groupedByType,
      totalTasks,
      overallAvgTime,
      typeColors: {
        open: "bg-blue-500",
        in_progress: "bg-yellow-500",
        closed: "bg-green-500",
      },
    };
  }, [metrics]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            {t("tasks.statistics.customStates")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !processedMetrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            {t("tasks.statistics.customStates")}
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

  const formatTime = (hours: number | null) => {
    if (hours === null) return t("common.na");
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      open: t("tasks.states.open"),
      in_progress: t("tasks.states.inProgress"),
      closed: t("tasks.states.closed"),
    };
    return labels[type] || type;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          {t("tasks.statistics.customStates")}
          <Badge variant="outline" className="ml-auto">
            {processedMetrics?.metrics?.length || 0}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {processedMetrics?.totalTasks || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("tasks.statistics.totalTasks")}
              </div>
            </div>

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <ClockIcon className="h-4 w-4 text-blue-500" />
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(processedMetrics?.overallAvgTime)}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {t("tasks.statistics.avgTimeInState")}
              </div>
            </div>
          </div>

          <Separator />

          {/* Grouped by Type */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <BarChart3Icon className="h-4 w-4" />
              {t("tasks.statistics.byType")}
            </h4>
            <div className="space-y-3">
              {processedMetrics?.groupedByType &&
                Object.entries(processedMetrics.groupedByType).map(
                  ([type, typeMetrics]) => {
                    const typeTotal = typeMetrics.reduce(
                      (sum, m) => sum + m.task_count,
                      0
                    );
                    const percentage =
                      (processedMetrics?.totalTasks || 0) > 0
                        ? (typeTotal / processedMetrics.totalTasks) * 100
                        : 0;

                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${processedMetrics?.typeColors?.[type as keyof typeof processedMetrics.typeColors] || "bg-gray-500"}`}
                            />
                            <span className="font-medium">
                              {getTypeLabel(type)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{typeTotal}</Badge>
                            <span className="text-sm text-muted-foreground">
                              ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  }
                )}
            </div>
          </div>

          <Separator />

          {/* Individual States */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TagIcon className="h-4 w-4" />
              {t("tasks.statistics.individualStates")}
            </h4>
            <div className="space-y-3">
              {processedMetrics.metrics.map((metric) => {
                const percentage =
                  processedMetrics.totalTasks > 0
                    ? (metric.task_count / processedMetrics.totalTasks) * 100
                    : 0;

                return (
                  <div
                    key={metric.state_id}
                    className="p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: metric.state_color }}
                        />
                        <span className="font-medium">{metric.state_name}</span>
                      </div>
                      <Badge variant="secondary">{metric.task_count}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          {t("tasks.statistics.type")}:
                        </span>
                        <span className="ml-2 capitalize">
                          {getTypeLabel(metric.state_type)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("tasks.statistics.avgTime")}:
                        </span>
                        <span className="ml-2">
                          {formatTime(metric.avg_time_in_state_hours)}
                        </span>
                      </div>
                    </div>

                    <Progress value={percentage} className="h-1 mt-2" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* No Custom States Message */}
          {processedMetrics.metrics.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <SettingsIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("tasks.statistics.noCustomStates")}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
