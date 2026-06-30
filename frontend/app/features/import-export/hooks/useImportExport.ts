/**
 * Import/Export hooks
 * TanStack Query hooks for Import/Export module
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  ImportJob,
  ImportJobCreate,
  ImportJobUpdate,
  ExportJob,
  ExportJobCreate,
  ExportJobUpdate,
  ImportTemplate,
  ImportTemplateCreate,
  ImportTemplateUpdate,
  ImportExportConfig,
} from "../types/import-export.types";
import {
  createImportJob,
  listImportJobs,
  getImportJob,
  updateImportJob,
  deleteImportJob,
  cancelImportJob,
  retryImportJob,
  createExportJob,
  listExportJobs,
  getExportJob,
  updateExportJob,
  deleteExportJob,
  cancelExportJob,
  downloadExportFile,
  listImportTemplates,
  getImportTemplate,
  createImportTemplate,
  updateImportTemplate,
  deleteImportTemplate,
  getImportExportStats,
  getImportExportConfig,
  updateImportExportConfig,
  validateImportFile,
  getAvailableModules,
  getExportFormats,
  getExportSample,
} from "../api/import-export.api";

// Query keys
export const importExportKeys = {
  all: ["import-export"] as const,
  importJobs: () => [...importExportKeys.all, "import-jobs"] as const,
  importJob: (id: string) =>
    [...importExportKeys.importJobs(), "detail", id] as const,
  exportJobs: () => [...importExportKeys.all, "export-jobs"] as const,
  exportJob: (id: string) =>
    [...importExportKeys.exportJobs(), "detail", id] as const,
  importTemplates: () => [...importExportKeys.all, "import-templates"] as const,
  importTemplate: (id: string) =>
    [...importExportKeys.importTemplates(), "detail", id] as const,
  stats: () => [...importExportKeys.all, "stats"] as const,
  config: () => [...importExportKeys.all, "config"] as const,
  availableModules: () => [...importExportKeys.all, "modules"] as const,
  exportFormats: (module: string) =>
    [...importExportKeys.all, "export-formats", module] as const,
};

/**
 * Import Jobs hooks
 */

/**
 * Hook for listing import jobs
 * @param params - Query parameters
 * @returns Query result with import jobs list
 */
export function useImportJobs(params?: {
  module?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): ReturnType<typeof useQuery<StandardListResponse<ImportJob>>> {
  return useQuery({
    queryKey: [...importExportKeys.importJobs(), params],
    queryFn: () => listImportJobs(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for getting a single import job
 * @param jobId - Import job ID
 * @returns Query result with import job details
 */
export function useImportJob(
  jobId: string
): ReturnType<typeof useQuery<StandardResponse<ImportJob>>> {
  return useQuery({
    queryKey: importExportKeys.importJob(jobId),
    queryFn: () => getImportJob(jobId),
    enabled: !!jobId,
    staleTime: 10 * 1000, // 10 seconds
  });
}

/**
 * Hook for creating an import job
 * @returns Mutation result for import job creation
 */
export function useCreateImportJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ImportJobCreate) => createImportJob(data),
    onSuccess: () => {
      // Invalidate import jobs list cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.importJobs(),
      });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: importExportKeys.stats() });
    },
  });
}

/**
 * Hook for updating an import job
 * @returns Mutation result for import job update
 */
export function useUpdateImportJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: ImportJobUpdate }) =>
      updateImportJob(jobId, data),
    onSuccess: (_, { jobId }) => {
      // Invalidate specific job cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.importJob(jobId),
      });
      // Invalidate import jobs list cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.importJobs(),
      });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: importExportKeys.stats() });
    },
  });
}

/**
 * Hook for deleting an import job
 * @returns Mutation result for import job deletion
 */
export function useDeleteImportJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => deleteImportJob(jobId),
    onSuccess: (_, jobId) => {
      // Invalidate specific job cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.importJob(jobId),
      });
      // Invalidate import jobs list cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.importJobs(),
      });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: importExportKeys.stats() });
    },
  });
}

/**
 * Hook for canceling an import job
 * @returns Mutation result for import job cancellation
 */
export function useCancelImportJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => cancelImportJob(jobId),
    onSuccess: (_, jobId) => {
      // Invalidate specific job cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.importJob(jobId),
      });
      // Invalidate import jobs list cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.importJobs(),
      });
    },
  });
}

/**
 * Hook for retrying an import job
 * @returns Mutation result for import job retry
 */
export function useRetryImportJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => retryImportJob(jobId),
    onSuccess: (_, jobId) => {
      // Invalidate specific job cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.importJob(jobId),
      });
      // Invalidate import jobs list cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.importJobs(),
      });
    },
  });
}

/**
 * Export Jobs hooks
 */

/**
 * Hook for listing export jobs
 * @param params - Query parameters
 * @returns Query result with export jobs list
 */
export function useExportJobs(params?: {
  module?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): ReturnType<typeof useQuery<StandardListResponse<ExportJob>>> {
  return useQuery({
    queryKey: [...importExportKeys.exportJobs(), params],
    queryFn: () => listExportJobs(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for getting a single export job
 * @param jobId - Export job ID
 * @returns Query result with export job details
 */
export function useExportJob(
  jobId: string
): ReturnType<typeof useQuery<StandardResponse<ExportJob>>> {
  return useQuery({
    queryKey: importExportKeys.exportJob(jobId),
    queryFn: () => getExportJob(jobId),
    enabled: !!jobId,
    staleTime: 10 * 1000, // 10 seconds
  });
}

/**
 * Hook for creating an export job
 * @returns Mutation result for export job creation
 */
export function useCreateExportJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ExportJobCreate) => createExportJob(data),
    onSuccess: () => {
      // Invalidate export jobs list cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.exportJobs(),
      });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: importExportKeys.stats() });
    },
  });
}

/**
 * Hook for updating an export job
 * @returns Mutation result for export job update
 */
export function useUpdateExportJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: ExportJobUpdate }) =>
      updateExportJob(jobId, data),
    onSuccess: (_, { jobId }) => {
      // Invalidate specific job cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.exportJob(jobId),
      });
      // Invalidate export jobs list cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.exportJobs(),
      });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: importExportKeys.stats() });
    },
  });
}

/**
 * Hook for deleting an export job
 * @returns Mutation result for export job deletion
 */
export function useDeleteExportJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => deleteExportJob(jobId),
    onSuccess: (_, jobId) => {
      // Invalidate specific job cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.exportJob(jobId),
      });
      // Invalidate export jobs list cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.exportJobs(),
      });
      // Invalidate stats cache
      queryClient.invalidateQueries({ queryKey: importExportKeys.stats() });
    },
  });
}

/**
 * Hook for canceling an export job
 * @returns Mutation result for export job cancellation
 */
export function useCancelExportJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => cancelExportJob(jobId),
    onSuccess: (_, jobId) => {
      // Invalidate specific job cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.exportJob(jobId),
      });
      // Invalidate export jobs list cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.exportJobs(),
      });
    },
  });
}

/**
 * Hook for downloading export file
 * @returns Mutation result for file download
 */
export function useDownloadExportFile() {
  return useMutation({
    mutationFn: (jobId: string) => downloadExportFile(jobId),
  });
}

/**
 * Import Templates hooks
 */

/**
 * Hook for listing import templates
 * @param params - Query parameters
 * @returns Query result with import templates list
 */
export function useImportTemplates(params?: {
  module?: string;
  page?: number;
  page_size?: number;
}): ReturnType<typeof useQuery<StandardListResponse<ImportTemplate>>> {
  return useQuery({
    queryKey: [...importExportKeys.importTemplates(), params],
    queryFn: () => listImportTemplates(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting a single import template
 * @param templateId - Import template ID
 * @returns Query result with import template details
 */
export function useImportTemplate(
  templateId: string
): ReturnType<typeof useQuery<StandardResponse<ImportTemplate>>> {
  return useQuery({
    queryKey: importExportKeys.importTemplate(templateId),
    queryFn: () => getImportTemplate(templateId),
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for creating an import template
 * @returns Mutation result for import template creation
 */
export function useCreateImportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ImportTemplateCreate) => createImportTemplate(data),
    onSuccess: () => {
      // Invalidate import templates list cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.importTemplates(),
      });
    },
  });
}

/**
 * Hook for updating an import template
 * @returns Mutation result for import template update
 */
export function useUpdateImportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: string;
      data: ImportTemplateUpdate;
    }) => updateImportTemplate(templateId, data),
    onSuccess: (_, { templateId }) => {
      // Invalidate specific template cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.importTemplate(templateId),
      });
      // Invalidate import templates list cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.importTemplates(),
      });
    },
  });
}

/**
 * Hook for deleting an import template
 * @returns Mutation result for import template deletion
 */
export function useDeleteImportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => deleteImportTemplate(templateId),
    onSuccess: (_, templateId) => {
      // Invalidate specific template cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.importTemplate(templateId),
      });
      // Invalidate import templates list cache
      queryClient.invalidateQueries({
        queryKey: importExportKeys.importTemplates(),
      });
    },
  });
}

/**
 * Statistics hooks
 */

/**
 * Hook for getting import/export statistics
 * @returns Query result with statistics
 */
export function useImportExportStats() {
  return useQuery({
    queryKey: importExportKeys.stats(),
    queryFn: () => getImportExportStats(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

/**
 * Configuration hooks
 */

/**
 * Hook for getting import/export configuration
 * @returns Query result with configuration
 */
export function useImportExportConfig() {
  return useQuery({
    queryKey: importExportKeys.config(),
    queryFn: () => getImportExportConfig(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for updating import/export configuration
 * @returns Mutation result for configuration update
 */
export function useUpdateImportExportConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: ImportExportConfig) =>
      updateImportExportConfig(config),
    onSuccess: () => {
      // Invalidate config cache
      queryClient.invalidateQueries({ queryKey: importExportKeys.config() });
    },
  });
}

/**
 * Validation hooks
 */

/**
 * Hook for validating import file
 * @returns Mutation result for file validation
 */
export function useValidateImportFile() {
  return useMutation({
    mutationFn: ({
      file,
      module,
      templateId,
    }: {
      file: File;
      module: string;
      templateId?: string;
    }) => validateImportFile(file, module, templateId),
  });
}

/**
 * Utility hooks
 */

/**
 * Hook for getting available modules
 * @returns Query result with available modules
 */
export function useAvailableModules() {
  return useQuery({
    queryKey: importExportKeys.availableModules(),
    queryFn: () => getAvailableModules(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for getting export formats for a module
 * @param module - Module name
 * @returns Query result with export formats
 */
export function useExportFormats(module: string) {
  return useQuery({
    queryKey: importExportKeys.exportFormats(module),
    queryFn: () => getExportFormats(module),
    enabled: !!module,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting export sample data
 * @returns Mutation result for sample download
 */
export function useGetExportSample() {
  return useMutation({
    mutationFn: ({
      module,
      format,
      count,
    }: {
      module: string;
      format: string;
      count?: number;
    }) => getExportSample(module, format, count),
  });
}
