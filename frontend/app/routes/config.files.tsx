/**
 * Files Configuration Page
 *
 * Configure file storage settings, limits, statistics, and thumbnails
 * Uses ConfigPageLayout and shared components for visual consistency
 */

import { useState, useEffect } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ConfigPageLayout } from "~/components/config/ConfigPageLayout";
import { ConfigLoadingState } from "~/components/config/ConfigLoadingState";
import { ConfigErrorState } from "~/components/config/ConfigErrorState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { StorageConfig } from "~/components/config/files/StorageConfig";
import { StorageStats } from "~/components/config/files/StorageStats";
import { FileLimits } from "~/components/config/files/FileLimits";
import { ThumbnailConfig } from "~/components/config/files/ThumbnailConfig";
import {
  useStorageConfig,
  useStorageConfigUpdate,
  useFileLimits,
  useFileLimitsUpdate,
  useThumbnailConfig,
  useThumbnailConfigUpdate,
} from "~/hooks/useFilesConfig";
import type {
  StorageConfigUpdate,
  FileLimitsUpdate,
  ThumbnailConfigUpdate,
} from "~/lib/api/files-config.api";

export function meta() {
  return [
    { title: "Configuración de Archivos - AiutoX ERP" },
    {
      name: "description",
      content: "Configura el almacenamiento, límites y thumbnails de archivos",
    },
  ];
}

export default function FilesConfigPage() {
  const { t } = useTranslation();

  // Storage config
  const {
    data: storageConfig,
    isLoading: storageLoading,
    error: storageError,
  } = useStorageConfig();
  const { mutate: updateStorage, isPending: isUpdatingStorage } =
    useStorageConfigUpdate();
  const [storageFormData, setStorageFormData] = useState<StorageConfigUpdate>({
    backend: "local",
  });

  // File limits
  const {
    data: fileLimits,
    isLoading: limitsLoading,
    error: limitsError,
  } = useFileLimits();
  const { mutate: updateLimits, isPending: isUpdatingLimits } =
    useFileLimitsUpdate();
  const [limitsFormData, setLimitsFormData] = useState<FileLimitsUpdate>({});

  // Thumbnail config
  const {
    data: thumbnailConfig,
    isLoading: thumbnailLoading,
    error: thumbnailError,
  } = useThumbnailConfig();
  const { mutate: updateThumbnail, isPending: isUpdatingThumbnail } =
    useThumbnailConfigUpdate();
  const [thumbnailFormData, setThumbnailFormData] =
    useState<ThumbnailConfigUpdate>({});

  // Initialize form data when config loads
  useEffect(() => {
    if (storageConfig) {
      setStorageFormData({
        backend: storageConfig.backend,
        s3: storageConfig.s3
          ? {
              bucket_name: storageConfig.s3.bucket_name,
              access_key_id: storageConfig.s3.access_key_id,
              secret_access_key: "", // Don't populate secret
              region: storageConfig.s3.region,
            }
          : undefined,
        local: storageConfig.local,
      });
    }
  }, [storageConfig]);

  useEffect(() => {
    if (fileLimits) {
      setLimitsFormData({
        max_file_size: fileLimits.max_file_size,
        allowed_mime_types: fileLimits.allowed_mime_types,
        blocked_mime_types: fileLimits.blocked_mime_types,
        max_versions_per_file: fileLimits.max_versions_per_file,
        retention_days: fileLimits.retention_days,
      });
    }
  }, [fileLimits]);

  useEffect(() => {
    if (thumbnailConfig) {
      setThumbnailFormData({
        default_width: thumbnailConfig.default_width,
        default_height: thumbnailConfig.default_height,
        quality: thumbnailConfig.quality,
        cache_enabled: thumbnailConfig.cache_enabled,
        max_cache_size: thumbnailConfig.max_cache_size,
      });
    }
  }, [thumbnailConfig]);

  const isLoading = storageLoading || limitsLoading || thumbnailLoading;
  const error = storageError || limitsError || thumbnailError;
  const isSaving = isUpdatingStorage || isUpdatingLimits || isUpdatingThumbnail;

  // Check if there are changes
  const hasStorageChanges =
    JSON.stringify(storageFormData) !==
    JSON.stringify({
      backend: storageConfig?.backend || "local",
      s3: storageConfig?.s3
        ? {
            bucket_name: storageConfig.s3.bucket_name,
            access_key_id: storageConfig.s3.access_key_id,
            secret_access_key: "",
            region: storageConfig.s3.region,
          }
        : undefined,
      local: storageConfig?.local,
    });

  const hasLimitsChanges =
    JSON.stringify(limitsFormData) !==
    JSON.stringify({
      max_file_size: fileLimits?.max_file_size,
      allowed_mime_types: fileLimits?.allowed_mime_types,
      blocked_mime_types: fileLimits?.blocked_mime_types,
      max_versions_per_file: fileLimits?.max_versions_per_file,
      retention_days: fileLimits?.retention_days,
    });

  const hasThumbnailChanges =
    JSON.stringify(thumbnailFormData) !==
    JSON.stringify({
      default_width: thumbnailConfig?.default_width,
      default_height: thumbnailConfig?.default_height,
      quality: thumbnailConfig?.quality,
      cache_enabled: thumbnailConfig?.cache_enabled,
      max_cache_size: thumbnailConfig?.max_cache_size,
    });

  const hasChanges =
    hasStorageChanges || hasLimitsChanges || hasThumbnailChanges;

  const handleSave = () => {
    if (hasStorageChanges) {
      updateStorage(storageFormData);
    }
    if (hasLimitsChanges) {
      updateLimits(limitsFormData);
    }
    if (hasThumbnailChanges) {
      updateThumbnail(thumbnailFormData);
    }
  };

  const handleReset = () => {
    if (storageConfig) {
      setStorageFormData({
        backend: storageConfig.backend,
        s3: storageConfig.s3
          ? {
              bucket_name: storageConfig.s3.bucket_name,
              access_key_id: storageConfig.s3.access_key_id,
              secret_access_key: "",
              region: storageConfig.s3.region,
            }
          : undefined,
        local: storageConfig.local,
      });
    }
    if (fileLimits) {
      setLimitsFormData({
        max_file_size: fileLimits.max_file_size,
        allowed_mime_types: fileLimits.allowed_mime_types,
        blocked_mime_types: fileLimits.blocked_mime_types,
        max_versions_per_file: fileLimits.max_versions_per_file,
        retention_days: fileLimits.retention_days,
      });
    }
    if (thumbnailConfig) {
      setThumbnailFormData({
        default_width: thumbnailConfig.default_width,
        default_height: thumbnailConfig.default_height,
        quality: thumbnailConfig.quality,
        cache_enabled: thumbnailConfig.cache_enabled,
        max_cache_size: thumbnailConfig.max_cache_size,
      });
    }
  };

  if (isLoading) {
    return (
      <ConfigPageLayout
        title={t("config.files.title")}
        description={t("config.files.description")}
        loading={true}
      >
        <ConfigLoadingState lines={6} />
      </ConfigPageLayout>
    );
  }

  if (error) {
    return (
      <ConfigPageLayout
        title={t("config.files.title")}
        description={t("config.files.description")}
        error={error instanceof Error ? error : String(error)}
      >
        <ConfigErrorState message={t("config.files.errorLoading")} />
      </ConfigPageLayout>
    );
  }

  return (
    <ConfigPageLayout
      title={t("config.files.title")}
      description={t("config.files.description")}
      hasChanges={hasChanges}
      isSaving={isSaving}
      onReset={handleReset}
      onSave={handleSave}
      saveDisabled={!hasChanges}
    >
      <Tabs defaultValue="storage" className="space-y-6">
        <TabsList>
          <TabsTrigger value="storage">
            {t("config.files.tabs.storage")}
          </TabsTrigger>
          <TabsTrigger value="stats">
            {t("config.files.tabs.stats")}
          </TabsTrigger>
          <TabsTrigger value="limits">
            {t("config.files.tabs.limits")}
          </TabsTrigger>
          <TabsTrigger value="thumbnails">
            {t("config.files.tabs.thumbnails")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="storage" className="space-y-6">
          <StorageConfig
            value={storageFormData}
            onChange={setStorageFormData}
          />
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <StorageStats />
        </TabsContent>

        <TabsContent value="limits" className="space-y-6">
          <FileLimits value={limitsFormData} onChange={setLimitsFormData} />
        </TabsContent>

        <TabsContent value="thumbnails" className="space-y-6">
          <ThumbnailConfig
            value={thumbnailFormData}
            onChange={setThumbnailFormData}
          />
        </TabsContent>
      </Tabs>
    </ConfigPageLayout>
  );
}
