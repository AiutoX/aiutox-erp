/**
 * Pie Chart Component
 * Simple pie chart for displaying proportional data
 */

import { useMemo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent } from "~/components/ui/card";

interface PieChartData {
  label: string;
  value: number;
  color?: string;
  description?: string;
}

interface PieChartProps {
  data: PieChartData[];
  title?: string;
  showLabels?: boolean;
  showValues?: boolean;
  showLegend?: boolean;
  size?: number;
  className?: string;
}

export function PieChart({
  data,
  title,
  showLabels = true,
  showValues = true,
  showLegend = true,
  size = 200,
  className,
}: PieChartProps) {
  const { t } = useTranslation();

  const { processedData, total } = useMemo(() => {
    if (!data || data.length === 0) {
      return { processedData: [], total: 0 };
    }

    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -90; // Start from top

    const processed = data.map((item, index) => {
      const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      currentAngle += angle;

      return {
        ...item,
        percentage,
        startAngle,
        endAngle,
        color: item.color || getDefaultColor(index),
      };
    });

    return { processedData: processed, total: totalValue };
  }, [data]);

  const getDefaultColor = (index: number) => {
    const colors = [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#EC4899",
      "#14B8A6",
      "#F97316",
      "#6366F1",
      "#84CC16",
    ];
    return colors[index % colors.length];
  };

  const createPieSlice = (
    startAngle: number,
    endAngle: number,
    _color: string | undefined
  ) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = 50 + 50 * Math.cos(startAngleRad);
    const y1 = 50 + 50 * Math.sin(startAngleRad);
    const x2 = 50 + 50 * Math.cos(endAngleRad);
    const y2 = 50 + 50 * Math.sin(endAngleRad);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

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

  return (
    <Card className={className}>
      {title && (
        <div className="p-4 pb-0">
          <h3 className="font-medium">{title}</h3>
        </div>
      )}
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Pie Chart */}
          <div className="flex justify-center">
            <div
              className="relative"
              style={{ width: `${size}px`, height: `${size}px` }}
            >
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                style={{ transform: "rotate(-90deg)" }}
              >
                {processedData.map((slice, index) => (
                  <path
                    key={index}
                    d={createPieSlice(
                      slice.startAngle,
                      slice.endAngle,
                      slice.color || getDefaultColor(index)
                    )}
                    fill={slice.color || getDefaultColor(index)}
                    stroke="white"
                    strokeWidth="1"
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </svg>

              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {total.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          {showLegend && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {processedData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.label}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {showValues && (
                          <span>{item.value.toLocaleString()}</span>
                        )}
                        <span>({item.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional info */}
          {showLabels && processedData.some((item) => item.description) && (
            <div className="border-t pt-2">
              <div className="text-xs text-muted-foreground space-y-1">
                {processedData.map(
                  (item, index) =>
                    item.description && (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.description}</span>
                      </div>
                    )
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to create pie chart data from task statistics
export const createStatusPieData = (byStatus: Record<string, number>) => {
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

export const createPriorityPieData = (byPriority: Record<string, number>) => {
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

export const createCustomStatePieData = (
  byCustomState: Record<string, number>
) => {
  return Object.entries(byCustomState).map(([state, count]) => ({
    label: state,
    value: count,
    color: "#8B5CF6", // Default purple for custom states
  }));
};
