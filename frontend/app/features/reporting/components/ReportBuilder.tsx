/**
 * ReportBuilder component
 * Form for creating and editing reports
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useColumnLabel } from "~/features/reporting/hooks/useColumnLabel";
import { getDataSourceLabel } from "~/features/reporting/utils/dataSourceLabels";
import { useDataSourceColumns } from "~/features/reporting/hooks/useReporting";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import type {
  Report,
  ReportCreate,
  ReportUpdate,
  DataSource,
  VisualizationType,
  ChartType,
  VisualizationConfig,
} from "~/features/reporting/types/reporting.types";

interface ReportBuilderProps {
  report?: Report;
  dataSources: DataSource[];
  onSubmit: (data: ReportCreate | ReportUpdate) => void;
  onCancel?: () => void;
  loading?: boolean;
}

const VISUALIZATION_TYPES: VisualizationType[] = ["table", "chart", "kpi"];
const CHART_TYPES: ChartType[] = ["bar", "line", "pie"];
const NUMERIC_FIELD_TYPES = new Set(["number", "decimal", "integer"]);

export function ReportBuilder({
  report,
  dataSources,
  onSubmit,
  onCancel,
  loading = false,
}: ReportBuilderProps) {
  const { t } = useTranslation();
  const columnLabel = useColumnLabel();

  const [name, setName] = useState(report?.name ?? "");
  const [description, setDescription] = useState(report?.description ?? "");
  const [dataSourceType, setDataSourceType] = useState(
    report?.data_source_type ?? dataSources[0]?.type ?? ""
  );
  const [visualizationType, setVisualizationType] = useState<VisualizationType>(
    report?.visualization_type ?? "table"
  );
  const existingConfig = (report?.config ?? {}) as VisualizationConfig;
  const [chartType, setChartType] = useState<ChartType>(
    existingConfig.chart_type ?? "bar"
  );
  const [xAxis, setXAxis] = useState(existingConfig.x_axis ?? "");
  const [yAxis, setYAxis] = useState(existingConfig.y_axis ?? "");
  const [metricField, setMetricField] = useState(existingConfig.metric_field ?? "");

  const { data: columnsData } = useDataSourceColumns(dataSourceType);
  const columns = columnsData?.data ?? [];
  const numericColumns = columns.filter((c) => NUMERIC_FIELD_TYPES.has(c.type));

  const buildConfig = (): Record<string, unknown> | undefined => {
    if (visualizationType === "chart") {
      const config: VisualizationConfig = {
        chart_type: chartType,
        x_axis: xAxis || undefined,
        y_axis: yAxis || undefined,
      };
      return config;
    }
    if (visualizationType === "kpi") {
      const config: VisualizationConfig | undefined = metricField
        ? { metric_field: metricField }
        : undefined;
      return config;
    }
    return undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (report) {
      const payload: ReportUpdate = {
        name,
        description: description || undefined,
        config: buildConfig(),
      };
      onSubmit(payload);
      return;
    }

    const payload: ReportCreate = {
      name,
      description: description || undefined,
      data_source_type: dataSourceType,
      visualization_type: visualizationType,
      config: buildConfig(),
    };
    onSubmit(payload);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {report
              ? t("reporting.builder.edit")
              : t("reporting.builder.create")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("reporting.fields.name")}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("reporting.builder.name.placeholder")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_source">
                  {t("reporting.fields.dataSource")}
                </Label>
                <Select
                  value={dataSourceType}
                  onValueChange={setDataSourceType}
                  disabled={!!report}
                >
                  <SelectTrigger id="data_source">
                    <SelectValue
                      placeholder={t(
                        "reporting.builder.dataSource.placeholder"
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {dataSources.map((ds) => (
                      <SelectItem key={ds.type} value={ds.type}>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {getDataSourceLabel(ds.type, t)}
                          </span>
                          {ds.module && (
                            <Badge variant="outline" className="text-xs">
                              {ds.module}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {t("reporting.fields.description")}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("reporting.builder.description.placeholder")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visualization_type">
                {t("reporting.builder.visualizations.title")}
              </Label>
              <Select
                value={visualizationType}
                onValueChange={(value: VisualizationType) =>
                  setVisualizationType(value)
                }
                disabled={!!report}
              >
                <SelectTrigger id="visualization_type" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISUALIZATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`reporting.visualizations.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {visualizationType === "chart" && (
              <div className="space-y-4 rounded-md border p-4">
                <Label>{t("reporting.builder.chartConfig.title")}</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chart_type">
                      {t("reporting.builder.chartConfig.chartType")}
                    </Label>
                    <Select
                      value={chartType}
                      onValueChange={(value: ChartType) => setChartType(value)}
                    >
                      <SelectTrigger id="chart_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHART_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(`reporting.builder.chartConfig.chartTypes.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="x_axis">
                      {t("reporting.builder.chartConfig.xAxis")}
                    </Label>
                    <Select value={xAxis} onValueChange={setXAxis}>
                      <SelectTrigger id="x_axis">
                        <SelectValue
                          placeholder={t(
                            "reporting.builder.chartConfig.selectField"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((column) => (
                          <SelectItem key={column.name} value={column.name}>
                            {columnLabel(column)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="y_axis">
                      {t("reporting.builder.chartConfig.yAxis")}
                    </Label>
                    <Select value={yAxis} onValueChange={setYAxis}>
                      <SelectTrigger id="y_axis">
                        <SelectValue
                          placeholder={t(
                            "reporting.builder.chartConfig.selectField"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {numericColumns.map((column) => (
                          <SelectItem key={column.name} value={column.name}>
                            {columnLabel(column)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {visualizationType === "kpi" && (
              <div className="space-y-4 rounded-md border p-4">
                <Label>{t("reporting.builder.kpiConfig.title")}</Label>
                <div className="space-y-2">
                  <Label htmlFor="metric_field">
                    {t("reporting.builder.kpiConfig.metricField")}
                  </Label>
                  <Select value={metricField} onValueChange={setMetricField}>
                    <SelectTrigger id="metric_field" className="w-64">
                      <SelectValue
                        placeholder={t(
                          "reporting.builder.chartConfig.selectField"
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {numericColumns.map((column) => (
                        <SelectItem key={column.name} value={column.name}>
                          {columnLabel(column)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  {t("common.cancel")}
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
