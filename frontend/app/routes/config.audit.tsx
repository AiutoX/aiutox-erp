/**
 * Audit Configuration Page
 *
 * View and manage audit logs with filtering and export capabilities
 * Uses ConfigPageLayout and shared components for visual consistency
 */

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "~/lib/i18n/useTranslation";
import apiClient from "~/lib/api/client";
import type { StandardListResponse } from "~/lib/api/types/common.types";
import type { StandardResponse } from "~/lib/api/types/common.types";
import { ConfigPageLayout } from "~/components/config/ConfigPageLayout";
import { ConfigLoadingState } from "~/components/config/ConfigLoadingState";
import { ConfigErrorState } from "~/components/config/ConfigErrorState";
import { ConfigEmptyState } from "~/components/config/ConfigEmptyState";
import { ConfigSection } from "~/components/config/ConfigSection";
import { ConfigFormField } from "~/components/config/ConfigFormField";
import { DataTable, type DataTableColumn } from "~/components/common/DataTable";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { showToast } from "~/components/common/Toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";

interface AuditRetentionConfig {
  retention_days: number;
}

interface AuditPurgeResult {
  deleted_count: number;
  retention_days: number;
}

interface AuditLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown> | null;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export function meta() {
  return [
    { title: "Auditoría - AiutoX ERP" },
    {
      name: "description",
      content: "Historial de cambios y acciones en el sistema",
    },
  ];
}

export default function AuditConfigPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    action: "",
    resource_type: "",
    resource_id: "",
    user_id: "",
    date_from: "",
    date_to: "",
    page_size: 20,
  });
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [retentionDraft, setRetentionDraft] = useState("");

  const { data: retentionConfig } = useQuery({
    queryKey: ["audit-retention"],
    queryFn: async () => {
      const response = await apiClient.get<
        StandardResponse<AuditRetentionConfig>
      >("/auth/audit-logs/retention");
      return response.data.data;
    },
  });

  useEffect(() => {
    if (retentionConfig) {
      setRetentionDraft(String(retentionConfig.retention_days));
    }
  }, [retentionConfig]);

  const { mutate: updateRetention, isPending: isSavingRetention } = useMutation(
    {
      mutationFn: async (retentionDays: number) => {
        const response = await apiClient.put<
          StandardResponse<AuditRetentionConfig>
        >("/auth/audit-logs/retention", { retention_days: retentionDays });
        return response.data.data;
      },
      onSuccess: () => {
        showToast(t("config.audit.retentionSaved"), "success");
        void queryClient.invalidateQueries({ queryKey: ["audit-retention"] });
      },
      onError: () => {
        showToast(t("config.audit.retentionSaveError"), "error");
      },
    }
  );

  const { mutate: purgeExpiredLogs, isPending: isPurging } = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<StandardResponse<AuditPurgeResult>>(
        "/auth/audit-logs/purge"
      );
      return response.data.data;
    },
    onSuccess: (result) => {
      showToast(
        t("config.audit.purgeSuccess").replace(
          "{count}",
          String(result.deleted_count)
        ),
        "success"
      );
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: () => {
      showToast(t("config.audit.purgeError"), "error");
    },
  });

  const handleSaveRetention = () => {
    const parsed = parseInt(retentionDraft, 10);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 3650) {
      showToast(t("config.audit.retentionInvalid"), "error");
      return;
    }
    updateRetention(parsed);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-logs", filters, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.action) params.append("action", filters.action);
      if (filters.resource_type)
        params.append("resource_type", filters.resource_type);
      if (filters.resource_id)
        params.append("resource_id", filters.resource_id);
      if (filters.user_id) params.append("user_id", filters.user_id);
      if (filters.date_from) params.append("date_from", filters.date_from);
      if (filters.date_to) params.append("date_to", filters.date_to);
      params.append("page", page.toString());
      params.append("page_size", filters.page_size.toString());

      const response = await apiClient.get<StandardListResponse<AuditLog>>(
        `/auth/audit-logs?${params.toString()}`
      );
      return response.data;
    },
  });

  const handleClearFilters = () => {
    setFilters({
      action: "",
      resource_type: "",
      resource_id: "",
      user_id: "",
      date_from: "",
      date_to: "",
      page_size: 20,
    });
    setPage(1);
  };

  const handleExport = async () => {
    try {
      // Build export URL with current filters
      const params = new URLSearchParams();
      if (filters.action) params.append("action", filters.action);
      if (filters.resource_type)
        params.append("resource_type", filters.resource_type);
      if (filters.resource_id)
        params.append("resource_id", filters.resource_id);
      if (filters.user_id) params.append("user_id", filters.user_id);
      if (filters.date_from) params.append("date_from", filters.date_from);
      if (filters.date_to) params.append("date_to", filters.date_to);
      params.append("page_size", filters.page_size.toString());

      // Call export endpoint
      const response = await apiClient.get(
        `/auth/audit-logs/export?${params.toString()}`,
        {
          responseType: "blob",
        }
      );

      // Create download link
      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast(t("config.audit.exportSuccess"), "success");
    } catch (error) {
      console.error("Export failed:", error);
      showToast(t("config.audit.exportError"), "error");
    }
  };

  const getActionBadge = (action: string) => {
    const actionMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      create: { label: t("config.audit.actionCreate"), variant: "default" },
      update: { label: t("config.audit.actionUpdate"), variant: "secondary" },
      delete: { label: t("config.audit.actionDelete"), variant: "destructive" },
      read: { label: t("config.audit.actionRead"), variant: "outline" },
      view: { label: t("config.audit.actionView"), variant: "outline" },
      login: { label: t("config.audit.actionLogin"), variant: "default" },
      logout: { label: t("config.audit.actionLogout"), variant: "outline" },
    };
    const mapped = actionMap[action] || {
      label: action,
      variant: "outline" as const,
    };
    return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
  };

  if (isLoading) {
    return (
      <ConfigPageLayout
        title={t("config.audit.title")}
        description={t("config.audit.description")}
        loading={true}
      >
        <ConfigLoadingState lines={8} />
      </ConfigPageLayout>
    );
  }

  if (error) {
    return (
      <ConfigPageLayout
        title={t("config.audit.title")}
        description={t("config.audit.description")}
        error={error instanceof Error ? error : String(error)}
      >
        <ConfigErrorState message={t("config.audit.errorLoading")} />
      </ConfigPageLayout>
    );
  }

  const logs = data?.data || [];
  const total = data?.meta?.total || 0;

  const logColumns: DataTableColumn<AuditLog>[] = [
    {
      key: "created_at",
      header: t("config.audit.tableDate"),
      cell: (log) => new Date(log.created_at).toLocaleString(),
    },
    {
      key: "user",
      header: t("config.audit.tableUser"),
      cell: (log) => (
        <div>
          <div className="font-medium">
            {log.user_name || log.user_email || t("config.audit.systemAction")}
          </div>
          {log.user_name && log.user_email && (
            <div className="text-sm text-muted-foreground">{log.user_email}</div>
          )}
        </div>
      ),
    },
    {
      key: "action",
      header: t("config.audit.tableAction"),
      cell: (log) => getActionBadge(log.action),
    },
    {
      key: "resource",
      header: t("config.audit.tableResource"),
      cell: (log) => (
        <div>
          <div className="font-medium capitalize">{log.resource_type}</div>
          <div className="text-sm text-muted-foreground">{log.resource_id}</div>
        </div>
      ),
    },
    {
      key: "ip_address",
      header: t("config.audit.tableIP"),
      cell: (log) => (
        <span className="font-mono text-sm">{log.ip_address}</span>
      ),
    },
    {
      key: "actions",
      header: t("config.audit.tableDetails"),
      cell: (log) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
          {t("config.audit.viewDetails")}
        </Button>
      ),
    },
  ];

  return (
    <ConfigPageLayout
      title={t("config.audit.title")}
      description={t("config.audit.description")}
    >
      <div className="space-y-6">
        {/* Retención */}
        <ConfigSection
          title={t("config.audit.retentionTitle")}
          description={t("config.audit.retentionDesc")}
        >
          <div className="flex flex-wrap items-end gap-4">
            <ConfigFormField
              label={t("config.audit.retentionDays")}
              id="retention_days"
              type="number"
              value={retentionDraft}
              onChange={setRetentionDraft}
              className="w-40"
            />
            <Button
              onClick={handleSaveRetention}
              disabled={isSavingRetention}
              variant="outline"
            >
              {t("config.audit.retentionSave")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isPurging}>
                  {t("config.audit.purgeNow")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("config.audit.purgeConfirmTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("config.audit.purgeConfirmDesc").replace(
                      "{days}",
                      String(retentionConfig?.retention_days ?? "")
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("config.audit.purgeCancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={() => purgeExpiredLogs()}>
                    {t("config.audit.purgeConfirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </ConfigSection>

        {/* Filtros */}
        <ConfigSection
          title={t("config.audit.filters")}
          description={t("config.audit.filtersDesc")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ConfigFormField
              label={t("config.audit.filterAction")}
              id="filter_action"
              value={filters.action}
              onChange={(value) => setFilters({ ...filters, action: value })}
              placeholder={t("config.audit.filterActionPlaceholder")}
            />
            <ConfigFormField
              label={t("config.audit.filterResource")}
              id="filter_resource_type"
              value={filters.resource_type}
              onChange={(value) =>
                setFilters({ ...filters, resource_type: value })
              }
              placeholder={t("config.audit.filterResourcePlaceholder")}
            />
            <ConfigFormField
              label={t("config.audit.filterResourceId")}
              id="filter_resource_id"
              value={filters.resource_id}
              onChange={(value) =>
                setFilters({ ...filters, resource_id: value })
              }
              placeholder={t("config.audit.filterResourceIdPlaceholder")}
            />
            <ConfigFormField
              label={t("config.audit.filterUserId")}
              id="filter_user_id"
              value={filters.user_id}
              onChange={(value) => setFilters({ ...filters, user_id: value })}
              placeholder={t("config.audit.filterUserIdPlaceholder")}
            />
            <ConfigFormField
              label={t("config.audit.filterDateFrom")}
              id="filter_date_from"
              type="text"
              value={filters.date_from}
              onChange={(value) => setFilters({ ...filters, date_from: value })}
            />
            <ConfigFormField
              label={t("config.audit.filterDateTo")}
              id="filter_date_to"
              type="text"
              value={filters.date_to}
              onChange={(value) => setFilters({ ...filters, date_to: value })}
            />
          </div>
          <div className="flex items-center gap-4 pt-4">
            <ConfigFormField
              label={t("config.audit.recordsPerPage")}
              id="page_size"
              value={String(filters.page_size)}
              onChange={(value) =>
                setFilters({ ...filters, page_size: parseInt(value) || 20 })
              }
              input={
                <Select
                  value={filters.page_size.toString()}
                  onValueChange={(value) =>
                    setFilters({ ...filters, page_size: parseInt(value) })
                  }
                >
                  <SelectTrigger className="w-37.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
            <Button variant="outline" onClick={handleClearFilters}>
              {t("config.audit.clearFilters")}
            </Button>
            <Button onClick={() => void handleExport()}>
              {t("config.audit.exportLogs")}
            </Button>
          </div>
        </ConfigSection>

        {/* Tabla de registros */}
        <ConfigSection
          title={t("config.audit.title")}
          description={`${t("config.audit.showing")} ${(page - 1) * filters.page_size + 1} ${t("config.audit.to")} ${Math.min(page * filters.page_size, total)} ${t("config.audit.of")} ${total} ${t("config.audit.records")}`}
        >
          {logs.length > 0 ? (
            <DataTable
              columns={logColumns}
              data={logs}
              pagination={{
                page,
                pageSize: filters.page_size,
                total,
                onPageChange: setPage,
              }}
              inCard={false}
            />
          ) : (
            <ConfigEmptyState
              title={t("config.audit.noLogs")}
              description={t("config.audit.noLogsDesc")}
            />
          )}
        </ConfigSection>
      </div>

      {/* Dialog para detalles */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("config.audit.detailsTitle")}</DialogTitle>
            <DialogDescription>
              {t("config.audit.detailsDescription")}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-125">
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("config.audit.detailsUser")}
                    </p>
                    <p className="text-sm">
                      {selectedLog.user_name && selectedLog.user_email
                        ? `${selectedLog.user_name} (${selectedLog.user_email})`
                        : selectedLog.user_email ||
                          selectedLog.user_name ||
                          t("config.audit.systemAction")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("config.audit.detailsDate")}
                    </p>
                    <p className="text-sm">
                      {new Date(selectedLog.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("config.audit.detailsAction")}
                    </p>
                    <div className="mt-1">
                      {getActionBadge(selectedLog.action)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("config.audit.detailsResource")}
                    </p>
                    <p className="text-sm capitalize">
                      {selectedLog.resource_type} ({selectedLog.resource_id})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("config.audit.detailsIP")}
                    </p>
                    <p className="text-sm font-mono">
                      {selectedLog.ip_address}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("config.audit.detailsUserAgent")}
                    </p>
                    <p className="text-sm">{selectedLog.user_agent}</p>
                  </div>
                </div>
                {selectedLog.details &&
                  Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {t("config.audit.detailsDetails")}
                    </p>
                    <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </ConfigPageLayout>
  );
}
