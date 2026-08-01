/**
 * FileLimits - Componente para configurar límites de archivos
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { ConfigSection } from "~/components/config/ConfigSection";
import { ConfigFormField } from "~/components/config/ConfigFormField";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import type { FileLimitsUpdate } from "~/lib/api/files-config.api";

export interface FileLimitsProps {
  value: FileLimitsUpdate;
  onChange: (value: FileLimitsUpdate) => void;
}

function formatBytesToMB(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

function formatMBToBytes(mb: number): number {
  return mb * 1024 * 1024;
}

export function FileLimits({ value, onChange }: FileLimitsProps) {
  const { t } = useTranslation();

  const handleChange = (
    field: keyof FileLimitsUpdate,
    fieldValue: string | number | string[] | null
  ) => {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  };

  const handleMimeTypesChange = (
    field: "allowed_mime_types" | "blocked_mime_types",
    text: string
  ) => {
    const types = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    handleChange(field, types);
  };

  return (
    <ConfigSection
      title={t("config.files.limits.title")}
      description={t("config.files.limits.description")}
    >
      <div className="space-y-6">
        <ConfigFormField
          label={t("config.files.limits.maxFileSize")}
          id="max_file_size"
          value={
            value.max_file_size
              ? formatBytesToMB(value.max_file_size)
              : undefined
          }
          onChange={(val) => {
            const mb = parseInt(val, 10);
            if (!isNaN(mb) && mb > 0) {
              handleChange("max_file_size", formatMBToBytes(mb));
            }
          }}
          type="number"
          placeholder="100"
          description={t("config.files.limits.maxFileSizeDescription")}
          input={
            <div className="flex items-center gap-2">
              <Input
                id="max_file_size"
                type="number"
                value={
                  value.max_file_size
                    ? formatBytesToMB(value.max_file_size)
                    : ""
                }
                onChange={(e) => {
                  const mb = parseInt(e.target.value, 10);
                  if (!isNaN(mb) && mb > 0) {
                    handleChange("max_file_size", formatMBToBytes(mb));
                  }
                }}
                placeholder="100"
                min={1}
              />
              <span className="text-sm text-muted-foreground">MB</span>
            </div>
          }
        />

        <ConfigFormField
          label={t("config.files.limits.maxVersionsPerFile")}
          id="max_versions"
          value={value.max_versions_per_file?.toString() || ""}
          onChange={(val) => {
            const num = parseInt(val, 10);
            if (!isNaN(num) && num >= 1) {
              handleChange("max_versions_per_file", num);
            }
          }}
          type="number"
          placeholder="10"
          description={t("config.files.limits.maxVersionsDescription")}
        />

        <ConfigFormField
          label={t("config.files.limits.retentionDays")}
          id="retention_days"
          value={value.retention_days?.toString() || ""}
          onChange={(val) => {
            if (val === "") {
              handleChange("retention_days", null);
            } else {
              const num = parseInt(val, 10);
              if (!isNaN(num) && num >= 0) {
                handleChange("retention_days", num);
              }
            }
          }}
          type="number"
          placeholder={t("config.files.limits.noLimit")}
          description={t("config.files.limits.retentionDaysDescription")}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("config.files.limits.allowedMimeTypes")}
          </label>
          <p className="text-sm text-muted-foreground">
            {t("config.files.limits.allowedMimeTypesDescription")}
          </p>
          <Textarea
            value={(value.allowed_mime_types || []).join("\n")}
            onChange={(e) =>
              handleMimeTypesChange("allowed_mime_types", e.target.value)
            }
            placeholder="image/jpeg&#10;image/png&#10;application/pdf"
            rows={4}
            className="font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("config.files.limits.blockedMimeTypes")}
          </label>
          <p className="text-sm text-muted-foreground">
            {t("config.files.limits.blockedMimeTypesDescription")}
          </p>
          <Textarea
            value={(value.blocked_mime_types || []).join("\n")}
            onChange={(e) =>
              handleMimeTypesChange("blocked_mime_types", e.target.value)
            }
            placeholder="application/x-executable&#10;application/x-msdownload"
            rows={4}
            className="font-mono text-sm"
          />
        </div>
      </div>
    </ConfigSection>
  );
}
