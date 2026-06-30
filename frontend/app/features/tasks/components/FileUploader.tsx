/**
 * FileUploader Component
 * Componente para subir archivos con drag & drop
 * Sprint 2.3 - Fase 2
 */

import { useState, useCallback, useRef } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { Upload01Icon } from "@hugeicons/core-free-icons";
import {
  useAttachFile,
  useTaskFiles,
  useDetachFile,
} from "../hooks/useTaskFiles";
import { showToast } from "~/components/common/Toast";
import { cn } from "~/lib/utils";
import { uploadFile } from "~/features/files/api/files.api";
import {
  validateFile,
  getFileInfo,
} from "~/features/files/utils/fileValidation";
import { UploadProgress } from "~/features/files/components/UploadProgress";

interface TaskFile {
  file_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url?: string;
}

interface FileUploaderProps {
  taskId: string;
  onUploadComplete?: () => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export function FileUploader({
  taskId,
  onUploadComplete,
  maxSizeMB = 10,
  acceptedTypes = ["*/*"],
}: FileUploaderProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMutation = useAttachFile();
  const detachMutation = useDetachFile();
  const { data: filesData } = useTaskFiles(taskId);

  const existingFiles = filesData?.data || [];
  const hasFiles = existingFiles.length > 0;

  // Logs para depurar
  console.warn("[FileUploader] filesData:", filesData);
  console.warn("[FileUploader] existingFiles:", existingFiles);
  console.warn("[FileUploader] hasFiles:", hasFiles);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      // Validar archivo
      const validation = validateFile(file, {
        maxSizeMB,
        allowedTypes: acceptedTypes,
      });

      if (!validation.isValid) {
        showToast(validation.error || "Error de validación", "error");
        return;
      }

      // Mostrar advertencias si las hay
      if (validation.warnings && validation.warnings.length > 0) {
        validation.warnings.forEach((warning) => {
          showToast(warning, "warning");
        });
      }

      setSelectedFile(file);
    },
    [maxSizeMB, acceptedTypes]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && files[0]) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validar archivo nuevamente
    const validation = validateFile(file, {
      maxSizeMB,
      allowedTypes: acceptedTypes,
    });

    if (!validation.isValid) {
      showToast(validation.error || "Error de validación", "error");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Obtener información del archivo
      const fileInfo = getFileInfo(file);

      // Paso 1: Subir archivo al módulo de files
      const uploadResponse = await uploadFile(file, {
        entity_type: "task",
        entity_id: taskId,
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
      });

      console.warn("=== Step 1 completed: File uploaded to files module ===");
      console.warn("uploadResponse:", uploadResponse);

      // Paso 2: Adjuntar archivo a la tarea
      console.warn("=== Starting Step 2: Attach file to task ===");
      console.warn("attachMutation.mutateAsync called with:", {
        taskId,
        fileId: uploadResponse.data.id,
        fileName: uploadResponse.data.original_name,
        fileSize: uploadResponse.data.size,
        fileType: uploadResponse.data.mime_type,
        fileUrl: uploadResponse.data.storage_url || "",
      });

      try {
        await attachMutation.mutateAsync({
          taskId,
          fileId: uploadResponse.data.id,
          fileName: uploadResponse.data.original_name,
          fileSize: uploadResponse.data.size,
          fileType: uploadResponse.data.mime_type,
          fileUrl: uploadResponse.data.storage_url || "",
        });
        console.warn("=== Step 2 completed: File attached to task ===");
      } catch (attachError) {
        console.error("=== Step 2 failed: Could not attach file to task ===");
        console.error("Attach error:", attachError);
        throw attachError;
      }

      showToast(
        `Archivo "${fileInfo.name}" adjuntado correctamente`,
        "success"
      );
      setSelectedFile(null);
      setUploadProgress(0);
      // Limpiar el input del archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onUploadComplete?.();
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      setUploadError(errorMessage);
      showToast("Error al adjuntar archivo", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRetryUpload = () => {
    if (selectedFile) {
      setUploadError(null);
      void handleFileUpload(selectedFile);
    }
  };

  const handleCancelUpload = () => {
    setUploading(false);
    setUploadProgress(0);
    setUploadError(null);
  };

  const handleViewFile = (file: TaskFile) => {
    // Abrir archivo en nueva pestaña
    if (file.file_url) {
      window.open(file.file_url, "_blank");
    }
  };

  const handleDownloadFile = (file: TaskFile) => {
    // Descargar archivo
    if (file.file_url) {
      const link = document.createElement("a");
      link.href = file.file_url;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteFile = (file: TaskFile) => {
    // Prevenir propagación del evento
    console.warn("=== DELETE FILE BUTTON CLICKED ===");
    console.warn("file:", file);
    console.warn("file_id:", file.file_id);

    void (async () => {
      try {
        console.warn("Starting file deletion...");
        await detachMutation.mutateAsync({
          taskId,
          fileId: file.file_id,
        });
        showToast("Archivo eliminado correctamente", "success");
        console.warn("File deletion successful");
      } catch (error) {
        showToast("Error al eliminar archivo", "error");
        console.error("Delete error:", error);
      }
    })();
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex flex-col space-y-1 p-4">
        <h3 className="text-lg font-semibold leading-none tracking-tight">
          Archivos ({existingFiles.length})
        </h3>
      </div>

      {/* Content */}
      <div className="p-4 pt-0">
        {/* Archivos existentes */}
        {hasFiles ? (
          <div className="space-y-1 mb-3">
            {existingFiles.map((file: TaskFile) => (
              <div
                key={file.file_id}
                className="flex items-center justify-between p-2 bg-muted/20 rounded"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="shrink-0">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      <HugeiconsIcon
                        icon={Upload01Icon}
                        size={16}
                        className="text-primary"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleViewFile(file)}
                    disabled={!file.file_url}
                    title="Ver archivo"
                  >
                    <span className="text-xs">👁️</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleDownloadFile(file)}
                    disabled={!file.file_url}
                    title="Descargar archivo"
                  >
                    <span className="text-xs">⬇️</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    data-testid="delete-file-button"
                    onClick={(e) => {
                      console.warn("=== BUTTON CLICKED ===");
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      handleDeleteFile(file);
                    }}
                    disabled={detachMutation.isPending}
                    title="Eliminar archivo"
                  >
                    <span className="text-xs">
                      {detachMutation.isPending ? "..." : "❌"}
                    </span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground mb-3">
            <HugeiconsIcon
              icon={Upload01Icon}
              size={32}
              className="mx-auto mb-1 opacity-50"
            />
            <p className="text-xs">No hay archivos</p>
          </div>
        )}

        {/* Upload area integrado */}
        {!uploading ? (
          <div
            className={cn(
              "flex items-center justify-between p-3 rounded transition-colors",
              "bg-muted/20 border border-dashed border-border min-h-[60px] cursor-pointer",
              "hover:bg-muted/30",
              isDragging && "border-primary bg-primary/5"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!selectedFile ? (
              <div className="flex items-center space-x-3 flex-1">
                <HugeiconsIcon
                  icon={Upload01Icon}
                  size={16}
                  className={cn(
                    "transition-colors",
                    isDragging ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <div className="flex-1">
                  <p className="text-xs font-medium">
                    {isDragging
                      ? "Suelta el archivo aquí"
                      : t("tasks.files.dragDrop") || "Arrastra archivos aquí"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("tasks.files.orClickToSelect") ||
                      "o haz clic para seleccionar"}
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInput}
                  accept={acceptedTypes.join(",")}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      {t("tasks.files.selectFile") || "Seleccionar archivo"}
                    </span>
                  </Button>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="shrink-0">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                      <HugeiconsIcon
                        icon={Upload01Icon}
                        size={12}
                        className="text-primary"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleCancelUpload}
                    disabled={uploading && !uploadError}
                    size="sm"
                  >
                    {t("common.cancel")}
                  </Button>
                  {uploadError ? (
                    <Button
                      onClick={handleRetryUpload}
                      disabled={uploading}
                      size="sm"
                      variant="destructive"
                    >
                      {t("common.retry") || "Reintentar"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => void handleFileUpload(selectedFile)}
                      disabled={uploading}
                      size="sm"
                    >
                      {uploading
                        ? t("common.uploading")
                        : t("tasks.files.attach")}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <UploadProgress
            progress={uploadProgress}
            fileName={selectedFile?.name || "Archivo"}
            error={uploadError || undefined}
          />
        )}
      </div>
    </Card>
  );
}
