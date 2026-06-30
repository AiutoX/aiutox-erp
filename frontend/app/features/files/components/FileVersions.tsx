/**
 * FileVersions Component
 * Displays and manages file versions with restore functionality
 */

import { useState } from "react";
import { Download, History, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  useFileVersions,
  useFileVersionDownload,
  useFileVersionRestore,
  useFile,
} from "../hooks/useFiles";
import { formatFileSize } from "../utils/fileUtils";
import { showToast } from "~/components/common/Toast";

export interface FileVersionsProps {
  fileId: string;
}

/**
 * FileVersions component
 */
export function FileVersions({ fileId }: FileVersionsProps) {
  const { t } = useTranslation();
  const { versions, loading, error, refresh } = useFileVersions(fileId);
  const { file } = useFile(fileId);
  const { mutate: downloadVersion, isPending: downloading } =
    useFileVersionDownload();
  const { mutate: restoreVersion, isPending: restoring } =
    useFileVersionRestore();
  const [restoreConfirm, setRestoreConfirm] = useState<{
    open: boolean;
    versionId: string | null;
    versionNumber: number | null;
  }>({ open: false, versionId: null, versionNumber: null });

  const currentVersionNumber = file?.version_number || 1;

  const handleDownloadVersion = (versionId: string, fileName: string) => {
    downloadVersion(
      { fileId, versionId },
      {
        onSuccess: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        },
        onError: () => {
          showToast(t("files.error"), "error");
        },
      }
    );
  };

  const handleRestoreVersion = (versionId: string, versionNumber: number) => {
    setRestoreConfirm({
      open: true,
      versionId,
      versionNumber,
    });
  };

  const confirmRestore = () => {
    if (!restoreConfirm.versionId) return;

    restoreVersion(
      {
        fileId,
        versionId: restoreConfirm.versionId,
        changeDescription:
          t("files.restoredFromVersion")?.replace(
            "{version}",
            restoreConfirm.versionNumber?.toString() || ""
          ) || `Restored from version ${restoreConfirm.versionNumber}`,
      },
      {
        onSuccess: () => {
          showToast(
            t("files.versionRestored") || "Versión restaurada exitosamente",
            "success"
          );
          refresh();
          setRestoreConfirm({
            open: false,
            versionId: null,
            versionNumber: null,
          });
        },
        onError: () => {
          showToast(
            t("files.versionRestoreError") || "Error al restaurar versión",
            "error"
          );
          setRestoreConfirm({
            open: false,
            versionId: null,
            versionNumber: null,
          });
        },
      }
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>{t("files.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    // Show more specific error message
    const errorMessage =
      error instanceof Error
        ? error.message
        : t("files.error") || "Error al cargar versiones";
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t("files.versions")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-2">
            <p className="text-destructive text-sm font-medium">
              {errorMessage}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("files.errorLoadingVersions") ||
                "No se pudieron cargar las versiones del archivo"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              className="mt-2"
            >
              {t("common.retry") || "Reintentar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t("files.versions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t("files.noVersions") || "No hay versiones disponibles"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort versions by version number (descending - newest first)
  const sortedVersions = [...versions].sort(
    (a, b) => b.version_number - a.version_number
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t("files.versions")} ({versions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("files.versionNumber")}</TableHead>
                <TableHead>{t("files.type")}</TableHead>
                <TableHead>{t("files.size")}</TableHead>
                <TableHead>{t("files.changeDescription")}</TableHead>
                <TableHead>{t("files.uploadedAt")}</TableHead>
                <TableHead className="w-[200px]">
                  {t("files.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedVersions.map((version) => {
                const isCurrent =
                  version.version_number === currentVersionNumber;
                return (
                  <TableRow key={version.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          v{version.version_number}
                        </span>
                        {isCurrent && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t("files.current") || "Actual"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{version.mime_type}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatFileSize(version.size)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {version.change_description || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {new Date(version.created_at).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDownloadVersion(
                              version.id,
                              `v${version.version_number}_${file?.original_name || "file"}`
                            )
                          }
                          disabled={downloading}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {t("files.download")}
                        </Button>
                        {!isCurrent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleRestoreVersion(
                                version.id,
                                version.version_number
                              )
                            }
                            disabled={restoring}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            {t("files.restore") || "Restaurar"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={restoreConfirm.open}
        onClose={() =>
          setRestoreConfirm({
            open: false,
            versionId: null,
            versionNumber: null,
          })
        }
        onConfirm={confirmRestore}
        title={t("files.restoreVersionConfirm") || "¿Restaurar versión?"}
        description={
          t("files.restoreVersionConfirmDesc")?.replace(
            "{version}",
            restoreConfirm.versionNumber?.toString() || ""
          ) ||
          `¿Estás seguro de que deseas restaurar la versión ${restoreConfirm.versionNumber}? Se creará una nueva versión con el contenido de esta versión.`
        }
        variant="default"
        loading={restoring}
      />
    </>
  );
}
