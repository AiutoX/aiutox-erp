/**
 * Reporting page
 * Main page for reporting management
 */

import { useEffect, useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useHasPermission } from "~/hooks/usePermissions";
import { useToast } from "~/hooks/useToast";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ReportList } from "~/features/reporting/components/ReportList";
import { ReportBuilder } from "~/features/reporting/components/ReportBuilder";
import { ReportViewer } from "~/features/reporting/components/ReportViewer";
import { ReportFilters } from "~/features/reporting/components/ReportFilters";
import { ReportExecutionHistory } from "~/features/reporting/components/ReportExecutionHistory";
import {
  useReports,
  useDataSources,
  useCreateReport,
  useUpdateReport,
  useDeleteReport,
  useExecuteReport,
} from "~/features/reporting/hooks/useReporting";
import type {
  Report,
  ReportCreate,
  ReportUpdate,
  ReportListParams,
  ReportExecutionResult,
} from "~/features/reporting/types/reporting.types";

export default function ReportingPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const canManage = useHasPermission("reporting.manage");
  const canViewAudit = useHasPermission("auth.view_audit");
  const [currentTab, setCurrentTab] = useState("list");
  const [showBuilder, setShowBuilder] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filters, setFilters] = useState<ReportListParams>({});
  const [currentResult, setCurrentResult] =
    useState<ReportExecutionResult | null>(null);
  const [executeError, setExecuteError] = useState(false);

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
    setCurrentResult(null);
    setExecuteError(false);
    executeReportMutation.mutate(
      { id: report.id },
      {
        onSuccess: (response) => {
          setCurrentResult(response.data);
        },
        onError: () => {
          setExecuteError(true);
          toast.error(
            "reporting.execution.error.title",
            t("reporting.execution.error.description")
          );
        },
      }
    );
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setCurrentResult(null);
    setExecuteError(false);
    setShowViewer(true);
  };

  const handleReportSubmit = (data: ReportCreate | ReportUpdate) => {
    if (selectedReport) {
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

  const handleExecute = () => {
    if (!selectedReport) return;
    setExecuteError(false);
    executeReportMutation.mutate(
      { id: selectedReport.id },
      {
        onSuccess: (response) => {
          setCurrentResult(response.data);
        },
        onError: () => {
          setExecuteError(true);
          toast.error(
            "reporting.execution.error.title",
            t("reporting.execution.error.description")
          );
        },
      }
    );
  };

  const handleFiltersChange = (newFilters: ReportListParams) => {
    setFilters(newFilters);
  };

  useEffect(() => {
    if (!canViewAudit && currentTab === "audit") {
      setCurrentTab("list");
    }
  }, [canViewAudit, currentTab]);

  return (
    <PageLayout
      title={t("reporting.title")}
      description={t("reporting.description")}
      loading={reportsLoading || dataSourcesLoading}
    >
      <div className="space-y-6">
        {/* Main Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList
            className={`grid w-full ${
              {
                2: "grid-cols-2",
                3: "grid-cols-3",
              }[2 + (canViewAudit ? 1 : 0)]
            }`}
          >
            <TabsTrigger value="list">{t("reporting.tabs.list")}</TabsTrigger>
            <TabsTrigger value="viewer">
              {t("reporting.tabs.viewer")}
            </TabsTrigger>
            {canViewAudit && (
              <TabsTrigger value="audit">{t("reporting.tabs.audit")}</TabsTrigger>
            )}
          </TabsList>

          {/* List Tab */}
          <TabsContent value="list" className="space-y-6">
            <ReportFilters filters={filters} onFiltersChange={handleFiltersChange} />

            <ReportList
              reports={reports}
              loading={reportsLoading}
              onEdit={handleEditReport}
              onDelete={handleDeleteReport}
              onExecute={handleExecuteReport}
              onView={handleViewReport}
              onCreate={handleCreateReport}
            />
          </TabsContent>

          {/* Viewer Tab */}
          <TabsContent value="viewer" className="space-y-6">
            {selectedReport ? (
              <ReportViewer
                report={selectedReport}
                result={currentResult || undefined}
                loading={executeReportMutation.isPending}
                isError={executeError}
                onExecute={handleExecute}
                onRefresh={handleExecute}
              />
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

          {/* Audit Tab (REP-005) */}
          {canViewAudit && (
            <TabsContent value="audit" className="space-y-6">
              <ReportExecutionHistory reports={reports} />
            </TabsContent>
          )}
        </Tabs>

        {/* Report Builder Dialog — gated by reporting.manage in depth, on top
            of both triggers (Crear Reporte, Edit icon) already being hidden */}
        <Dialog
          open={showBuilder && canManage}
          onOpenChange={setShowBuilder}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">
              {selectedReport
                ? t("reporting.builder.edit")
                : t("reporting.builder.create")}
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
                result={currentResult || undefined}
                loading={executeReportMutation.isPending}
                isError={executeError}
                onExecute={handleExecute}
                onRefresh={handleExecute}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
