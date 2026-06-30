/**
 * FileList Component
 * Lista de archivos adjuntos a una tarea
 * Sprint 2.3 - Fase 2
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  File01Icon,
  Delete01Icon,
  Download01Icon,
} from "@hugeicons/core-free-icons";
import { useTaskFiles, useDetachFile } from "../hooks/useTaskFiles";
import { showToast } from "~/components/common/Toast";
import { format } from "date-fns";
import { downloadFile } from "~/features/files/api/files.api";

interface FileListProps {
  taskId: string;
  showTitle?: boolean;
}

export function FileList({ taskId, showTitle = true }: FileListProps) {
  console.warn("=== FileList RENDERED ===");
  console.warn("taskId:", taskId);
  console.warn("showTitle:", showTitle);

  const { t } = useTranslation();
  const { data, isLoading } = useTaskFiles(taskId);
  const detachMutation = useDetachFile();

  // Manejar éxito y error del mutation
  React.useEffect(() => {
    if (detachMutation.isSuccess) {
      showToast("Archivo eliminado correctamente", "success");
    }
    if (detachMutation.isError) {
      showToast("Error al eliminar archivo", "error");
      console.error("Delete error:", detachMutation.error);
    }
  }, [detachMutation.isSuccess, detachMutation.isError, detachMutation.error]);

  const files = data?.data || [];

  const handleDelete = (fileId: string, fileName: string) => {
    console.warn("=== DELETE BUTTON CLICKED ===");
    console.warn("fileId:", fileId);
    console.warn("fileName:", fileName);

    // Simplificado: solo hacer la confirmación y llamar a la API
    if (window.confirm(`¿Estás seguro de eliminar el archivo "${fileName}"?`)) {
      console.warn("User confirmed deletion");
      detachMutation.mutate({ taskId, fileId });
    } else {
      console.warn("User cancelled deletion");
    }
  };

  // Botón de prueba simple
  const handleTestClick = () => {
    console.warn("=== TEST BUTTON CLICKED ===");
    alert("Botón de prueba funciona!");
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      // Descargar el archivo usando el módulo de files
      const blob = await downloadFile(fileId);

      // Crear una URL temporal y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast("Archivo descargado correctamente", "success");
    } catch (error) {
      showToast("Error al descargar archivo", "error");
      console.error("Download error:", error);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return "🖼️";
    } else if (fileType.startsWith("video/")) {
      return "🎥";
    } else if (fileType.includes("pdf")) {
      return "📄";
    } else if (fileType.includes("word") || fileType.includes("document")) {
      return "📝";
    } else if (fileType.includes("sheet") || fileType.includes("excel")) {
      return "📊";
    } else if (fileType.includes("zip") || fileType.includes("rar")) {
      return "📦";
    }
    return "📎";
  };

  if (isLoading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle>
              {t("tasks.files.title") || "Archivos Adjuntos"}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle>
              {t("tasks.files.title") || "Archivos Adjuntos"}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <HugeiconsIcon
              icon={File01Icon}
              size={48}
              className="mx-auto mb-2 opacity-50"
            />
            <p className="text-sm">
              {t("tasks.files.noFiles") || "No hay archivos adjuntos"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle>
            {t("tasks.files.title") || "Archivos Adjuntos"} ({files.length})
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {/* Botón de prueba para depuración */}
        <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded">
          <p className="text-sm text-yellow-800 mb-2">
            Botón de prueba (depuración):
          </p>
          <button
            onClick={handleTestClick}
            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Probar Click
          </button>
        </div>

        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.file_id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="text-2xl shrink-0">
                  {getFileIcon(file.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {file.file_name}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>{(file.file_size / 1024 / 1024).toFixed(2)} MB</span>
                    <span>•</span>
                    <span>
                      {format(new Date(file.attached_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void handleDownload(file.file_id, file.file_name);
                  }}
                  title={t("tasks.files.download") || "Descargar"}
                >
                  <HugeiconsIcon icon={Download01Icon} size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.warn("=== BUTTON ONCLICK FIRED ===");
                    void handleDelete(file.file_id, file.file_name);
                  }}
                  disabled={detachMutation.isPending}
                  title={t("tasks.files.delete") || "Eliminar"}
                  className="text-destructive hover:text-destructive"
                >
                  <HugeiconsIcon icon={Delete01Icon} size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
