/**
 * FilePreview Component
 * Displays file preview for various file types
 */

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useFilePreview, useFileDownload } from "../hooks/useFiles";
import {
  canPreviewFile,
  isImageFile,
  isPdfFile,
  getPreviewType,
} from "../utils/fileUtils";
import { showToast } from "~/components/common/Toast";
import { TextPreview } from "./previewers/TextPreview";
import { MarkdownPreview } from "./previewers/MarkdownPreview";
import { CsvPreview } from "./previewers/CsvPreview";
import { JsonPreview } from "./previewers/JsonPreview";
import { CodePreview } from "./previewers/CodePreview";

export interface FilePreviewProps {
  fileId: string;
  mimeType: string;
  fileName: string;
  onClose?: () => void;
}

export function FilePreview({
  fileId,
  mimeType,
  fileName,
  onClose,
}: FilePreviewProps) {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewType = getPreviewType(mimeType, fileName);
  const { data: previewBlob, isLoading: loadingPreview } = useFilePreview(
    fileId,
    { width: 800, height: 600 }
  );
  const { mutate: downloadFile } = useFileDownload();

  useEffect(() => {
    if (previewBlob) {
      const url = window.URL.createObjectURL(previewBlob);
      setPreviewUrl(url);
      return () => {
        window.URL.revokeObjectURL(url);
      };
    }
    return undefined;
  }, [previewBlob]);

  const handleDownload = () => {
    downloadFile(fileId, {
      onSuccess: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      onError: () => {
        showToast(t("files.downloadError") || "Error downloading file");
      },
    });
  };

  if (loadingPreview) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>{t("files.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!canPreviewFile(mimeType)) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            {t("files.previewNotAvailable") ||
              "Preview not available for this file type"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderPreview = () => {
    switch (previewType) {
      case "text":
        return <TextPreview fileId={fileId} fileName={fileName} />;
      case "markdown":
        return <MarkdownPreview fileId={fileId} fileName={fileName} />;
      case "csv":
        return <CsvPreview fileId={fileId} fileName={fileName} />;
      case "json":
        return <JsonPreview fileId={fileId} fileName={fileName} />;
      case "code":
        return <CodePreview fileId={fileId} fileName={fileName} />;
      default:
        if (isImageFile(mimeType) && previewUrl) {
          return (
            <img
              src={previewUrl}
              alt={fileName}
              className="w-full h-auto max-h-[600px] object-contain"
            />
          );
        }
        if (isPdfFile(mimeType) && previewUrl) {
          return (
            <iframe
              src={previewUrl}
              className="w-full h-[600px]"
              title={fileName}
            />
          );
        }
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{fileName}</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              {t("files.download")}
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="border rounded-md overflow-hidden">
          {renderPreview()}
        </div>
      </CardContent>
    </Card>
  );
}
