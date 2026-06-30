/**
 * Import/Export Dashboard
 * Main dashboard component for Import/Export module
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ImportExportStats } from "./ImportExportStats";
import { ImportExportJobs } from "./ImportExportJobs";
import { ImportExportTemplates } from "./ImportExportTemplates";
import {
  useImportExportStats,
  useImportJobs,
  useExportJobs,
} from "../hooks/useImportExport";
import {
  DownloadIcon,
  UploadIcon,
  PlugIcon,
  ShieldIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ImportJob, ExportJob } from "../types/import-export.types";

export interface ImportExportDashboardProps {
  onImportJobClick?: (job: ImportJob) => void | Promise<void>;
  onExportJobClick?: (job: ExportJob) => void | Promise<void>;
  onTemplateClick?: (templateId: string) => void | Promise<void>;
}

export function ImportExportDashboard({
  onImportJobClick,
  onExportJobClick,
  onTemplateClick,
}: ImportExportDashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  // Queries
  const { data: stats, isLoading: statsLoading } = useImportExportStats();
  const { data: importJobs, isLoading: importJobsLoading } = useImportJobs({
    page_size: 10,
  });
  const { data: exportJobs, isLoading: exportJobsLoading } = useExportJobs({
    page_size: 10,
  });

  const handleImportJobClick = (job: ImportJob | ExportJob) => {
    if (!("export_format" in job)) {
      onImportJobClick?.(job);
    }
  };

  const handleExportJobClick = (job: ImportJob | ExportJob) => {
    if ("export_format" in job) {
      onExportJobClick?.(job);
    }
  };

  const handleTemplateClick = (templateId: string) => {
    onTemplateClick?.(templateId);
  };

  if (statsLoading || importJobsLoading || exportJobsLoading) {
    return (
      <PageLayout
        title={t("importExport.title")}
        description={t("importExport.description")}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={t("importExport.title")}
      description={t("importExport.description")}
    >
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("importExport.stats.totalImports")}
              </CardTitle>
              <HugeiconsIcon icon={UploadIcon} size={16} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.data?.total_import_jobs || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("importExport.stats.successful")}:{" "}
                {stats?.data?.successful_imports || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("importExport.stats.totalExports")}
              </CardTitle>
              <HugeiconsIcon icon={DownloadIcon} size={16} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.data?.total_export_jobs || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("importExport.stats.successful")}:{" "}
                {stats?.data?.successful_exports || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("importExport.stats.totalRecords")}
              </CardTitle>
              <HugeiconsIcon icon={PlugIcon} size={16} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats?.data?.total_records_imported || 0) +
                  (stats?.data?.total_records_exported || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("importExport.stats.imported")}:{" "}
                {stats?.data?.total_records_imported || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("importExport.stats.avgProcessingTime")}
              </CardTitle>
              <HugeiconsIcon icon={ShieldIcon} size={16} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.data?.average_processing_time
                  ? `${stats.data.average_processing_time.toFixed(1)}s`
                  : "0s"}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("importExport.stats.perOperation")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              {t("importExport.tabs.overview")}
            </TabsTrigger>
            <TabsTrigger value="imports">
              {t("importExport.tabs.imports")}
            </TabsTrigger>
            <TabsTrigger value="exports">
              {t("importExport.tabs.exports")}
            </TabsTrigger>
            <TabsTrigger value="templates">
              {t("importExport.tabs.templates")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <ImportExportStats
              stats={stats?.data}
              mostUsedModules={stats?.data?.most_used_modules}
            />
          </TabsContent>

          <TabsContent value="imports" className="space-y-6">
            <ImportExportJobs
              type="import"
              jobs={importJobs?.data || []}
              loading={importJobsLoading}
              onJobClick={handleImportJobClick}
            />
          </TabsContent>

          <TabsContent value="exports" className="space-y-6">
            <ImportExportJobs
              type="export"
              jobs={exportJobs?.data || []}
              loading={exportJobsLoading}
              onJobClick={handleExportJobClick}
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <ImportExportTemplates onTemplateClick={handleTemplateClick} />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
