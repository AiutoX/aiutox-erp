/**
 * Reporting hooks
 * Provides TanStack Query hooks for reporting module
 * Following frontend-api.md rules
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
  executeReport,
  getReportData,
  getReportResult,
  getExecutionStatus,
  listDataSources,
  getDataSource,
  exportReport,
  exportExecution,
  listReportTemplates,
  createFromTemplate,
  scheduleReport,
  getReportSchedules,
  deleteSchedule,
  shareReport,
  getReportSharing,
  revokeShare,
} from "~/features/reporting/api/reporting.api";
import type {
  ReportCreate,
  ReportUpdate,
  ReportListParams,
  ParameterValues,
} from "~/features/reporting/types/reporting.types";

// Reports Query hooks
export function useReports(params?: ReportListParams) {
  return useQuery({
    queryKey: ["reports", params],
    queryFn: () => listReports(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ["reports", id],
    queryFn: () => getReport(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!id,
  });
}

// Reports Mutation hooks
export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      // Invalidate reports list queries
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => {
      console.error("Failed to create report:", error);
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReportUpdate }) =>
      updateReport(id, payload),
    onSuccess: (_, variables) => {
      // Invalidate specific report and list queries
      queryClient.invalidateQueries({ queryKey: ["reports", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => {
      console.error("Failed to update report:", error);
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      // Invalidate reports list queries
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => {
      console.error("Failed to delete report:", error);
    },
  });
}

// Report Execution Query hooks
export function useReportData(id: string, parameters?: ParameterValues) {
  return useQuery({
    queryKey: ["reports", id, "data", parameters],
    queryFn: () => getReportData(id, parameters),
    staleTime: 1000 * 60 * 2, // 2 minutes - data can change frequently
    retry: 2,
    enabled: !!id,
  });
}

export function useExecutionStatus(executionId: string) {
  return useQuery({
    queryKey: ["executions", executionId],
    queryFn: () => getExecutionStatus(executionId),
    staleTime: 1000 * 10, // 10 seconds - status changes frequently
    retry: 2,
    enabled: !!executionId,
    refetchInterval: (query) => {
      // Auto-refetch while running
      return query.state.data?.data?.status === "running" ? 2000 : false;
    },
  });
}

export function useReportResult(executionId: string) {
  return useQuery({
    queryKey: ["executions", executionId, "result"],
    queryFn: () => getReportResult(executionId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!executionId,
  });
}

// Report Execution Mutation hooks
export function useExecuteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      parameters,
    }: {
      id: string;
      parameters: ParameterValues;
    }) => executeReport(id, parameters),
    onSuccess: (_, variables) => {
      // Invalidate report data queries
      queryClient.invalidateQueries({
        queryKey: ["reports", variables.id, "data"],
      });
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
    onError: (error) => {
      console.error("Failed to execute report:", error);
    },
  });
}

// Data Sources Query hooks
export function useDataSources() {
  return useQuery({
    queryKey: ["data-sources"],
    queryFn: listDataSources,
    staleTime: 1000 * 60 * 10, // 10 minutes - data sources change rarely
    retry: 2,
  });
}

export function useDataSource(dataSourceName: string) {
  return useQuery({
    queryKey: ["data-sources", dataSourceName],
    queryFn: () => getDataSource(dataSourceName),
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    enabled: !!dataSourceName,
  });
}

// Export Mutation hooks
export function useExportReport() {
  return useMutation({
    mutationFn: ({
      id,
      format,
      parameters,
      options,
    }: {
      id: string;
      format: "pdf" | "excel" | "csv" | "json";
      parameters?: ParameterValues;
      options?: Record<string, unknown>;
    }) => exportReport(id, format, parameters, options),
    onError: (error) => {
      console.error("Failed to export report:", error);
    },
  });
}

export function useExportExecution() {
  return useMutation({
    mutationFn: ({
      executionId,
      format,
      options,
    }: {
      executionId: string;
      format: "pdf" | "excel" | "csv" | "json";
      options?: Record<string, unknown>;
    }) => exportExecution(executionId, format, options),
    onError: (error) => {
      console.error("Failed to export execution:", error);
    },
  });
}

// Templates Query hooks
export function useReportTemplates() {
  return useQuery({
    queryKey: ["report-templates"],
    queryFn: listReportTemplates,
    staleTime: 1000 * 60 * 30, // 30 minutes - templates change rarely
    retry: 2,
  });
}

// Templates Mutation hooks
export function useCreateFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      reportData,
    }: {
      templateId: string;
      reportData: Omit<ReportCreate, "query" | "visualizations" | "parameters">;
    }) => createFromTemplate(templateId, reportData),
    onSuccess: () => {
      // Invalidate reports list queries
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => {
      console.error("Failed to create report from template:", error);
    },
  });
}

// Scheduling Query hooks
export function useReportSchedules(reportId: string) {
  return useQuery({
    queryKey: ["reports", reportId, "schedules"],
    queryFn: () => getReportSchedules(reportId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!reportId,
  });
}

// Scheduling Mutation hooks
export function useScheduleReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      schedule,
    }: {
      id: string;
      schedule: {
        frequency: "daily" | "weekly" | "monthly";
        time: string;
        recipients: string[];
        parameters?: ParameterValues;
      };
    }) => scheduleReport(id, schedule),
    onSuccess: (_, variables) => {
      // Invalidate schedules queries
      queryClient.invalidateQueries({
        queryKey: ["reports", variables.id, "schedules"],
      });
    },
    onError: (error) => {
      console.error("Failed to schedule report:", error);
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      // Invalidate all schedules queries
      queryClient.invalidateQueries({ queryKey: ["reports", "schedules"] });
    },
    onError: (error) => {
      console.error("Failed to delete schedule:", error);
    },
  });
}

// Sharing Query hooks
export function useReportSharing(reportId: string) {
  return useQuery({
    queryKey: ["reports", reportId, "sharing"],
    queryFn: () => getReportSharing(reportId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    enabled: !!reportId,
  });
}

// Sharing Mutation hooks
export function useShareReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      sharing,
    }: {
      id: string;
      sharing: {
        users: string[];
        permissions: ("view" | "execute" | "export")[];
      };
    }) => shareReport(id, sharing),
    onSuccess: (_, variables) => {
      // Invalidate sharing queries
      queryClient.invalidateQueries({
        queryKey: ["reports", variables.id, "sharing"],
      });
    },
    onError: (error) => {
      console.error("Failed to share report:", error);
    },
  });
}

export function useRevokeShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      revokeShare(id, userId),
    onSuccess: (_, variables) => {
      // Invalidate sharing queries
      queryClient.invalidateQueries({
        queryKey: ["reports", variables.id, "sharing"],
      });
    },
    onError: (error) => {
      console.error("Failed to revoke share:", error);
    },
  });
}
