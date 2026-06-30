/**
 * Import/Export Stats
 * Component for displaying import/export statistics
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { ImportExportStats as ImportExportStatsType } from "../types/import-export.types";

export interface ImportExportStatsProps {
  stats?: ImportExportStatsType;
  mostUsedModules?: Array<{
    module: string;
    import_count: number;
    export_count: number;
  }>;
}

export function ImportExportStats({
  stats,
  mostUsedModules,
}: ImportExportStatsProps) {
  const { t } = useTranslation();

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {t("importExport.stats.noData")}
        </p>
      </div>
    );
  }

  const successRate =
    stats.total_import_jobs + stats.total_export_jobs > 0
      ? ((stats.successful_imports + stats.successful_exports) /
          (stats.total_import_jobs + stats.total_export_jobs)) *
        100
      : 0;

  return (
    <div className="space-y-6">
      {/* Success Rate */}
      <Card>
        <CardHeader>
          <CardTitle>{t("importExport.stats.successRate")}</CardTitle>
          <CardDescription>
            {t("importExport.stats.successRateDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t("importExport.stats.overall")}</span>
              <span>{successRate.toFixed(1)}%</span>
            </div>
            <Progress value={successRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Module Usage */}
      {mostUsedModules && mostUsedModules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("importExport.stats.moduleUsage")}</CardTitle>
            <CardDescription>
              {t("importExport.stats.moduleUsageDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mostUsedModules.map((module) => (
                <div
                  key={module.module}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{module.module}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {module.import_count} {t("importExport.stats.imports")},{" "}
                      {module.export_count} {t("importExport.stats.exports")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{module.import_count}</Badge>
                    <Badge variant="secondary">{module.export_count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("importExport.stats.importPerformance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">
                  {t("importExport.stats.totalJobs")}
                </span>
                <span className="font-medium">{stats.total_import_jobs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">
                  {t("importExport.stats.successful")}
                </span>
                <span className="font-medium text-green-600">
                  {stats.successful_imports}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">
                  {t("importExport.stats.failed")}
                </span>
                <span className="font-medium text-red-600">
                  {stats.failed_imports}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">
                  {t("importExport.stats.recordsProcessed")}
                </span>
                <span className="font-medium">
                  {stats.total_records_imported}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("importExport.stats.exportPerformance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">
                  {t("importExport.stats.totalJobs")}
                </span>
                <span className="font-medium">{stats.total_export_jobs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">
                  {t("importExport.stats.successful")}
                </span>
                <span className="font-medium text-green-600">
                  {stats.successful_exports}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">
                  {t("importExport.stats.failed")}
                </span>
                <span className="font-medium text-red-600">
                  {stats.failed_exports}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">
                  {t("importExport.stats.recordsProcessed")}
                </span>
                <span className="font-medium">
                  {stats.total_records_exported}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Average Processing Time */}
      <Card>
        <CardHeader>
          <CardTitle>{t("importExport.stats.performanceMetrics")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <span className="text-sm">
              {t("importExport.stats.avgProcessingTime")}
            </span>
            <Badge variant="outline">
              {stats.average_processing_time.toFixed(2)}s
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
