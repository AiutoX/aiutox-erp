/**
 * ReportViewer component
 * Displays report execution results with visualizations
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Play,
  Download,
  RefreshCw,
  Settings,
  BarChart3,
  Table as TableIcon,
  TrendingUp,
} from "lucide-react";
import type {
  Report,
  ReportExecution,
  ReportResult,
  ParameterValues,
  ParameterValue,
  ParameterDefinition,
  ReportVisualization,
  ChartConfig,
  MetricsConfig,
} from "~/features/reporting/types/reporting.types";

interface ReportViewerProps {
  report: Report;
  execution?: ReportExecution;
  result?: ReportResult;
  loading?: boolean;
  onExecute?: (parameters: ParameterValues) => void;
  onExport?: (format: "pdf" | "excel" | "csv" | "json") => void;
  onRefresh?: () => void;
}

export function ReportViewer({
  report,
  execution,
  result,
  loading,
  onExecute,
  onExport,
  onRefresh,
}: ReportViewerProps) {
  const { t } = useTranslation();
  const [parameters, setParameters] = useState<ParameterValues>({});
  const [selectedFormat, setSelectedFormat] = useState<
    "pdf" | "excel" | "csv" | "json"
  >("pdf");

  const handleParameterChange = (paramName: string, value: ParameterValue) => {
    setParameters((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleExecute = () => {
    onExecute?.(parameters);
  };

  const handleExport = () => {
    onExport?.(selectedFormat);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      pending: "secondary",
      running: "default",
      completed: "default",
      failed: "destructive",
      cancelled: "outline",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {t(`reporting.execution.status.${status}`)}
      </Badge>
    );
  };

  const renderParameterInput = (
    paramName: string,
    paramDef: ParameterDefinition
  ) => {
    const value = parameters[paramName] || paramDef.default;

    switch (paramDef.type) {
      case "string":
        return (
          <Input
            value={(value as string) || ""}
            onChange={(e) => handleParameterChange(paramName, e.target.value)}
            placeholder={paramDef.validation?.message}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) =>
              handleParameterChange(paramName, Number(e.target.value))
            }
            min={paramDef.validation?.min}
            max={paramDef.validation?.max}
          />
        );

      case "boolean":
        return (
          <Select
            value={value?.toString() || "false"}
            onValueChange={(val) =>
              handleParameterChange(paramName, val === "true")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t("common.yes")}</SelectItem>
              <SelectItem value="false">{t("common.no")}</SelectItem>
            </SelectContent>
          </Select>
        );

      case "date":
        return (
          <Input
            type="date"
            value={
              value
                ? new Date(value as string | number | Date)
                    .toISOString()
                    .split("T")[0]
                : ""
            }
            onChange={(e) => handleParameterChange(paramName, e.target.value)}
          />
        );

      case "date_range": {
        const dateRange = (value as [Date, Date]) || [];
        return (
          <div className="flex space-x-2">
            <Input
              type="date"
              value={
                dateRange[0]
                  ? new Date(dateRange[0]).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => {
                const start = new Date(e.target.value);
                const end = dateRange[1] || start;
                handleParameterChange(paramName, [start, end]);
              }}
            />
            <Input
              type="date"
              value={
                dateRange[1]
                  ? new Date(dateRange[1]).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => {
                const end = new Date(e.target.value);
                const start = dateRange[0] || end;
                handleParameterChange(paramName, [start, end]);
              }}
            />
          </div>
        );
      }

      case "select":
        return (
          <Select
            value={(value as string) || ""}
            onValueChange={(val) => handleParameterChange(paramName, val)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t("reporting.parameters.select.placeholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {paramDef.options?.map((option) => (
                <SelectItem
                  key={option.value?.toString()}
                  value={option.value?.toString() || ""}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            value={(value as string) || ""}
            onChange={(e) => handleParameterChange(paramName, e.target.value)}
          />
        );
    }
  };

  const renderVisualization = (viz: ReportVisualization, index: number) => {
    const vizData = result?.visualizations[index]?.data;

    switch (viz.type) {
      case "table":
        return (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TableIcon className="h-5 w-5" />
                <span>{viz.title || t("reporting.visualizations.table")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vizData && Array.isArray(vizData) && vizData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(vizData[0]).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(vizData as Record<string, unknown>[])
                      .slice(0, 100)
                      .map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {Object.values(row).map((value, colIndex) => (
                            <TableCell key={colIndex}>
                              {value?.toString() || ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t("reporting.visualizations.noData")}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "chart":
        return (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>{viz.title || t("reporting.visualizations.chart")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border rounded-md bg-muted/20">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {t("reporting.visualizations.chart.placeholder")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(viz.config as ChartConfig)?.chart_type} chart
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "metrics":
        return (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>
                  {viz.title || t("reporting.visualizations.metrics")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(viz.config as MetricsConfig)?.metrics?.map(
                  (metric, metricIndex) => (
                    <div
                      key={metricIndex}
                      className="text-center p-4 border rounded-md"
                    >
                      <div className="text-2xl font-bold text-primary">
                        {(vizData as Record<string, unknown>)?.[
                          metric.value
                        ]?.toString() || "0"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {metric.label}
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card key={index}>
            <CardContent className="p-8">
              <div className="text-center text-muted-foreground">
                {t("reporting.visualizations.unknown")}
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{report.name}</h2>
          <p className="text-muted-foreground">{report.description}</p>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant="outline">{report.module}</Badge>
            <Badge variant="outline">{report.data_source}</Badge>
            {execution && getStatusBadge(execution.status)}
          </div>
        </div>
        <div className="flex space-x-2">
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh} disabled={loading}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              {t("common.refresh")}
            </Button>
          )}
          {onExport && (
            <div className="flex space-x-2">
              <Select
                value={selectedFormat}
                onValueChange={(v) =>
                  setSelectedFormat(v as typeof selectedFormat)
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                {t("common.export")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Parameters */}
      {Object.keys(report.parameters).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>{t("reporting.parameters.title")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(report.parameters).map(
                ([paramName, paramDef]) => (
                  <div key={paramName} className="space-y-2">
                    <Label className="flex items-center space-x-1">
                      <span>{paramName}</span>
                      {paramDef.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </Label>
                    {renderParameterInput(paramName, paramDef)}
                  </div>
                )
              )}
            </div>
            <div className="mt-4">
              <Button onClick={handleExecute} disabled={loading}>
                <Play className="h-4 w-4 mr-2" />
                {loading
                  ? t("reporting.execution.running")
                  : t("reporting.execution.execute")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Execution Status */}
      {execution && (
        <Card>
          <CardHeader>
            <CardTitle>{t("reporting.execution.status.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  {t("reporting.execution.status")}
                </div>
                <div>{getStatusBadge(execution.status)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  {t("reporting.execution.createdAt")}
                </div>
                <div>{new Date(execution.created_at).toLocaleString()}</div>
              </div>
              {execution.completed_at && (
                <div>
                  <div className="text-sm text-muted-foreground">
                    {t("reporting.execution.completedAt")}
                  </div>
                  <div>{new Date(execution.completed_at).toLocaleString()}</div>
                </div>
              )}
              {result?.metadata && (
                <div>
                  <div className="text-sm text-muted-foreground">
                    {t("reporting.execution.rows")}
                  </div>
                  <div>{result.metadata.total_rows.toLocaleString()}</div>
                </div>
              )}
            </div>
            {execution.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm text-red-800">{execution.error}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Visualizations */}
      {result && result.visualizations.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">
            {t("reporting.visualizations.title")}
          </h3>
          {result.visualizations.map((_, index) => {
            const viz = report.visualizations[index];
            return viz ? renderVisualization(viz, index) : null;
          })}
        </div>
      )}

      {/* No Results */}
      {!result && !loading && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">
                {t("reporting.noResults.title")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("reporting.noResults.description")}
              </p>
              {Object.keys(report.parameters).length === 0 && onExecute && (
                <Button onClick={handleExecute}>
                  <Play className="h-4 w-4 mr-2" />
                  {t("reporting.execution.execute")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
