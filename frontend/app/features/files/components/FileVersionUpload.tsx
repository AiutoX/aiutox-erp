/**
 * FileVersionUpload Component
 * Allows uploading a new version of an existing file
 */

import { useState, useRef, useCallback } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Progress } from "~/components/ui/progress";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useFileVersionCreate } from "../hooks/useFiles";

export interface FileVersionUploadProps {
  fileId: string;
  onVersionCreated?: () => void;
}

/**
 * FileVersionUpload component
 */
export function FileVersionUpload({
  fileId,
  onVersionCreated,
}: FileVersionUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [changeDescription, setChangeDescription] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const { mutate: createVersion, isPending: uploading } =
    useFileVersionCreate();

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
      }
    },
    []
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleUpload = useCallback(() => {
    if (!selectedFile) {
      showToast(
        t("files.noFileSelected") || "No hay archivo seleccionado",
        "error"
      );
      return;
    }

    createVersion(
      {
        fileId,
        file: selectedFile,
        changeDescription: changeDescription.trim() || null,
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
      },
      {
        onSuccess: () => {
          showToast(
            t("files.versionCreated") || "Versión creada exitosamente",
            "success"
          );
          setSelectedFile(null);
          setChangeDescription("");
          setUploadProgress(0);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          onVersionCreated?.();
        },
        onError: () => {
          showToast(
            t("files.versionCreateError") || "Error al crear versión",
            "error"
          );
          setUploadProgress(0);
        },
      }
    );
  }, [
    selectedFile,
    changeDescription,
    fileId,
    createVersion,
    onVersionCreated,
    t,
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {t("files.createVersion") || "Crear Nueva Versión"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t("files.selectFile") || "Seleccionar Archivo"}</Label>
          {selectedFile ? (
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={handleClick}
              disabled={uploading}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {t("files.selectFiles")}
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="change-description">
            {t("files.changeDescription") || "Descripción de Cambios"} (
            {t("files.optional") || "Opcional"})
          </Label>
          <Textarea
            id="change-description"
            value={changeDescription}
            onChange={(e) => setChangeDescription(e.target.value)}
            placeholder={
              t("files.changeDescriptionPlaceholder") ||
              "Describe los cambios en esta versión..."
            }
            rows={3}
            disabled={uploading}
          />
        </div>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{t("files.uploading") || "Subiendo..."}</span>
              <span className="text-muted-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full"
        >
          {uploading
            ? t("files.uploading") || "Subiendo..."
            : t("files.createVersion") || "Crear Versión"}
        </Button>
      </CardContent>
    </Card>
  );
}
