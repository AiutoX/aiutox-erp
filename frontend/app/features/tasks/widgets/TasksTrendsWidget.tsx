/**
 * Tasks Trends Widget
 * Displays task creation and completion trends over time
 */

import { useMemo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  LineChartIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
} from "lucide-react";

import { useTasksTrends } from "../hooks/useTasksTrends";

interface TasksTrendsWidgetProps {
  period?: string;
  className?: string;
}

export function TasksTrendsWidget({
  period = "30d",
  className,
}: TasksTrendsWidgetProps) {
  const { t } = useTranslation();
  const { data: trends, isLoading, error } = useTasksTrends(period);

  const processedTrends = useMemo(() => {
    if (!trends?.data_points) return null;

    const points = trends.data_points;
    const totalCreated = points.reduce((sum, point) => sum + point.created, 0);
    const totalCompleted = points.reduce(
      (sum, point) => sum + point.completed,
      0
    );
    const avgCreatedPerDay = totalCreated / points.length;
    const avgCompletedPerDay = totalCompleted / points.length;

    // Calculate trend direction
    const recentPoints = points.slice(-7); // Last 7 points
    const olderPoints = points.slice(-14, -7); // Previous 7 points
    const recentCreated = recentPoints.reduce(
      (sum, point) => sum + point.created,
      0
    );
    const olderCreated = olderPoints.reduce(
      (sum, point) => sum + point.created,
      0
    );
    const createdTrend =
      recentCreated > olderCreated
        ? "up"
        : recentCreated < olderCreated
          ? "down"
          : "stable";

    const recentCompleted = recentPoints.reduce(
      (sum, point) => sum + point.completed,
      0
    );
    const olderCompleted = olderPoints.reduce(
      (sum, point) => sum + point.completed,
      0
    );
    const completedTrend =
      recentCompleted > olderCompleted
        ? "up"
        : recentCompleted < olderCompleted
          ? "down"
          : "stable";

    return {
      points,
      totalCreated,
      totalCompleted,
      avgCreatedPerDay,
      avgCompletedPerDay,
      createdTrend,
      completedTrend,
      period: trends.period,
    };
  }, [trends]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5" />
            {t("tasks.statistics.trends")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-40 bg-muted animate-pulse rounded" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !processedTrends) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5" />
            {t("tasks.statistics.trends")}
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <CalendarIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChartIcon className="h-5 w-5" />
          {t("tasks.statistics.trends")}
          <Badge variant="outline" className="ml-auto">
            {processedTrends.period}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                {getTrendIcon(processedTrends.createdTrend)}
                <div
                  className={`text-lg font-bold ${getTrendColor(processedTrends.createdTrend)}`}
                >
                  {processedTrends.totalCreated}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {t("tasks.statistics.totalCreated")}
              </div>
              <div className="text-xs text-muted-foreground">
                {processedTrends.avgCreatedPerDay.toFixed(1)}{" "}
                {t("common.perDay")}
              </div>
            </div>

            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                {getTrendIcon(processedTrends.completedTrend)}
                <div
                  className={`text-lg font-bold ${getTrendColor(processedTrends.completedTrend)}`}
                >
                  {processedTrends.totalCompleted}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {t("tasks.statistics.totalCompleted")}
              </div>
              <div className="text-xs text-muted-foreground">
                {processedTrends.avgCompletedPerDay.toFixed(1)}{" "}
                {t("common.perDay")}
              </div>
            </div>

            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-blue-600 mb-1">
                {processedTrends.totalCompleted > 0
                  ? `${((processedTrends.totalCompleted / processedTrends.totalCreated) * 100).toFixed(1)}%`
                  : "0%"}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("tasks.statistics.completionRatio")}
              </div>
            </div>
          </div>

          <Separator />

          {/* Trend Points */}
          <div>
            <h4 className="font-medium mb-3">
              {t("tasks.statistics.dailyTrends")}
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {processedTrends.points.map((point, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {formatDate(point.period)}
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-blue-600 font-medium">
                        {point.created}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-green-600 font-medium">
                        {point.completed}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>{t("tasks.statistics.created")}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>{t("tasks.statistics.completed")}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
