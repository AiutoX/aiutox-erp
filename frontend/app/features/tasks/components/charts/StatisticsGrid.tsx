/**
 * Statistics Grid Component
 * Displays key statistics in a responsive grid layout
 */

import { useMemo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  BarChart3Icon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "lucide-react";

interface _StatisticsData {
  total_tasks?: number;
  completed_tasks?: number;
  completion_rate?: number;
  overdue_tasks?: number;
  [key: string]: unknown;
}

interface StatItem {
  title: string;
  value: number | string;
  format?: "number" | "percentage" | "currency";
  icon?: React.ReactNode;
  color?: string;
  trend?: number;
  description?: string;
  progress?: number;
}

interface StatisticsGridProps {
  stats: StatItem[];
  columns?: 1 | 2 | 3 | 4;
  showProgress?: boolean;
  className?: string;
}

export function StatisticsGrid({
  stats,
  columns = 4,
  showProgress = false,
  className,
}: StatisticsGridProps) {
  const { t } = useTranslation();

  const formatValue = (value: number | string, format?: string) => {
    const numValue = Number(value);

    switch (format) {
      case "percentage":
        return `${numValue.toFixed(1)}%`;
      case "currency":
        return new Intl.NumberFormat("es-ES", {
          style: "currency",
          currency: "EUR",
        }).format(numValue);
      case "number":
      default:
        return numValue.toLocaleString("es-ES");
    }
  };

  const getTrendIcon = (trend?: number) => {
    if (trend === undefined) return null;
    if (trend > 0) {
      return <TrendingUpIcon className="h-3 w-3 text-green-500" />;
    } else if (trend < 0) {
      return <TrendingDownIcon className="h-3 w-3 text-red-500" />;
    }
    return null;
  };

  const getTrendColor = (trend?: number) => {
    if (trend === undefined) return "text-gray-500";
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-gray-500";
  };

  const gridCols = useMemo(() => {
    switch (columns) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-3";
      case 4:
        return "grid-cols-4";
      default:
        return "grid-cols-4";
    }
  }, [columns]);

  if (!stats || stats.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        <BarChart3Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t("tasks.statistics.noDataAvailable")}</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols} gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <div key={index} className="p-4 bg-muted/30 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {stat.icon && (
                <div
                  className={`p-1 rounded-lg ${stat.color?.replace("text", "bg")} bg-opacity-10`}
                >
                  {stat.icon}
                </div>
              )}
              <div>
                <div className="font-medium text-sm">{stat.title}</div>
                {stat.description && (
                  <div className="text-xs text-muted-foreground">
                    {stat.description}
                  </div>
                )}
              </div>
            </div>
            {stat.trend !== undefined && (
              <div className="flex items-center gap-1">
                {getTrendIcon(stat.trend)}
                <span
                  className={`text-xs font-medium ${getTrendColor(stat.trend)}`}
                >
                  {Math.abs(stat.trend).toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          <div className="flex items-end justify-between mb-2">
            <div
              className={`text-2xl font-bold ${stat.color || "text-primary"}`}
            >
              {formatValue(stat.value, stat.format)}
            </div>
            {typeof stat.value === "number" && (
              <Badge variant="outline" className="text-xs">
                {stat.format === "percentage"
                  ? "%"
                  : stat.format === "currency"
                    ? "€"
                    : "#"}
              </Badge>
            )}
          </div>

          {showProgress && typeof stat.value === "number" && (
            <div className="mt-2">
              <Progress
                value={
                  stat.progress ||
                  Math.min(100, Math.max(0, Number(stat.value)))
                }
                className="h-2"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Predefined stat configurations for common use cases
export const createTaskStats = (_statistics: _StatisticsData) => [
  {
    title: "Total Tasks",
    value: _statistics.total_tasks || 0,
    format: "number" as const,
    icon: <BarChart3Icon className="h-4 w-4" />,
    color: "text-blue-600",
    trend: 5.2,
    description: "All active tasks",
  },
  {
    title: "Completed",
    value: _statistics.completed_tasks || 0,
    format: "number" as const,
    icon: <CheckCircleIcon className="h-4 w-4" />,
    color: "text-green-600",
    trend: 8.1,
    description: "Tasks finished",
  },
  {
    title: "Completion Rate",
    value: _statistics.completion_rate || 0,
    format: "percentage" as const,
    icon: <TrendingUpIcon className="h-4 w-4" />,
    color: "text-emerald-600",
    trend: -2.3,
    description: "Success percentage",
  },
  {
    title: "Overdue",
    value: _statistics.overdue_tasks || 0,
    format: "number" as const,
    icon: <AlertTriangleIcon className="h-4 w-4" />,
    color: "text-orange-600",
    trend: -15.7,
    description: "Late tasks",
  },
];

export const createProductivityStats = (_statistics: _StatisticsData) => [
  {
    title: "Avg. Time",
    value: 24.5,
    format: "number" as const,
    icon: <ClockIcon className="h-4 w-4" />,
    color: "text-purple-600",
    trend: 3.2,
    description: "Hours per task",
  },
  {
    title: "Team Velocity",
    value: 42,
    format: "number" as const,
    icon: <UsersIcon className="h-4 w-4" />,
    color: "text-indigo-600",
    trend: 12.5,
    description: "Tasks per week",
  },
  {
    title: "Efficiency",
    value: 87.3,
    format: "percentage" as const,
    icon: <TrendingUpIcon className="h-4 w-4" />,
    color: "text-teal-600",
    trend: 4.8,
    description: "Resource usage",
  },
  {
    title: "Quality Score",
    value: 94.2,
    format: "percentage" as const,
    icon: <CheckCircleIcon className="h-4 w-4" />,
    color: "text-cyan-600",
    trend: 1.2,
    description: "Customer satisfaction",
  },
];
