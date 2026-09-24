/**
 * StorageConfig - Componente para configurar almacenamiento (Local/S3/Hybrid)
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ConfigSection } from "~/components/config/ConfigSection";
import { ConfigFormField } from "~/components/config/ConfigFormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { useS3ConnectionTest } from "~/hooks/useFilesConfig";
import type { StorageConfigUpdate } from "~/lib/api/files-config.api";
import { Loader2 } from "lucide-react";

export interface StorageConfigProps {
  value: StorageConfigUpdate;
  onChange: (value: StorageConfigUpdate) => void;
}

export function StorageConfig({ value, onChange }: StorageConfigProps) {
  const { t } = useTranslation();
  const { mutate: testConnection, isPending: isTesting } =
    useS3ConnectionTest();

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleBackendChange = (backend: "local" | "s3" | "hybrid") => {
    const newValue: StorageConfigUpdate = {
      backend,
      s3:
        backend === "s3" || backend === "hybrid"
          ? {
              bucket_name: value.s3?.bucket_name || "",
              access_key_id: value.s3?.access_key_id || "",
              secret_access_key: value.s3?.secret_access_key || "",
              region: value.s3?.region || "us-east-1",
            }
          : undefined,
      local:
        backend === "local" || backend === "hybrid"
          ? {
              base_path: value.local?.base_path || "./storage",
            }
          : undefined,
    };
    onChange(newValue);
  };

  const handleS3Change = (field: string, fieldValue: string) => {
    if (!value.s3) return;
    onChange({
      ...value,
      s3: {
        ...value.s3,
        [field]: fieldValue,
      },
    });
  };

  const handleLocalChange = (field: string, fieldValue: string) => {
    if (!value.local) return;
    onChange({
      ...value,
      local: {
        ...value.local,
        [field]: fieldValue,
      },
    });
  };

  const handleTestConnection = () => {
    if (!value.s3) return;

    testConnection(
      {
        bucket_name: value.s3.bucket_name,
        access_key_id: value.s3.access_key_id,
        secret_access_key: value.s3.secret_access_key,
        region: value.s3.region,
      },
      {
        onSuccess: (response) => {
          setTestResult({
            success: response.data.success,
            message: response.data.message,
          });
        },
        onError: (error: Error) => {
          setTestResult({
            success: false,
            message: error.message,
          });
        },
      }
    );
  };

  return (
    <ConfigSection
      title={t("config.files.storage.title")}
      description={t("config.files.storage.description")}
    >
      <div className="space-y-6">
        <ConfigFormField
          label={t("config.files.storage.backend")}
          id="backend"
          value={value.backend}
          onChange={(val) =>
            handleBackendChange(val as "local" | "s3" | "hybrid")
          }
          required
          input={
            <Select value={value.backend} onValueChange={handleBackendChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">
                  {t("config.files.storage.local")}
                </SelectItem>
                <SelectItem value="s3">
                  {t("config.files.storage.s3")}
                </SelectItem>
                <SelectItem value="hybrid">
                  {t("config.files.storage.hybrid")}
                </SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {(value.backend === "local" || value.backend === "hybrid") && (
          <ConfigFormField
            label={t("config.files.storage.localBasePath")}
            id="local_base_path"
            value={value.local?.base_path || ""}
            onChange={(val) => handleLocalChange("base_path", val)}
            placeholder="./storage"
            description={t("config.files.storage.localBasePathDescription")}
          />
        )}

        {(value.backend === "s3" || value.backend === "hybrid") && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium">
              {t("config.files.storage.s3Configuration")}
            </h4>

            <ConfigFormField
              label={t("config.files.storage.s3Bucket")}
              id="s3_bucket"
              value={value.s3?.bucket_name || ""}
              onChange={(val) => handleS3Change("bucket_name", val)}
              required
              placeholder="my-bucket"
            />

            <ConfigFormField
              label={t("config.files.storage.s3Region")}
              id="s3_region"
              value={value.s3?.region || "us-east-1"}
              onChange={(val) => handleS3Change("region", val)}
              required
              placeholder="us-east-1"
            />

            <ConfigFormField
              label={t("config.files.storage.s3AccessKey")}
              id="s3_access_key"
              value={value.s3?.access_key_id || ""}
              onChange={(val) => handleS3Change("access_key_id", val)}
              type="text"
              required
              placeholder="AKIAIOSFODNN7EXAMPLE"
            />

            <ConfigFormField
              label={t("config.files.storage.s3SecretKey")}
              id="s3_secret_key"
              value={value.s3?.secret_access_key || ""}
              onChange={(val) => handleS3Change("secret_access_key", val)}
              type="password"
              required
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              description={t("config.files.storage.s3SecretKeyDescription")}
            />

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={
                  isTesting ||
                  !value.s3?.bucket_name ||
                  !value.s3?.access_key_id ||
                  !value.s3?.secret_access_key
                }
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("config.files.storage.testing")}
                  </>
                ) : (
                  t("config.files.storage.testConnection")
                )}
              </Button>

              {testResult && (
                <span
                  className={`text-sm ${testResult.success ? "text-green-600" : "text-red-600"}`}
                >
                  {testResult.message}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </ConfigSection>
  );
}
