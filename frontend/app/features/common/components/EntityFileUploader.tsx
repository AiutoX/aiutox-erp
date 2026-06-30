/**
 * Entity FileUploader Component
 * Componente genérico para subir archivos a cualquier entidad (tarea, evento, etc.)
 */

import { useState, useCallback } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { Upload01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import { useAttachFile } from "~/features/tasks/hooks/useTaskFiles";
import { useAttachEventFile } from "~/features/calendar/hooks/useEventFiles";
import { showToast } from "~/components/common/Toast";
import { cn } from "~/lib/utils";
import apiClient from "~/lib/api/client";

interface EntityFileUploaderProps {
  entityId: string;
  entityType: "task" | "event";
  onUploadComplete?: () => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export function EntityFileUploader({
  entityId,
  entityType,
  onUploadComplete,
  maxSizeMB = 10,
  acceptedTypes = ["*/*"],
}: EntityFileUploaderProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Usar el hook apropiado según el tipo de entidad
  const attachTaskMutation = useAttachFile();
  const attachEventMutation = useAttachEventFile();

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
      // Validar tamaño
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        showToast(t("files.fileTooLarge"), "error");
        return;
      }

      // Validar tipo
      if (
        acceptedTypes[0] !== "*/*" &&
        !acceptedTypes.some((type: string) =>
          file.type.match(type.replace("*", ".*"))
        )
      ) {
        showToast(t("files.invalidFileType"), "error");
        return;
      }

      setSelectedFile(file);
    },
    [maxSizeMB, acceptedTypes, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]!);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]!);
      }
    },
    [handleFileSelect]
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploading(true);

    try {
      // Upload file using apiClient (includes JWT auth via interceptor)
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("entity_type", entityType);
      formData.append("entity_id", entityId);

      const uploadResponse = await apiClient.post<{
        data: {
          id: string;
          name: string;
          size: number;
          mime_type: string;
          url: string;
        };
      }>("/files/upload", formData);

      const uploadedFile = uploadResponse.data.data;

      // Luego adjuntar el archivo a la entidad
      if (entityType === "task") {
        await attachTaskMutation.mutateAsync({
          taskId: entityId,
          fileId: uploadedFile.id,
          fileName: uploadedFile.name,
          fileSize: uploadedFile.size,
          fileType: uploadedFile.mime_type,
          fileUrl: uploadedFile.url,
        });
      } else {
        await attachEventMutation.mutateAsync({
          eventId: entityId,
          fileId: uploadedFile.id,
          fileName: uploadedFile.name,
          fileSize: uploadedFile.size,
          fileType: uploadedFile.mime_type,
          fileUrl: uploadedFile.url,
        });
      }

      setSelectedFile(null);
      showToast(t("files.uploadSuccess"), "success");
      onUploadComplete?.();
    } catch (error) {
      console.error("Error al subir archivo:", error);
      showToast(t("files.uploadError"), "error");
    } finally {
      setUploading(false);
    }
  }, [
    selectedFile,
    entityId,
    entityType,
    attachTaskMutation,
    attachEventMutation,
    onUploadComplete,
    t,
  ]);

  return (
    <Card>
      <CardContent className="p-4">
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            onChange={handleFileInputChange}
            accept={acceptedTypes.join(",")}
            className="hidden"
            id="file-upload"
          />

          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <HugeiconsIcon
                icon={Upload01Icon}
                size={24}
                className="text-muted-foreground"
              />
            </div>

            <div>
              <h3 className="text-sm font-medium">{t("files.dragDrop")}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {t("files.selectFiles")}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              {t("files.selectFiles")}
            </Button>
          </div>
        </div>

        {selectedFile && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HugeiconsIcon
                  icon={Upload01Icon}
                  size={16}
                  className="text-muted-foreground"
                />
                <span className="text-sm font-medium truncate">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  <HugeiconsIcon icon={Delete01Icon} size={16} />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleUpload()}
                  disabled={uploading}
                >
                  {uploading ? t("files.uploading") : t("files.upload")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
