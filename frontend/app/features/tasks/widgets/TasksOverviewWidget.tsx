/**
 * Tasks Overview Widget
 * Displays comprehensive task statistics in a card format
 */

import { useMemo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  BarChart3Icon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from "lucide-react";

import { useTasksStatistics } from "../hooks/useTasksStatistics";
import type { TimeFilter } from "../api/statistics.api";

interface TasksOverviewWidgetProps {
  timeFilter?: TimeFilter;
  className?: string;
}

export function TasksOverviewWidget({
  timeFilter,
  className,
}: TasksOverviewWidgetProps) {
  const { t } = useTranslation();
  const { data: statistics, isLoading, error } = useTasksStatistics(timeFilter);

  const stats = useMemo(() => {
    if (!statistics) return null;

    return {
      total: statistics.total_tasks,
      completionRate: statistics.completion_rate,
      completed: statistics.completed_tasks,
      overdue: statistics.overdue_tasks,
      byStatus: statistics.by_status,
      byPriority: statistics.by_priority,
      byCustomState: statistics.by_custom_state,
    };
  }, [statistics]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="h-5 w-5" />
            {t("tasks.statistics.overview")}
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

  if (error || !stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="h-5 w-5" />
            {t("tasks.statistics.overview")}
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      todo: "bg-gray-500",
      in_progress: "bg-blue-500",
      done: "bg-green-500",
      cancelled: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "bg-red-500",
      high: "bg-orange-500",
      medium: "bg-yellow-500",
      low: "bg-green-500",
    };
    return colors[priority] || "bg-gray-500";
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3Icon className="h-5 w-5" />
          {t("tasks.statistics.overview")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {stats.total || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("tasks.statistics.totalTasks")}
              </div>
            </div>

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.completionRate ? stats.completionRate.toFixed(1) : "0"}%
              </div>
              <div className="text-sm text-muted-foreground">
                {t("tasks.statistics.completionRate")}
              </div>
            </div>

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.completed || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("tasks.statistics.completed")}
              </div>
            </div>

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <AlertTriangleIcon className="h-5 w-5 text-orange-500" />
                <div className="text-2xl font-bold text-orange-600">
                  {stats.overdue || 0}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {t("tasks.statistics.overdue")}
              </div>
            </div>
          </div>

          <Separator />

          {/* Status Distribution */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <BarChart3Icon className="h-4 w-4" />
              {t("tasks.statistics.byStatus")}
            </h4>
            <div className="space-y-2">
              {stats.byStatus &&
                Object.entries(stats.byStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}
                      />
                      <span className="text-sm capitalize">{status}</span>
                    </div>
                    <Badge variant="secondary">{count || 0}</Badge>
                  </div>
                ))}
            </div>
          </div>

          <Separator />

          {/* Priority Distribution */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUpIcon className="h-4 w-4" />
              {t("tasks.statistics.byPriority")}
            </h4>
            <div className="space-y-2">
              {stats.byPriority &&
                Object.entries(stats.byPriority).map(([priority, count]) => (
                  <div
                    key={priority}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${getPriorityColor(priority)}`}
                      />
                      <span className="text-sm capitalize">{priority}</span>
                    </div>
                    <Badge variant="secondary">{count || 0}</Badge>
                  </div>
                ))}
            </div>
          </div>

          {/* Custom States */}
          {stats.byCustomState &&
            Object.keys(stats.byCustomState).length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4" />
                    {t("tasks.statistics.customStates")}
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(stats.byCustomState).map(
                      ([state, count]) => (
                        <div
                          key={state}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">{state}</span>
                          <Badge variant="secondary">{count || 0}</Badge>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
