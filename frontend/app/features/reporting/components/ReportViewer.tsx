/**
 * ReportViewer component
 * Displays report execution results
 */

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
import { Play, RefreshCw, BarChart3 } from "lucide-react";
import type {
  Report,
  ReportExecutionResult,
} from "~/features/reporting/types/reporting.types";

interface ReportViewerProps {
  report: Report;
  result?: ReportExecutionResult;
  loading?: boolean;
  onExecute?: () => void;
  onRefresh?: () => void;
}

export function ReportViewer({
  report,
  result,
  loading,
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
            <Badge variant="outline">{report.data_source_type}</Badge>
            <Badge variant="outline" className="capitalize">
              {report.visualization_type}
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
      {result && result.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("reporting.execution.rows")}: {result.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(result.data[0] ?? {}).map((key) => (
                    <TableHead key={key}>{key}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.slice(0, 100).map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {Object.values(row).map((value, colIndex) => (
                      <TableCell key={colIndex}>
                        {value?.toString() ?? ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {(!result || result.data.length === 0) && !loading && (
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
