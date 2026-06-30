/**
 * ReportExportButtons component
 * Export functionality for reports
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Download, FileText, Table, Database, Loader2 } from "lucide-react";
import type { ReportExecution } from "~/features/reporting/types/reporting.types";

interface ReportExportButtonsProps {
  reportId?: string;
  executionId?: string;
  loading?: boolean;
  onExport?: (format: "pdf" | "excel" | "csv" | "json") => Promise<void>;
  execution?: ReportExecution;
}

export function ReportExportButtons({
  reportId,
  executionId,
  loading,
  onExport,
  execution,
}: ReportExportButtonsProps) {
  const { t } = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState<
    "pdf" | "excel" | "csv" | "json"
  >("pdf");
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async () => {
    if (!onExport) return;

    setExportLoading(true);
    try {
      await onExport(selectedFormat);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExportLoading(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "pdf":
        return <FileText className="h-4 w-4" />;
      case "excel":
        return <Table className="h-4 w-4" />;
      case "csv":
        return <Database className="h-4 w-4" />;
      case "json":
        return <Database className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const canExport =
    !loading && (reportId || executionId) && execution?.status === "completed";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span>{t("reporting.export.title")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Export Status */}
          {execution && (
            <div className="flex items-center space-x-2">
              <Badge
                variant={
                  execution.status === "completed" ? "default" : "secondary"
                }
              >
                {t(`reporting.execution.status.${execution.status}`)}
              </Badge>
              {!canExport && (
                <span className="text-sm text-muted-foreground">
                  {t("reporting.export.notAvailable")}
                </span>
              )}
            </div>
          )}

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("reporting.export.format")}
            </label>
            <Select
              value={selectedFormat}
              onValueChange={(v) =>
                setSelectedFormat(v as typeof selectedFormat)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <div>
                      <div className="font-medium">PDF</div>
                      <div className="text-xs text-muted-foreground">
                        {t("reporting.export.formats.pdf.description")}
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center space-x-2">
                    <Table className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Excel</div>
                      <div className="text-xs text-muted-foreground">
                        {t("reporting.export.formats.excel.description")}
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4" />
                    <div>
                      <div className="font-medium">CSV</div>
                      <div className="text-xs text-muted-foreground">
                        {t("reporting.export.formats.csv.description")}
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4" />
                    <div>
                      <div className="font-medium">JSON</div>
                      <div className="text-xs text-muted-foreground">
                        {t("reporting.export.formats.json.description")}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("reporting.export.options")}
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-visualizations"
                  defaultChecked={true}
                  className="rounded"
                />
                <label htmlFor="include-visualizations" className="text-sm">
                  {t("reporting.export.options.visualizations")}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-raw-data"
                  defaultChecked={true}
                  className="rounded"
                />
                <label htmlFor="include-raw-data" className="text-sm">
                  {t("reporting.export.options.rawData")}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-metadata"
                  defaultChecked={false}
                  className="rounded"
                />
                <label htmlFor="include-metadata" className="text-sm">
                  {t("reporting.export.options.metadata")}
                </label>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={!canExport || exportLoading}
            className="w-full"
          >
            {exportLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              getFormatIcon(selectedFormat)
            )}
            {exportLoading
              ? t("reporting.export.exporting")
              : t("reporting.export.export").replace(
                  "{format}",
                  selectedFormat.toUpperCase()
                )}
          </Button>

          {/* Export Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>{t("reporting.export.info.size")}</p>
            <p>{t("reporting.export.info.time")}</p>
            {execution?.result?.metadata && (
              <p>
                {t("reporting.export.info.rows")}:{" "}
                {execution.result.metadata.total_rows.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
