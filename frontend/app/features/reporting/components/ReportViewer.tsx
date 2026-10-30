/**
 * ReportViewer component
 * Displays report execution results
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Play, RefreshCw, BarChart3, AlertTriangle } from "lucide-react";
import { ReportResultRenderer } from "~/components/reporting/ReportResultRenderer";
import { getDataSourceLabel } from "~/features/reporting/utils/dataSourceLabels";
import type {
  Report,
  ReportExecutionResult,
} from "~/features/reporting/types/reporting.types";

interface ReportViewerProps {
  report: Report;
  result?: ReportExecutionResult;
  loading?: boolean;
  /** True when the most recent execution attempt failed — distinguishes a
   * genuinely empty result from a failed one (UX-004b), which otherwise
   * both render as the same "no results" empty state. */
  isError?: boolean;
  onExecute?: () => void;
  onRefresh?: () => void;
}

export function ReportViewer({
  report,
  result,
  loading,
  isError,
  onExecute,
  onRefresh,
}: ReportViewerProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{report.name}</h2>
          <p className="text-muted-foreground">{report.description}</p>
          <div className="flex items-center space-x-2 mt-2">
            <Badge variant="outline">
              {getDataSourceLabel(report.data_source_type, t)}
            </Badge>
            <Badge variant="outline">
              {t(`reporting.visualizations.${report.visualization_type}`)}
            </Badge>
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
          {onExecute && (
            <Button onClick={onExecute} disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              {loading
                ? t("reporting.execution.running")
                : t("reporting.execution.execute")}
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{t("reporting.execution.rows")}: {result.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportResultRenderer
              result={result}
              visualizationType={report.visualization_type}
              config={report.config}
            />
          </CardContent>
        </Card>
      )}

      {/* Execution Failed */}
      {!result && !loading && isError && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h3 className="text-lg font-medium mb-2">
                {t("reporting.execution.error.title")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("reporting.execution.error.description")}
              </p>
              {onExecute && (
                <Button onClick={onExecute}>
                  <Play className="h-4 w-4 mr-2" />
                  {t("reporting.execution.execute")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {!result && !loading && !isError && (
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
              {onExecute && (
                <Button onClick={onExecute}>
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
