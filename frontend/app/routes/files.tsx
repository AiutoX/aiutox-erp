/**
 * Files Route
 * Main page for file management
 * Uses ProtectedRoute and PageLayout for consistent structure
 */

import type { Route } from "./+types/files";
import { useState } from "react";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { PageLayout } from "~/components/layout/PageLayout";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { FileList } from "../features/files/components/FileList";
import { FileUpload } from "../features/files/components/FileUpload";
import { FileDetail } from "../features/files/components/FileDetail";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
// import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import type { File } from "../features/files/types/file.types";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Archivos - AiutoX ERP" },
    {
      name: "description",
      content: "Gestión de archivos y documentos del sistema",
    },
  ];
}

export default function FilesPage() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleUploadSuccess = () => {
    // Force refresh of file list
    setRefreshKey((prev) => prev + 1);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedFile(null);
  };

  return (
    <ProtectedRoute>
      <PageLayout
        title={t("files.title") || "Archivos"}
        description="Gestiona los archivos y documentos del sistema"
      >
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">{t("files.title")}</TabsTrigger>
            <TabsTrigger value="upload">{t("files.upload")}</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="space-y-4">
            <FileList key={refreshKey} onFileSelect={handleFileSelect} />
          </TabsContent>
          <TabsContent value="upload" className="space-y-4">
            <FileUpload onUploadSuccess={handleUploadSuccess} multiple />
          </TabsContent>
        </Tabs>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("files.fileDetails") || "Detalles del Archivo"}
              </DialogTitle>
              <DialogDescription>
                {t("files.fileDetailsDescription") ||
                  "Información detallada del archivo seleccionado"}
              </DialogDescription>
            </DialogHeader>
            {selectedFile && (
              <FileDetail
                fileId={selectedFile.id}
                onClose={handleCloseDetail}
              />
            )}
          </DialogContent>
        </Dialog>
      </PageLayout>
    </ProtectedRoute>
  );
}
