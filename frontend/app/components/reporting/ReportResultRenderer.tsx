/**
 * ReportResultRenderer component
 * Renders a report's execution result as a table, chart, or KPI card
 * based on visualization.type — replaces the previous always-flatten-to-table
 * behavior in ReportViewer.tsx.
 *
 * Prefers report.config (chart_type/x_axis/y_axis/metric_field, set via
 * ReportBuilder's chart/KPI config section) when present and its referenced
 * columns actually exist in the result. Falls back to inferring from
 * result.columns' declared types for reports saved before config existed,
 * or if a configured column is missing from this particular execution.
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { useColumnLabel } from "~/features/reporting/hooks/useColumnLabel";
import { Card, CardContent } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { SimpleBarChart } from "~/features/dashboard/components/charts/SimpleBarChart";
import type {
  ReportExecutionResult,
  ReportResultColumn,
  VisualizationType,
  VisualizationConfig,
} from "~/features/reporting/types/reporting.types";

const NUMERIC_TYPES = new Set(["number", "decimal", "integer"]);

const CHART_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

interface ReportResultRendererProps {
  result: ReportExecutionResult;
  visualizationType: VisualizationType;
  config?: Record<string, unknown> | null;
}

function isNumericColumn(column: ReportResultColumn): boolean {
  return NUMERIC_TYPES.has(column.type);
}

function columnHasData(
  column: ReportResultColumn,
  data: Record<string, unknown>[]
): boolean {
  return data.some((row) => {
    const value = row[column.name];
    return value !== null && value !== undefined;
  });
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

function TableResult({ result }: { result: ReportExecutionResult }) {
  const { t } = useTranslation();
  const columnLabel = useColumnLabel();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {result.columns.map((column) => (
            <TableHead key={column.name}>{columnLabel(column)}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {result.data.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={result.columns.length || 1}
              className="text-center text-muted-foreground"
            >
              {t("reporting.visualizations.noData")}
            </TableCell>
          </TableRow>
        ) : (
          result.data.slice(0, 100).map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {result.columns.map((column) => (
                <TableCell key={column.name}>
                  {row[column.name]?.toString() ?? ""}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function findColumn(
  columns: ReportResultColumn[],
  name: string | undefined
): ReportResultColumn | undefined {
  return name ? columns.find((c) => c.name === name) : undefined;
}

function ChartResult({
  result,
  config,
}: {
  result: ReportExecutionResult;
  config?: VisualizationConfig;
}) {
  const { t } = useTranslation();
  const columnLabel = useColumnLabel();

  const configuredX = findColumn(result.columns, config?.x_axis);
  const configuredY = findColumn(result.columns, config?.y_axis);

  const xColumn =
    configuredX ?? result.columns.find((column) => !isNumericColumn(column));
  const seriesColumns = configuredY
    ? [configuredY].filter((column) => columnHasData(column, result.data))
    : result.columns
        .filter(isNumericColumn)
        .filter((column) => columnHasData(column, result.data));

  if (!xColumn || seriesColumns.length === 0 || result.data.length === 0) {
    return <EmptyState message={t("reporting.visualizations.noData")} />;
  }

  return (
    <SimpleBarChart
      data={result.data}
      xKey={xColumn.name}
      series={seriesColumns.map((column, index) => ({
        dataKey: column.name,
        color: CHART_COLORS[index % CHART_COLORS.length]!,
        label: columnLabel(column),
      }))}
    />
  );
}

function KpiResult({
  result,
  config,
}: {
  result: ReportExecutionResult;
  config?: VisualizationConfig;
}) {
  const { t } = useTranslation();
  const columnLabel = useColumnLabel();

  const metricColumn =
    findColumn(result.columns, config?.metric_field) ??
    result.columns.find(isNumericColumn);
  const value =
    metricColumn && result.data.length > 0
      ? result.data[0]![metricColumn.name]
      : undefined;

  if (!metricColumn || result.data.length === 0 || value === null || value === undefined) {
    return <EmptyState message={t("reporting.visualizations.noData")} />;
  }

  return (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="text-4xl font-bold">{String(value)}</div>
        <div className="text-muted-foreground mt-2">{columnLabel(metricColumn)}</div>
      </CardContent>
    </Card>
  );
}

export function ReportResultRenderer({
  result,
  visualizationType,
  config,
}: ReportResultRendererProps) {
  const typedConfig = config ?? undefined;

  if (visualizationType === "chart") {
    return <ChartResult result={result} config={typedConfig} />;
  }
  if (visualizationType === "kpi") {
    return <KpiResult result={result} config={typedConfig} />;
  }
  return <TableResult result={result} />;
}
