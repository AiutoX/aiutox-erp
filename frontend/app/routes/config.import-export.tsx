/**
 * Import/Export Configuration Page
 *
 * Manage data import/export jobs, templates, and history
 * Uses ConfigPageLayout and shared components for visual consistency
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ConfigPageLayout } from "~/components/config/ConfigPageLayout";
import { ConfigFormField } from "~/components/config/ConfigFormField";
import { ConfigSection } from "~/components/config/ConfigSection";
import { ConfigEmptyState } from "~/components/config/ConfigEmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { DataTable, type DataTableColumn } from "~/components/common/DataTable";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { showToast } from "~/components/common/Toast";
import { DownloadIcon, UploadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface ImportExportJob {
  id: string;
  type: "import" | "export";
  module: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  file_name?: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export function meta() {
  return [
    { title: "Importar/Exportar - AiutoX ERP" },
    { name: "description", content: "Importa y exporta datos en masa" },
  ];
}

export default function ImportExportConfigPage() {
  const { t } = useTranslation();
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "json">(
    "csv"
  );
  const [jobs] = useState<ImportExportJob[]>([]); // TODO: Fetch from API

  const modules = [
    { id: "users", name: t("config.importExport.moduleUsers") },
    { id: "products", name: t("config.importExport.moduleProducts") },
    { id: "orders", name: t("config.importExport.moduleOrders") },
    { id: "customers", name: t("config.importExport.moduleCustomers") },
  ];

  const jobColumns: DataTableColumn<ImportExportJob>[] = [
    {
      key: "type",
      header: t("config.importExport.type"),
      cell: (job) => (
        <div className="flex items-center gap-2">
          {job.type === "import" ? (
            <HugeiconsIcon icon={UploadIcon} size={16} />
          ) : (
            <HugeiconsIcon icon={DownloadIcon} size={16} />
          )}
          <span className="capitalize">
            {job.type === "import"
              ? t("config.importExport.importJob")
              : t("config.importExport.exportJob")}
          </span>
        </div>
      ),
    },
    {
      key: "module",
      header: t("config.importExport.module"),
      cell: (job) => (
        <span className="capitalize">
          {modules.find((m) => m.id === job.module)?.name || job.module}
        </span>
      ),
    },
    {
      key: "status",
      header: t("config.importExport.status"),
      cell: (job) => {
        const statusMap: Record<
          string,
          {
            label: string;
            variant: "default" | "secondary" | "destructive" | "outline";
          }
        > = {
          pending: {
            label: t("config.importExport.statusPending"),
            variant: "outline",
          },
          processing: {
            label: t("config.importExport.statusProcessing"),
            variant: "default",
          },
          completed: {
            label: t("config.importExport.statusCompleted"),
            variant: "default",
          },
          failed: {
            label: t("config.importExport.statusFailed"),
            variant: "destructive",
          },
        };
        const status = statusMap[job.status || "pending"] || statusMap.pending;
        return (
          <Badge variant={status?.variant || "outline"}>
            {status?.label || "Unknown"}
          </Badge>
        );
      },
    },
    {
      key: "progress",
      header: t("config.importExport.progress"),
      cell: (job) => (
        <div className="w-full max-w-[200px]">
          {job.status === "processing" ? (
            <Progress value={job.progress} className="h-2" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {job.progress}%
            </span>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: t("config.importExport.date"),
      cell: (job) => new Date(job.created_at).toLocaleString(),
    },
    {
      key: "actions",
      header: t("config.importExport.actions"),
      cell: (job) => (
        <div className="flex gap-2">
          {job.status === "completed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                showToast(t("config.importExport.download"), "info")
              }
            >
              {t("config.importExport.download")}
            </Button>
          )}
          {job.status === "failed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                showToast(
                  job.error_message || t("config.common.errorUnknown"),
                  "error"
                )
              }
            >
              {t("config.importExport.viewError")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleImport = () => {
    if (!selectedModule || !selectedFile) {
      showToast(t("config.importExport.selectModuleAndFile"), "error");
      return;
    }
    showToast(t("config.importExport.startImport"), "info");
    // TODO: Implementar importación
  };

  const handleExport = () => {
    if (!selectedModule) {
      showToast(t("config.importExport.selectModule"), "error");
      return;
    }
    showToast(t("config.importExport.startExport"), "info");
    // TODO: Implementar exportación
  };

  return (
    <ConfigPageLayout
      title={t("config.importExport.title")}
      description={t("config.importExport.description")}
    >
      <Tabs defaultValue="import" className="space-y-6">
        <TabsList>
          <TabsTrigger value="import">
            {t("config.importExport.tabsImport")}
          </TabsTrigger>
          <TabsTrigger value="export">
            {t("config.importExport.tabsExport")}
          </TabsTrigger>
          <TabsTrigger value="templates">
            {t("config.importExport.tabsTemplates")}
          </TabsTrigger>
          <TabsTrigger value="history">
            {t("config.importExport.tabsHistory")}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Importar */}
        <TabsContent value="import" className="space-y-6">
          <ConfigSection
            title={t("config.importExport.importTitle")}
            description={t("config.importExport.importDesc")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConfigFormField
                label={t("config.importExport.module")}
                id="import_module"
                value={selectedModule}
                onChange={setSelectedModule}
                description={t("config.importExport.moduleDesc")}
                input={
                  <Select
                    value={selectedModule}
                    onValueChange={setSelectedModule}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          "config.importExport.selectModulePlaceholder"
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
              <ConfigFormField
                label={t("config.importExport.file")}
                id="import_file"
                value={selectedFile?.name || ""}
                onChange={() => {}}
                description={
                  selectedFile
                    ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} ${t("config.importExport.fileSize")})`
                    : t("config.importExport.fileSelected")
                }
                input={
                  <input
                    type="file"
                    accept=".csv,.xlsx,.json"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] || null)
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
                  />
                }
              />
            </div>
            <div className="space-y-2 pt-4">
              <p className="text-sm font-medium">
                {t("config.importExport.formatsSupported")}:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>{t("config.importExport.formatCSV")}</li>
                <li>{t("config.importExport.formatExcel")}</li>
                <li>{t("config.importExport.formatJSON")}</li>
              </ul>
            </div>
            <div className="pt-4">
              <Button
                onClick={handleImport}
                disabled={!selectedModule || !selectedFile}
              >
                {t("config.importExport.startImport")}
              </Button>
            </div>
          </ConfigSection>
        </TabsContent>

        {/* Tab: Exportar */}
        <TabsContent value="export" className="space-y-6">
          <ConfigSection
            title={t("config.importExport.exportTitle")}
            description={t("config.importExport.exportDesc")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConfigFormField
                label={t("config.importExport.module")}
                id="export_module"
                value={selectedModule}
                onChange={setSelectedModule}
                description={t("config.importExport.moduleDesc")}
                input={
                  <Select
                    value={selectedModule}
                    onValueChange={setSelectedModule}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          "config.importExport.selectModulePlaceholder"
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              />
              <ConfigFormField
                label={t("config.importExport.exportFormat")}
                id="export_format"
                value={exportFormat}
                onChange={(value) =>
                  setExportFormat(value as "csv" | "excel" | "json")
                }
                description={t("config.importExport.exportFormatDesc")}
                input={
                  <Select
                    value={exportFormat}
                    onValueChange={(value) =>
                      setExportFormat(value as "csv" | "excel" | "json")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
            </div>
            <div className="space-y-2 pt-4">
              <p className="text-sm font-medium">
                {t("config.importExport.exportIncludes")}:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>{t("config.importExport.exportIncludesAll")}</li>
                <li>{t("config.importExport.exportIncludesTenant")}</li>
                <li>{t("config.importExport.exportIncludesCompatible")}</li>
              </ul>
            </div>
            <div className="pt-4">
              <Button onClick={handleExport} disabled={!selectedModule}>
                {t("config.importExport.startExport")}
              </Button>
            </div>
          </ConfigSection>
        </TabsContent>

        {/* Tab: Plantillas */}
        <TabsContent value="templates">
          <ConfigSection
            title={t("config.importExport.templatesTitle")}
            description={t("config.importExport.templatesDesc")}
          >
            <ConfigEmptyState
              title={t("config.importExport.noTemplates")}
              description={t("config.importExport.noTemplates")}
            />
          </ConfigSection>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="history">
          <ConfigSection
            title={t("config.importExport.historyTitle")}
            description={t("config.importExport.historyDesc")}
          >
            {jobs.length > 0 ? (
              <DataTable columns={jobColumns} data={jobs} />
            ) : (
              <ConfigEmptyState
                title={t("config.importExport.noHistory")}
                description={t("config.importExport.noOperationsDesc")}
              />
            )}
          </ConfigSection>
        </TabsContent>
      </Tabs>
    </ConfigPageLayout>
  );
}
