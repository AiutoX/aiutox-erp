/**
 * Line Chart Component
 * Simple line chart for displaying trends over time
 */

import { useMemo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

interface LineChartData {
  label: string;
  value: number;
  date?: string;
}

interface LineChartProps {
  data: LineChartData[];
  title?: string;
  color?: string;
  showPoints?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  height?: number;
  className?: string;
}

export function LineChart({
  data,
  title,
  color = "#3B82F6",
  showPoints = true,
  showGrid = true,
  showLabels = true,
  height = 200,
  className,
}: LineChartProps) {
  const { t } = useTranslation();

  const { processedData, maxValue, minValue } = useMemo(() => {
    if (!data || data.length === 0) {
      return { processedData: [], maxValue: 0, minValue: 0 };
    }

    const values = data.map((d) => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    const processed = data.map((item, index) => ({
      ...item,
      normalizedValue: ((item.value - min) / range) * 100,
      xPosition: data.length > 1 ? (index / (data.length - 1)) * 100 : 50,
    }));

    return { processedData: processed, maxValue: max, minValue: min };
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      month: "short",
      day: "numeric",
    });
  };

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
          <div className="relative" style={{ height: `${height}px` }}>
            {/* Grid lines */}
            {showGrid && (
              <div className="absolute inset-0">
                {[0, 25, 50, 75, 100].map((percent) => (
                  <div
                    key={percent}
                    className="absolute w-full border-t border-muted"
                    style={{ top: `${percent}%` }}
                  />
                ))}
              </div>
            )}

            {/* Line */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Draw the line path */}
              <path
                d={`M ${processedData.map((d) => `${d.xPosition},${100 - d.normalizedValue}`).join(" L ")}`}
                fill="none"
                stroke={color}
                strokeWidth="2"
                className="transition-all duration-500"
              />

              {/* Fill area under the line */}
              <path
                d={`M ${processedData.map((d) => `${d.xPosition},${100 - d.normalizedValue}`).join(" L ")} L ${processedData[processedData.length - 1]?.xPosition || 0},100 L ${processedData[0]?.xPosition || 0},100 Z`}
                fill={color}
                fillOpacity="0.1"
                className="transition-all duration-500"
              />
            </svg>

            {/* Data points */}
            {showPoints &&
              processedData.map((point, index) => (
                <div
                  key={index}
                  className="absolute w-3 h-3 rounded-full border-2 border-background"
                  style={{
                    left: `${point.xPosition}%`,
                    top: `${100 - point.normalizedValue}%`,
                    backgroundColor: color,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {showLabels && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-medium">
                      {point.value.toLocaleString()}
                    </div>
                  )}
                </div>
              ))}

            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground -ml-8">
              <span>{maxValue.toLocaleString()}</span>
              <span>
                {Math.round((maxValue + minValue) / 2).toLocaleString()}
              </span>
              <span>{minValue.toLocaleString()}</span>
            </div>
          </div>

          {/* X-axis labels */}
          {showLabels && (
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              {processedData.map((point, index) => (
                <span key={index} className="text-center">
                  {point.date ? formatDate(point.date) : point.label}
                </span>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-muted-foreground">
              {title || "Trend"}
            </span>
            <Badge variant="outline" className="ml-2 text-xs">
              {data.length} points
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to create line chart data from trend data
export const createTrendLineData = (
  trends: Array<{ period: string; created: number; completed: number }>
) => {
  return trends.map((trend) => ({
    label: trend.period,
    value: trend.created,
    date: trend.period,
  }));
};

export const createCompletionLineData = (
  trends: Array<{ period: string; created: number; completed: number }>
) => {
  return trends.map((trend) => ({
    label: trend.period,
    value: trend.completed,
    date: trend.period,
  }));
};

export const createCombinedTrendData = (
  trends: Array<{ period: string; created: number; completed: number }>
) => {
  return [
    {
      data: createTrendLineData(trends),
      color: "#3B82F6",
      title: "Tasks Created",
    },
    {
      data: createCompletionLineData(trends),
      color: "#10B981",
      title: "Tasks Completed",
    },
  ];
};
