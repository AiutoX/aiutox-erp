/**
 * Reporting page
 * Main page for reporting management
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ReportList } from "~/features/reporting/components/ReportList";
import { ReportBuilder } from "~/features/reporting/components/ReportBuilder";
import { ReportViewer } from "~/features/reporting/components/ReportViewer";
import { ReportFilters } from "~/features/reporting/components/ReportFilters";
import { ReportExportButtons } from "~/features/reporting/components/ReportExportButtons";
import {
  useReports,
  useDataSources,
  useCreateReport,
  useUpdateReport,
  useDeleteReport,
  useExecuteReport,
  useExportReport,
} from "~/features/reporting/hooks/useReporting";
import type {
  Report,
  ReportCreate,
  ReportUpdate,
  ReportListParams,
  ParameterValues,
  ReportExecution,
} from "~/features/reporting/types/reporting.types";

export default function ReportingPage() {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState("list");
  const [showBuilder, setShowBuilder] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filters, setFilters] = useState<ReportListParams>({});
  const [currentExecution, setCurrentExecution] =
    useState<ReportExecution | null>(null);

  // Query hooks
  const {
    data: reportsData,
    isLoading: reportsLoading,
    refetch: refetchReports,
  } = useReports(filters);
  const { data: dataSourcesData, isLoading: dataSourcesLoading } =
    useDataSources();

  // Mutation hooks
  const createReportMutation = useCreateReport();
  const updateReportMutation = useUpdateReport();
  const deleteReportMutation = useDeleteReport();
  const executeReportMutation = useExecuteReport();
  const exportReportMutation = useExportReport();

  const reports = reportsData?.data || [];
  const dataSources = dataSourcesData?.data || [];

  const handleCreateReport = () => {
    setSelectedReport(null);
    setShowBuilder(true);
  };

  const handleEditReport = (report: Report) => {
    setSelectedReport(report);
    setShowBuilder(true);
  };

  const handleDeleteReport = (report: Report) => {
    if (confirm(t("reporting.confirmDelete"))) {
      deleteReportMutation.mutate(report.id, {
        onSuccess: () => {
          void refetchReports();
        },
      });
    }
  };

  const handleExecuteReport = (report: Report) => {
    setSelectedReport(report);
    setShowViewer(true);
    // Auto-execute if no parameters
    if (Object.keys(report.parameters).length === 0) {
      executeReportMutation.mutate(
        { id: report.id, parameters: {} },
        {
          onSuccess: (execution) => {
            setCurrentExecution(execution.data);
          },
        }
      );
    }
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setShowViewer(true);
  };

  const handleExportReport = (report: Report) => {
    // This would open export dialog
    console.warn("Export report:", report);
  };

  const handleReportSubmit = (data: ReportCreate | ReportUpdate) => {
    if (selectedReport) {
      // Update existing report
      updateReportMutation.mutate(
        { id: selectedReport.id, payload: data },
        {
          onSuccess: () => {
            setShowBuilder(false);
            setSelectedReport(null);
            void refetchReports();
          },
        }
      );
    } else {
      // Create new report
      createReportMutation.mutate(data as ReportCreate, {
        onSuccess: () => {
          setShowBuilder(false);
          setSelectedReport(null);
          void refetchReports();
        },
      });
    }
  };

  const handleReportBuilderCancel = () => {
    setShowBuilder(false);
    setSelectedReport(null);
  };

  const handleExecuteWithParams = (parameters: ParameterValues) => {
    if (!selectedReport) return;

    executeReportMutation.mutate(
      { id: selectedReport.id, parameters },
      {
        onSuccess: (execution) => {
          setCurrentExecution(execution.data);
        },
      }
    );
  };

  const handleExport = async (format: "pdf" | "excel" | "csv" | "json") => {
    if (!selectedReport || !currentExecution) return;

    try {
      const blob = await exportReportMutation.mutateAsync({
        id: selectedReport.id,
        format,
        parameters: currentExecution.parameters,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedReport.name}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handleFiltersChange = (newFilters: ReportListParams) => {
    setFilters(newFilters);
  };

  const handleFiltersReset = () => {
    setFilters({});
  };

  const getUniqueModules = () => {
    const modules = [...new Set(reports.map((r) => r.module))];
    return modules;
  };

  const getUniqueDataSources = () => {
    const dataSources = [...new Set(reports.map((r) => r.data_source))];
    return dataSources;
  };

  return (
    <PageLayout
      title={t("reporting.title")}
      description={t("reporting.description")}
      loading={reportsLoading || dataSourcesLoading}
    >
      <div className="space-y-6">
        {/* Main Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">{t("reporting.tabs.list")}</TabsTrigger>
            <TabsTrigger value="builder">
              {t("reporting.tabs.builder")}
            </TabsTrigger>
            <TabsTrigger value="viewer">
              {t("reporting.tabs.viewer")}
            </TabsTrigger>
          </TabsList>

          {/* List Tab */}
          <TabsContent value="list" className="space-y-6">
            <ReportFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onReset={handleFiltersReset}
              modules={getUniqueModules()}
              dataSources={getUniqueDataSources()}
            />

            <ReportList
              reports={reports}
              loading={reportsLoading}
              onEdit={handleEditReport}
              onDelete={handleDeleteReport}
              onExecute={handleExecuteReport}
              onView={handleViewReport}
              onExport={handleExportReport}
              onSearch={handleFiltersChange}
              onCreate={handleCreateReport}
            />
          </TabsContent>

          {/* Builder Tab */}
          <TabsContent value="builder" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {selectedReport
                  ? t("reporting.builder.edit")
                  : t("reporting.builder.create")}
              </h2>
              <Button variant="outline" onClick={handleCreateReport}>
                {t("reporting.builder.new")}
              </Button>
            </div>

            {selectedReport || showBuilder ? (
              <ReportBuilder
                report={selectedReport || undefined}
                dataSources={dataSources}
                onSubmit={handleReportSubmit}
                onCancel={handleReportBuilderCancel}
                loading={
                  createReportMutation.isPending ||
                  updateReportMutation.isPending
                }
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {t("reporting.builder.select")}
                </p>
                <Button onClick={handleCreateReport}>
                  {t("reporting.builder.create")}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Viewer Tab */}
          <TabsContent value="viewer" className="space-y-6">
            {selectedReport ? (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                  <ReportViewer
                    report={selectedReport}
                    execution={currentExecution || undefined}
                    result={currentExecution?.result}
                    loading={executeReportMutation.isPending}
                    onExecute={handleExecuteWithParams}
                    onExport={() =>
                      currentExecution &&
                      void handleExport(currentExecution.id as "pdf")
                    }
                    onRefresh={() => {
                      if (currentExecution) {
                        // Refresh execution status
                        console.warn("Refresh execution");
                      }
                    }}
                  />
                </div>

                <div className="lg:col-span-1">
                  <ReportExportButtons
                    reportId={selectedReport.id}
                    executionId={currentExecution?.id}
                    loading={executeReportMutation.isPending}
                    onExport={handleExport}
                    execution={currentExecution || undefined}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {t("reporting.viewer.select")}
                </p>
                <div className="space-y-2">
                  {reports.slice(0, 5).map((report) => (
                    <Button
                      key={report.id}
                      variant="outline"
                      onClick={() => {
                        setSelectedReport(report);
                        setCurrentTab("viewer");
                      }}
                      className="w-full justify-start"
                    >
                      {report.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Report Builder Dialog */}
        <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">
              Constructor de Reporte
            </DialogTitle>
            <ReportBuilder
              report={selectedReport || undefined}
              dataSources={dataSources}
              onSubmit={handleReportSubmit}
              onCancel={handleReportBuilderCancel}
              loading={
                createReportMutation.isPending || updateReportMutation.isPending
              }
            />
          </DialogContent>
        </Dialog>

        {/* Report Viewer Dialog */}
        <Dialog open={showViewer} onOpenChange={setShowViewer}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">Visor de Reporte</DialogTitle>
            {selectedReport && (
              <ReportViewer
                report={selectedReport}
                execution={currentExecution || undefined}
                result={currentExecution?.result}
                loading={executeReportMutation.isPending}
                onExecute={handleExecuteWithParams}
                onExport={() =>
                  currentExecution &&
                  void handleExport(currentExecution.id as "pdf")
                }
                onRefresh={() => {
                  if (currentExecution) {
                    console.warn("Refresh execution");
                  }
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
