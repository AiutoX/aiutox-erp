/**
 * React Query hooks for files configuration
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  getStorageConfig,
  updateStorageConfig,
  testS3Connection,
  getStorageStats,
  getFileLimits,
  updateFileLimits,
  getThumbnailConfig,
  updateThumbnailConfig,
  getStorageQuotaConfig,
  updateStorageQuotaConfig,
  getUserQuotaUsage,
  updateUserQuotaOverride,
  getMyStorageQuota,
  type StorageConfigUpdate,
  type S3ConnectionTestRequest,
  type FileLimitsUpdate,
  type ThumbnailConfigUpdate,
  type StorageQuotaConfigUpdate,
} from "~/lib/api/files-config.api";

/**
 * Hook to get storage configuration
 */
export function useStorageConfig() {
  return useQuery({
    queryKey: ["files-config", "storage"],
    queryFn: async () => {
      const response = await getStorageConfig();
      return response.data;
    },
  });
}

/**
 * Hook to update storage configuration
 */
export function useStorageConfigUpdate() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: StorageConfigUpdate) => updateStorageConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files-config", "storage"] });
      showToast(t("config.files.storage.updated"), "success");
    },
    onError: (error: Error) => {
      showToast(
        error.message || t("config.files.storage.updateError"),
        "error"
      );
    },
  });
}

/**
 * Hook to test S3 connection
 */
export function useS3ConnectionTest() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (config: S3ConnectionTestRequest) => testS3Connection(config),
    onSuccess: () => {
      showToast(t("config.files.storage.testSuccess"), "success");
    },
    onError: (error: Error) => {
      showToast(error.message || t("config.files.storage.testError"), "error");
    },
  });
}

/**
 * Hook to get storage statistics
 */
export function useStorageStats() {
  return useQuery({
    queryKey: ["files-config", "stats"],
    queryFn: async () => {
      const response = await getStorageStats();
      return response.data;
    },
  });
}

/**
 * Hook to get file limits
 */
export function useFileLimits() {
  return useQuery({
    queryKey: ["files-config", "limits"],
    queryFn: async () => {
      const response = await getFileLimits();
      return response.data;
    },
  });
}

/**
 * Hook to update file limits
 */
export function useFileLimitsUpdate() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (limits: FileLimitsUpdate) => updateFileLimits(limits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files-config", "limits"] });
      showToast(t("config.files.limits.updated"), "success");
    },
    onError: (error: Error) => {
      showToast(error.message || t("config.files.limits.updateError"), "error");
    },
  });
}

/**
 * Hook to get storage quota configuration + tenant usage
 */
export function useStorageQuotaConfig() {
  return useQuery({
    queryKey: ["files-config", "quota"],
    queryFn: async () => {
      const response = await getStorageQuotaConfig();
      return response.data;
    },
  });
}

/**
 * Hook to update storage quota configuration
 */
export function useStorageQuotaConfigUpdate() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: StorageQuotaConfigUpdate) =>
      updateStorageQuotaConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files-config", "quota"] });
      showToast(t("config.files.quota.updated"), "success");
    },
    onError: (error: Error) => {
      showToast(error.message || t("config.files.quota.updateError"), "error");
    },
  });
}

/**
 * Hook to get per-user storage quota usage breakdown
 */
export function useUserQuotaUsage() {
  return useQuery({
    queryKey: ["files-config", "quota", "users"],
    queryFn: async () => {
      const response = await getUserQuotaUsage();
      return response.data;
    },
  });
}

/**
 * Hook to set a per-user storage quota override
 */
export function useUserQuotaOverrideUpdate() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, maxBytes }: { userId: string; maxBytes: number }) =>
      updateUserQuotaOverride(userId, maxBytes),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["files-config", "quota", "users"],
      });
      showToast(t("config.files.quota.userOverrideUpdated"), "success");
    },
    onError: (error: Error) => {
      showToast(
        error.message || t("config.files.quota.userOverrideUpdateError"),
        "error"
      );
    },
  });
}

/**
 * Hook to get the current user's own storage quota and usage
 */
export function useMyStorageQuota() {
  return useQuery({
    queryKey: ["files-config", "quota", "me"],
    queryFn: async () => {
      const response = await getMyStorageQuota();
      return response.data;
    },
  });
}

/**
 * Hook to get thumbnail configuration
 */
export function useThumbnailConfig() {
  return useQuery({
    queryKey: ["files-config", "thumbnails"],
    queryFn: async () => {
      const response = await getThumbnailConfig();
      return response.data;
    },
  });
}

/**
 * Hook to update thumbnail configuration
 */
export function useThumbnailConfigUpdate() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: ThumbnailConfigUpdate) =>
      updateThumbnailConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["files-config", "thumbnails"],
      });
      showToast(t("config.files.thumbnails.updated"), "success");
    },
    onError: (error: Error) => {
      showToast(
        error.message || t("config.files.thumbnails.updateError"),
        "error"
      );
    },
  });
}
