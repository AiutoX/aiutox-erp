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
  listDataSources,
  getDataSourceColumns,
  getDataSourceFilters,
  listReportExecutions,
} from "~/features/reporting/api/reporting.api";
import type {
  ReportUpdate,
  ReportListParams,
  ReportExecutionRequest,
  ReportExecutionHistoryParams,
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
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error) => {
      console.error("Failed to delete report:", error);
    },
  });
}

// Report Execution Mutation hooks
export function useExecuteReport() {
  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: string;
      request?: ReportExecutionRequest;
    }) => executeReport(id, request),
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

export function useDataSourceColumns(sourceType: string) {
  return useQuery({
    queryKey: ["data-sources", sourceType, "columns"],
    queryFn: () => getDataSourceColumns(sourceType),
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    enabled: !!sourceType,
  });
}

export function useDataSourceFilters(sourceType: string) {
  return useQuery({
    queryKey: ["data-sources", sourceType, "filters"],
    queryFn: () => getDataSourceFilters(sourceType),
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    enabled: !!sourceType,
  });
}

// Execution history (Auditoria tab) Query hook
export function useReportExecutions(params?: ReportExecutionHistoryParams) {
  return useQuery({
    queryKey: ["report-executions", params],
    queryFn: () => listReportExecutions(params),
    staleTime: 1000 * 60, // 1 minute
    retry: 2,
  });
}
