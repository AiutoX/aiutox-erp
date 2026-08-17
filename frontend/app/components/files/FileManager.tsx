import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  listFiles,
  deleteFile,
  downloadFile,
  getFilePreview,
  type File as FileResponse,
} from "~/lib/api/files.api";
import { toast } from "sonner";

export interface FileManagerProps {
  entityType?: string;
  entityId?: string;
  onFileSelect?: (file: FileResponse) => void;
}

export function FileManager({
  entityType,
  entityId,
  onFileSelect,
}: FileManagerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileResponse | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<
    string | undefined
  >(entityType);
  const [selectedEntityId] = useState<string | undefined>(entityId);

  const { data, isLoading, error } = useQuery({
    queryKey: ["files", selectedEntityType, selectedEntityId],
    queryFn: () =>
      listFiles({
        page: 1,
        page_size: 100,
        entity_type: selectedEntityType,
        entity_id: selectedEntityId,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success(t("config.files.deleteSuccess"));
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    },
    onError: (error) => {
      toast.error(
        `${t("config.files.errorDeleting")}: ${error instanceof Error ? error.message : t("config.common.errorUnknown")}`
      );
    },
  });

  const handleDelete = (file: FileResponse) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (fileToDelete) {
      deleteMutation.mutate(fileToDelete.id);
    }
  };

  const handleDownload = async (file: FileResponse) => {
    try {
      const blob = await downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error(
        `Error al descargar: ${error instanceof Error ? error.message : t("config.common.errorUnknown")}`
      );
    }
  };

  const handlePreview = async (file: FileResponse) => {
    try {
      // Only preview images
      if (file.mime_type.startsWith("image/")) {
        const blob = await getFilePreview(file.id, { width: 800, height: 600 });
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
        // Clean up after a delay
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } else {
        toast.info("La vista previa solo está disponible para imágenes");
      }
    } catch (error) {
      toast.error(
        `Error al obtener vista previa: ${error instanceof Error ? error.message : t("config.common.errorUnknown")}`
      );
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p>{t("config.files.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">
          {t("config.files.errorLoading")}:{" "}
          {error instanceof Error
            ? error.message
            : t("config.common.errorUnknown")}
        </p>
      </div>
    );
  }

  const files = data?.data || [];

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <Select
            value={selectedEntityType || "all"}
            onValueChange={(value) =>
              setSelectedEntityType(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("config.files.filterByEntity")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("config.files.allEntities")}
              </SelectItem>
              <SelectItem value="product">Producto</SelectItem>
              <SelectItem value="order">Orden</SelectItem>
              <SelectItem value="user">Usuario</SelectItem>
              <SelectItem value="organization">Organización</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* File List */}
      {files.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {t("config.files.noFiles")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {files.map((file) => (
            <Card key={file.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {file.name}
                      <Badge variant="outline">v{file.version_number}</Badge>
                      {file.entity_type && (
                        <Badge variant="secondary">{file.entity_type}</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1 space-y-1">
                      <p>
                        {t("config.files.originalName")}: {file.original_name}
                      </p>
                      <p>
                        {t("config.files.size")}: {formatFileSize(file.size)} •{" "}
                        {file.mime_type}
                      </p>
                      {file.description && <p>{file.description}</p>}
                      <p className="text-xs">
                        {t("config.files.uploadedAt")}:{" "}
                        {formatDate(file.created_at)}
                      </p>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.mime_type.startsWith("image/") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(file)}
                      >
                        {t("config.files.preview")}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file)}
                    >
                      {t("config.files.download")}
                    </Button>
                    {onFileSelect && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onFileSelect(file)}
                      >
                        {t("config.common.edit")}
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(file)}
                      disabled={deleteMutation.isPending}
                    >
                      {t("config.files.delete")}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("config.files.deleteConfirm")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("config.files.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("config.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("config.files.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
