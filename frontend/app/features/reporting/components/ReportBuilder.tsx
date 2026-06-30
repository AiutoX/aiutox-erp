/**
 * ReportBuilder component
 * Form for creating and editing reports
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
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
import { Switch } from "~/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Plus, Trash2, Settings, BarChart3, Table } from "lucide-react";
import type {
  Report,
  ReportCreate,
  ReportUpdate,
  DataSource,
  ReportVisualization,
  VisualizationType,
  ChartConfig,
  ChartType,
  ParameterType,
  ParameterDefinition,
  AggregationType,
  ReportQuery,
} from "~/features/reporting/types/reporting.types";

interface ReportBuilderProps {
  report?: Report;
  dataSources: DataSource[];
  onSubmit: (data: ReportCreate | ReportUpdate) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function ReportBuilder({
  report,
  dataSources,
  onSubmit,
  onCancel,
  loading = false,
}: ReportBuilderProps) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<ReportCreate | ReportUpdate>({
    name: report?.name || "",
    description: report?.description || "",
    module: report?.module || dataSources[0]?.module || "",
    data_source: report?.data_source || dataSources[0]?.name || "",
    query: report?.query || {
      filters: {},
      group_by: [],
      aggregations: {},
      order_by: [],
    },
    visualizations: report?.visualizations || [],
    parameters: report?.parameters || {},
    is_active: report?.is_active ?? true,
  });

  const [selectedDataSource, setSelectedDataSource] =
    useState<DataSource | null>(
      report
        ? dataSources.find((ds) => ds.name === report.data_source) ||
            dataSources[0] ||
            null
        : dataSources[0] || null
    );

  const [newVisualization, setNewVisualization] = useState<
    Partial<ReportVisualization>
  >({
    type: "table",
    config: { columns: [] },
  });

  const [newParameter, setNewParameter] = useState<
    Partial<ParameterDefinition> & { name?: string }
  >({
    type: "string",
    required: false,
    name: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleFieldChange = (
    field: keyof (ReportCreate | ReportUpdate),
    value: string | number | boolean | string[] | null | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleQueryChange = (queryUpdate: Partial<ReportQuery>) => {
    setFormData((prev) => ({
      ...prev,
      query: {
        ...prev.query,
        ...queryUpdate,
      },
    }));
  };

  const handleDataSourceChange = (dataSourceName: string) => {
    const ds = dataSources.find((d) => d.name === dataSourceName);
    setSelectedDataSource(ds || null);
    // Update form data differently for create vs update
    if (report) {
      // For update, we can't change data_source or module
      return;
    }
    // For create, set both data_source and module
    setFormData(
      (prev) =>
        ({
          ...prev,
          data_source: dataSourceName,
          module: ds?.module || "",
        })
    );
  };

  const addVisualization = () => {
    if (newVisualization.type && newVisualization.config) {
      setFormData((prev) => ({
        ...prev,
        visualizations: [
          ...(prev.visualizations || []),
          newVisualization as ReportVisualization,
        ],
      }));
      setNewVisualization({ type: "table", config: { columns: [] } });
    }
  };

  const removeVisualization = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      visualizations: prev.visualizations?.filter((_, i) => i !== index) || [],
    }));
  };

  const addParameter = () => {
    if (newParameter.type && newParameter.name) {
      const paramName = newParameter.name;
      const paramDef: ParameterDefinition = {
        type: newParameter.type,
        required: newParameter.required ?? false,
        default: newParameter.default,
        options: newParameter.options,
        validation: newParameter.validation,
      };
      setFormData((prev) => ({
        ...prev,
        parameters: {
          ...prev.parameters,
          [paramName]: paramDef,
        },
      }));
      setNewParameter({ type: "string", required: false, name: "" });
    }
  };

  const removeParameter = (paramName: string) => {
    const newParams = { ...formData.parameters };
    delete newParams[paramName];
    setFormData((prev) => ({
      ...prev,
      parameters: newParams,
    }));
  };

  const getVisualizationIcon = (type: VisualizationType) => {
    switch (type) {
      case "table":
        return <Table className="h-4 w-4" />;
      case "chart":
        return <BarChart3 className="h-4 w-4" />;
      case "metrics":
        return <Settings className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getChartTypes = (): ChartType[] => {
    return ["bar", "line", "pie", "area", "scatter", "donut"];
  };

  const getParameterTypes = (): ParameterType[] => {
    return [
      "string",
      "number",
      "boolean",
      "date",
      "date_range",
      "select",
      "multiselect",
    ];
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
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("reporting.fields.name")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    placeholder={t("reporting.builder.name.placeholder")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_source">
                    {t("reporting.fields.dataSource")}
                  </Label>
                  <Select
                    value={
                      report
                        ? report.data_source
                        : (formData as ReportCreate).data_source
                    }
                    onValueChange={handleDataSourceChange}
                    disabled={!!report}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          "reporting.builder.dataSource.placeholder"
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {dataSources.map((ds) => (
                        <SelectItem key={ds.name} value={ds.name}>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{ds.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {ds.module}
                            </Badge>
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
                  value={formData.description}
                  onChange={(e) =>
                    handleFieldChange("description", e.target.value)
                  }
                  placeholder={t("reporting.builder.description.placeholder")}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    handleFieldChange("is_active", checked)
                  }
                />
                <Label htmlFor="is_active">
                  {t("reporting.fields.active")}
                </Label>
              </div>
            </div>

            {/* Query Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {t("reporting.builder.query.title")}
              </h3>

              {selectedDataSource && (
                <div className="space-y-2">
                  <Label>{t("reporting.builder.query.availableFields")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedDataSource.fields.map((field) => (
                      <Badge
                        key={field.name}
                        variant="outline"
                        className="text-xs"
                      >
                        {field.name} ({field.type})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("reporting.builder.query.groupBy")}</Label>
                  <Input
                    placeholder={t(
                      "reporting.builder.query.groupBy.placeholder"
                    )}
                    value={formData.query?.group_by?.join(", ") || ""}
                    onChange={(e) =>
                      handleQueryChange({
                        group_by: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("reporting.builder.query.aggregations")}</Label>
                  <Input
                    placeholder={t(
                      "reporting.builder.query.aggregations.placeholder"
                    )}
                    value={
                      Object.entries(formData.query?.aggregations || {})
                        .map(([field, agg]) => `${field}: ${agg}`)
                        .join(", ") || ""
                    }
                    onChange={(e) => {
                      const pairs = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const aggregations: Record<string, AggregationType> = {};
                      pairs.forEach((pair) => {
                        const [field, agg] = pair
                          .split(":")
                          .map((s) => s.trim());
                        if (field && agg)
                          aggregations[field] = agg as AggregationType;
                      });
                      handleQueryChange({
                        ...formData.query,
                        aggregations: aggregations,
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Visualizations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {t("reporting.builder.visualizations.title")}
              </h3>

              <div className="space-y-2">
                <Label>{t("reporting.builder.visualizations.add")}</Label>
                <div className="flex space-x-2">
                  <Select
                    value={newVisualization.type}
                    onValueChange={(value: VisualizationType) =>
                      setNewVisualization((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">
                        {t("reporting.visualizations.table")}
                      </SelectItem>
                      <SelectItem value="chart">
                        {t("reporting.visualizations.chart")}
                      </SelectItem>
                      <SelectItem value="metrics">
                        {t("reporting.visualizations.metrics")}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {newVisualization.type === "chart" && (
                    <Select
                      value={
                        (newVisualization.config as ChartConfig)?.chart_type ||
                        "bar"
                      }
                      onValueChange={(value: ChartType) =>
                        setNewVisualization((prev) => ({
                          ...prev,
                          config: { ...prev.config, chart_type: value },
                        }))
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getChartTypes().map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(`reporting.charts.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button type="button" onClick={addVisualization}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("common.add")}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {formData.visualizations?.map((viz, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex items-center space-x-2">
                      {getVisualizationIcon(viz.type)}
                      <span className="font-medium capitalize">{viz.type}</span>
                      {viz.type === "chart" && (
                        <Badge variant="outline">
                          {(viz.config as ChartConfig)?.chart_type || "bar"}
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVisualization(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Parameters */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {t("reporting.builder.parameters.title")}
              </h3>

              <div className="space-y-2">
                <Label>{t("reporting.builder.parameters.add")}</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder={t("reporting.builder.parameters.name")}
                    value={newParameter.name || ""}
                    onChange={(e) =>
                      setNewParameter((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-32"
                  />
                  <Select
                    value={newParameter.type}
                    onValueChange={(value: ParameterType) =>
                      setNewParameter((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getParameterTypes().map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`reporting.parameters.types.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Switch
                    checked={newParameter.required}
                    onCheckedChange={(checked) =>
                      setNewParameter((prev) => ({
                        ...prev,
                        required: checked,
                      }))
                    }
                  />
                  <Label className="text-sm">
                    {t("reporting.builder.parameters.required")}
                  </Label>
                  <Button type="button" onClick={addParameter}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("common.add")}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(formData.parameters || {}).map(
                  ([name, param]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{name}</span>
                        <Badge variant="outline">{param.type}</Badge>
                        {param.required && (
                          <Badge variant="destructive">
                            {t("reporting.builder.parameters.required")}
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParameter(name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Actions */}
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
