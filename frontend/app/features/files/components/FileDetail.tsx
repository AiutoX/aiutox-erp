/**
 * FileDetail Component
 * Displays detailed file information with tabs for versions, permissions, and metadata
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useFile } from "../hooks/useFiles";
import { FileVersions } from "./FileVersions";
import { FileVersionUpload } from "./FileVersionUpload";
import { FilePermissions } from "./FilePermissions";
import { FilePreview } from "./FilePreview";
import { formatFileSize } from "../utils/fileUtils";
import { FileMetadataEditor } from "./FileMetadataEditor";
import { FileTags } from "./FileTags";

export interface FileDetailProps {
  fileId: string;
  onClose?: () => void;
}

/**
 * FileDetail component
 */
export function FileDetail({ fileId, onClose }: FileDetailProps) {
  const { t } = useTranslation();
  const { file, loading, error } = useFile(fileId);
  const [activeTab, setActiveTab] = useState("info");

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>{t("files.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !file) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">{t("files.error")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{file.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("files.name")}</p>
              <p className="font-medium">{file.original_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("files.type")}</p>
              <p className="font-medium">{file.mime_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("files.size")}</p>
              <p className="font-medium">{formatFileSize(file.size)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("files.uploadedBy")}
              </p>
              <p className="font-medium">
                {file.uploaded_by_user?.full_name || file.uploaded_by || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("files.uploadedAt")}
              </p>
              <p className="font-medium">
                {new Date(file.created_at).toLocaleString()}
              </p>
            </div>
            {file.description && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">
                  {t("files.description")}
                </p>
                <p className="font-medium">{file.description}</p>
              </div>
            )}
            <div className="col-span-2">
              <FileTags fileId={file.id} fileTags={file.tags || null} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="preview">{t("files.preview")}</TabsTrigger>
          <TabsTrigger value="versions">{t("files.versions")}</TabsTrigger>
          <TabsTrigger value="permissions">
            {t("files.permissions")}
          </TabsTrigger>
          <TabsTrigger value="metadata">{t("files.metadata")}</TabsTrigger>
        </TabsList>
        <TabsContent value="preview">
          <FilePreview
            fileId={file.id}
            mimeType={file.mime_type}
            fileName={file.original_name}
            onClose={onClose}
          />
        </TabsContent>
        <TabsContent value="versions" className="space-y-4">
          <FileVersionUpload
            fileId={file.id}
            onVersionCreated={() => {
              // Refresh file and versions
              window.location.reload();
            }}
          />
          <FileVersions fileId={file.id} />
        </TabsContent>
        <TabsContent value="permissions">
          <FilePermissions fileId={file.id} />
        </TabsContent>
        <TabsContent value="metadata">
          <FileMetadataEditor
            fileId={file.id}
            initialMetadata={file.metadata}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
