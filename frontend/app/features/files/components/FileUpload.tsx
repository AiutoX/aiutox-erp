/**
 * FileUpload Component
 * Handles file upload with drag & drop support and permissions
 * Improved UX: Configuration first, then drag & drop
 */

import { useCallback, useState, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useFileUpload } from "../hooks/useFiles";
import { addFileTags } from "../api/files.api";
import { FileUploadConfig } from "./FileUploadConfig";
import { Upload, X } from "lucide-react";
import { cn } from "~/lib/utils";
import type {
  FileUploadParams,
  FilePermissionRequest,
} from "../types/file.types";

export interface FileUploadProps {
  entityType?: string | null;
  entityId?: string | null;
  folderId?: string | null;
  description?: string | null;
  onUploadSuccess?: () => void;
  multiple?: boolean;
  accept?: string;
  maxSize?: number; // in bytes
  showPermissions?: boolean;
}

/**
 * FileUpload component with improved UX: Configuration first, then drag & drop
 */
export function FileUpload({
  entityType,
  entityId,
  folderId: initialFolderId,
  description: initialDescription,
  onUploadSuccess,
  multiple = false,
  accept,
  maxSize,
  showPermissions = true,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [config, setConfig] = useState<{
    folderId: string | null;
    description: string | null;
    permissions: FilePermissionRequest[];
    tags: string[];
  }>({
    folderId: initialFolderId || null,
    description: initialDescription || null,
    permissions: [],
    tags: [],
  });
  const [showDragDrop, setShowDragDrop] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const { mutate: uploadFile, isPending: uploading } = useFileUpload();

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      if (!multiple && files.length > 1) {
        showToast(t("files.uploadError"), "error");
        return;
      }

      handleFilesSelection(files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [multiple, t]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      if (!multiple && files.length > 1) {
        showToast(t("files.uploadError"), "error");
        return;
      }

      handleFilesSelection(files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [multiple, t]
  );

  const handleFilesSelection = useCallback(
    (files: File[]) => {
      const validFiles: File[] = [];

      files.forEach((file) => {
        // Validate file size
        if (maxSize && file.size > maxSize) {
          showToast(t("files.fileTooLarge") + `: ${file.name}`, "error");
          return;
        }

        // Validate file type
        if (accept) {
          const acceptedTypes = accept.split(",").map((t) => t.trim());
          const fileType = file.type || "";
          const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;

          const isAccepted = acceptedTypes.some(
            (type) =>
              fileType === type ||
              (type.startsWith(".") && fileExtension === type) ||
              (type.endsWith("/*") && fileType.startsWith(type.slice(0, -2)))
          );

          if (!isAccepted) {
            showToast(t("files.invalidFileType") + `: ${file.name}`, "error");
            return;
          }
        }

        validFiles.push(file);
      });

      if (validFiles.length > 0) {
        setSelectedFiles((prev) => {
          if (multiple) {
            return [...prev, ...validFiles];
          }
          return validFiles;
        });
        setShowDragDrop(true);
      }
    },
    [maxSize, accept, multiple, t]
  );

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleStartUpload = useCallback(() => {
    if (selectedFiles.length === 0) {
      showToast(
        t("files.noFilesSelected") || "No hay archivos seleccionados",
        "error"
      );
      return;
    }

    selectedFiles.forEach((file) => {
      const uploadParams: FileUploadParams = {
        file,
        entity_type: entityType || undefined,
        entity_id: entityId || undefined,
        folder_id: config.folderId || undefined,
        description: config.description || undefined,
        permissions:
          config.permissions.length > 0 ? config.permissions : undefined,
        onProgress: (progress) => {
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: progress,
          }));
        },
      };

      uploadFile(uploadParams, {
        onSuccess: async (response) => {
          // Add tags if any were selected
          if (config.tags.length > 0 && response.data?.id) {
            try {
              await addFileTags(response.data.id, config.tags);
            } catch (error) {
              console.error("Failed to add tags to file:", error);
            }
          }
          showToast(t("files.uploadSuccess"), "success");
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
          // Clear files and config after successful upload
          setSelectedFiles([]);
          setConfig({
            folderId: null,
            description: null,
            permissions: [],
            tags: [],
          });
          setShowDragDrop(false);
          onUploadSuccess?.();
        },
        onError: () => {
          showToast(t("files.uploadError"), "error");
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        },
      });
    });
  }, [
    selectedFiles,
    config,
    entityType,
    entityId,
    uploadFile,
    onUploadSuccess,
    t,
  ]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-4">
      {/* Configuration Step */}
      {showPermissions && (
        <FileUploadConfig
          entityType={entityType}
          entityId={entityId}
          folderId={config.folderId}
          description={config.description}
          permissions={config.permissions}
          tags={config.tags}
          onConfigChange={setConfig}
        />
      )}

      {/* Drag & Drop Area */}
      {showDragDrop && (
        <Card
          className={cn(
            "border-2 border-dashed transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              {isDragging ? t("files.dragDropActive") : t("files.dragDrop")}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleClick}
              disabled={uploading}
            >
              {t("files.selectFiles")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple={multiple}
              accept={accept}
              onChange={handleFileSelect}
            />
          </CardContent>
        </Card>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {t("files.selectedFiles") || "Archivos Seleccionados"} (
                  {selectedFiles.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFiles([]);
                    setShowDragDrop(false);
                  }}
                >
                  {t("common.clear") || "Limpiar"}
                </Button>
              </div>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                className="w-full"
                onClick={handleStartUpload}
                disabled={uploading || selectedFiles.length === 0}
              >
                {uploading
                  ? t("files.uploading") || "Subiendo..."
                  : t("files.uploadFiles") ||
                    `Subir ${selectedFiles.length} archivo${selectedFiles.length > 1 ? "s" : ""}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">{fileName}</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          ))}
        </div>
      )}

      {/* Show drag & drop if no files selected and config is ready */}
      {!showDragDrop && selectedFiles.length === 0 && (
        <Card
          className={cn(
            "border-2 border-dashed transition-colors cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              {isDragging ? t("files.dragDropActive") : t("files.dragDrop")}
            </p>
            <Button type="button" variant="outline" disabled={uploading}>
              {t("files.selectFiles")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple={multiple}
              accept={accept}
              onChange={handleFileSelect}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
