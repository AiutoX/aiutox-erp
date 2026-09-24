/**
 * SimpleDonutChart — thin Recharts wrapper
 * Supports optional per-entry color; falls back to COLORS palette.
 * Legend is omitted — callers render their own.
 */

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

interface DonutEntry {
  name: string;
  value: number;
  /** Optional per-entry fill color */
  color?: string;
}

interface SimpleDonutChartProps {
  data: DonutEntry[];
  height?: number;
}

export function SimpleDonutChart({
  data,
  height = 240,
}: SimpleDonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.color ?? COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={((value: unknown, name: unknown) => [value, name]) as any}
          contentStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
