/**
 * StorageStats - Componente para mostrar estadísticas de almacenamiento
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { ConfigSection } from "~/components/config/ConfigSection";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { useStorageStats } from "~/hooks/useFilesConfig";
import { ConfigLoadingState } from "~/components/config/ConfigLoadingState";
import { ConfigErrorState } from "~/components/config/ConfigErrorState";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function StorageStats() {
  const { t } = useTranslation();
  const { data: stats, isLoading, error } = useStorageStats();

  if (isLoading) {
    return (
      <ConfigSection
        title={t("config.files.stats.title")}
        description={t("config.files.stats.description")}
      >
        <ConfigLoadingState lines={3} />
      </ConfigSection>
    );
  }

  if (error) {
    return (
      <ConfigSection
        title={t("config.files.stats.title")}
        description={t("config.files.stats.description")}
      >
        <ConfigErrorState
          message={error instanceof Error ? error.message : String(error)}
        />
      </ConfigSection>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <ConfigSection
      title={t("config.files.stats.title")}
      description={t("config.files.stats.description")}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("config.files.stats.totalSpace")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(stats.total_space_used)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("config.files.stats.totalFiles")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total_files.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("config.files.stats.totalFolders")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total_folders?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("config.files.stats.totalVersions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total_versions.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("config.files.stats.filesWithPermissions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.files_with_permissions?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total_files > 0
                ? `${Math.round(((stats.files_with_permissions || 0) / stats.total_files) * 100)}% de archivos`
                : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("config.files.stats.foldersWithPermissions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.folders_with_permissions?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total_folders > 0
                ? `${Math.round(((stats.folders_with_permissions || 0) / stats.total_folders) * 100)}% de carpetas`
                : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {Object.keys(stats.mime_distribution).length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">
            {t("config.files.stats.mimeDistribution")}
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.mime_distribution)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([mime, count]) => (
                <Badge key={mime} variant="secondary">
                  {mime}: {count}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {Object.keys(stats.entity_distribution).length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">
            {t("config.files.stats.entityDistribution")}
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.entity_distribution)
              .sort(([, a], [, b]) => b - a)
              .map(([entity, count]) => (
                <Badge key={entity} variant="outline">
                  {entity}: {count}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {(Object.keys(stats.file_permission_distribution || {}).length > 0 ||
        Object.keys(stats.folder_permission_distribution || {}).length > 0) && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">
            {t("config.files.stats.permissionDistribution")}
          </h4>
          <div className="space-y-4">
            {Object.keys(stats.file_permission_distribution || {}).length >
              0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  {t("config.files.stats.filePermissions")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.file_permission_distribution || {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([target_type, count]) => (
                      <Badge key={`file-${target_type}`} variant="secondary">
                        {target_type}: {count}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
            {Object.keys(stats.folder_permission_distribution || {}).length >
              0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  {t("config.files.stats.folderPermissions")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.folder_permission_distribution || {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([target_type, count]) => (
                      <Badge key={`folder-${target_type}`} variant="secondary">
                        {target_type}: {count}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ConfigSection>
  );
}
