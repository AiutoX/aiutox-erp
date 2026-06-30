/**
 * FileMetadataEditor Component
 * Allows editing file metadata
 */

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useFileUpdate } from "../hooks/useFiles";
import { showToast } from "~/components/common/Toast";

export interface FileMetadataEditorProps {
  fileId: string;
  initialMetadata?: Record<string, unknown> | null;
}

/**
 * FileMetadataEditor component
 */
export function FileMetadataEditor({
  fileId,
  initialMetadata,
}: FileMetadataEditorProps) {
  const { t } = useTranslation();
  const [metadataJson, setMetadataJson] = useState(
    JSON.stringify(initialMetadata || {}, null, 2)
  );
  const [error, setError] = useState<string | null>(null);
  const { mutate: updateFile, isPending: updating } = useFileUpdate();

  const handleSave = () => {
    try {
      const parsed = JSON.parse(metadataJson);
      updateFile(
        {
          fileId,
          data: { metadata: parsed },
        },
        {
          onSuccess: () => {
            showToast(t("files.updateSuccess"), "success");
            setError(null);
          },
          onError: () => {
            showToast(t("files.updateError"), "error");
          },
        }
      );
    } catch (e) {
      setError("JSON inválido");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("files.metadata")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            {t("files.metadata")} (JSON)
          </label>
          <Textarea
            value={metadataJson}
            onChange={(e) => {
              setMetadataJson(e.target.value);
              setError(null);
            }}
            className="font-mono text-sm min-h-[300px]"
            placeholder='{"key": "value"}'
          />
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </div>
        <Button onClick={handleSave} disabled={updating || !!error}>
          <Save className="h-4 w-4 mr-2" />
          {t("files.updateSuccess")}
        </Button>
      </CardContent>
    </Card>
  );
}
