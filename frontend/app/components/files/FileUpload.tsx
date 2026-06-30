import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { uploadFile, type File as FileResponse } from "~/lib/api/files.api";
import { toast } from "sonner";

interface FileUploadProps {
  entityType?: string;
  entityId?: string;
  onUploadSuccess?: (file: FileResponse) => void;
  onCancel?: () => void;
}

export function FileUpload({
  entityType,
  entityId,
  onUploadSuccess,
  onCancel,
}: FileUploadProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(
    null
  );
  const [description, setDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return uploadFile(file, {
        entity_type: entityType,
        entity_id: entityId,
        description: description || undefined,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success(t("config.files.uploadSuccess"));
      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }
      // Reset form
      setSelectedFile(null);
      setDescription("");
    },
    onError: (error) => {
      toast.error(
        `${t("config.files.errorUploading")}: ${error instanceof Error ? error.message : t("config.common.errorUnknown")}`
      );
    },
  });

  const handleFileSelect = useCallback((file: globalThis.File) => {
    setSelectedFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

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

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0 && files[0]) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedFile) {
        uploadMutation.mutate(selectedFile);
      }
    },
    [selectedFile, uploadMutation]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("config.files.upload")}</CardTitle>
        <CardDescription>{t("config.files.uploadDragDrop")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drag & Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  {t("config.common.cancel")}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t("config.files.uploadDragDrop")}
                </p>
                <div>
                  <Input
                    type="file"
                    onChange={handleFileInputChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label htmlFor="file-upload">
                    <Button type="button" variant="outline" asChild>
                      <span>{t("config.files.uploadSelect")}</span>
                    </Button>
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("config.files.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("config.files.description")}
              rows={3}
            />
          </div>

          {/* Entity Info (if provided) */}
          {entityType && (
            <div className="text-sm text-muted-foreground">
              <p>
                {t("config.files.entityType")}: {entityType}
              </p>
              {entityId && (
                <p>
                  {t("config.files.entityId")}: {entityId}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {t("config.common.cancel")}
              </Button>
            )}
            <Button
              type="submit"
              disabled={!selectedFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending
                ? t("config.common.saving")
                : t("config.files.upload")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
