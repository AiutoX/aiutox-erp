/**
 * Bar Chart Component
 * Simple bar chart for displaying categorical data
 */

import { useMemo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

interface BarChartData {
  label: string;
  value: number;
  color?: string;
  description?: string;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  orientation?: "horizontal" | "vertical";
  showValues?: boolean;
  showLabels?: boolean;
  maxHeight?: number;
  className?: string;
}

export function BarChart({
  data,
  title,
  orientation = "vertical",
  showValues = true,
  showLabels = true,
  maxHeight = 200,
  className,
}: BarChartProps) {
  const { t } = useTranslation();

  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    const max = Math.max(...data.map((d) => d.value));
    return data.map((item) => ({
      ...item,
      percentage: max > 0 ? (item.value / max) * 100 : 0,
      color: item.color || "#3B82F6",
    }));
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <div className="h-32 flex items-center justify-center">
              {t("tasks.statistics.noDataAvailable")}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orientation === "horizontal") {
    return (
      <Card className={className}>
        {title && (
          <div className="p-4 pb-0">
            <h3 className="font-medium">{title}</h3>
          </div>
        )}
        <CardContent className="p-4">
          <div className="space-y-3">
            {processedData.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  {showLabels && (
                    <span className="text-sm font-medium truncate flex-1">
                      {item.label}
                    </span>
                  )}
                  {showValues && (
                    <Badge variant="secondary" className="ml-2">
                      {item.value.toLocaleString()}
                    </Badge>
                  )}
                </div>
                <div className="relative">
                  <div
                    className="h-6 bg-muted rounded-md overflow-hidden"
                    style={{ width: "100%" }}
                  >
                    <div
                      className="h-full rounded-md transition-all duration-500 ease-out"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  {item.description && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {item.description}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {title && (
        <div className="p-4 pb-0">
          <h3 className="font-medium">{title}</h3>
        </div>
      )}
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Chart */}
          <div
            className="flex items-end justify-center gap-2"
            style={{ height: `${maxHeight}px` }}
          >
            {processedData.map((item, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                {showValues && (
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {item.value.toLocaleString()}
                  </Badge>
                )}
                <div
                  className="w-full rounded-t-md transition-all duration-500 ease-out"
                  style={{
                    height: `${(item.percentage / 100) * maxHeight}px`,
                    backgroundColor: item.color,
                    minHeight: "4px",
                  }}
                />
                {showLabels && (
                  <span className="text-xs text-muted-foreground mt-2 text-center truncate w-full">
                    {item.label}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 justify-center">
            {processedData.map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to create bar chart data from task statistics
export const createStatusBarData = (byStatus: Record<string, number>) => {
  const colors: Record<string, string> = {
    todo: "#6B7280",
    in_progress: "#3B82F6",
    done: "#10B981",
    cancelled: "#EF4444",
  };

  return Object.entries(byStatus).map(([status, count]) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1).replace("_", " "),
    value: count,
    color: colors[status] || "#6B7280",
  }));
};

export const createPriorityBarData = (byPriority: Record<string, number>) => {
  const colors: Record<string, string> = {
    urgent: "#DC2626",
    high: "#F97316",
    medium: "#EAB308",
    low: "#10B981",
  };

  return Object.entries(byPriority).map(([priority, count]) => ({
    label: priority.charAt(0).toUpperCase() + priority.slice(1),
    value: count,
    color: colors[priority] || "#6B7280",
  }));
};

export const createCustomStateBarData = (
  byCustomState: Record<string, number>
) => {
  return Object.entries(byCustomState).map(([state, count]) => ({
    label: state,
    value: count,
    color: "#8B5CF6", // Default purple for custom states
  }));
};
