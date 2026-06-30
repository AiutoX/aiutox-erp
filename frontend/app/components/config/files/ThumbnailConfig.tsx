/**
 * ThumbnailConfig - Componente para configurar thumbnails
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { ConfigSection } from "~/components/config/ConfigSection";
import { ConfigFormField } from "~/components/config/ConfigFormField";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
// Slider component - using input range as fallback
import type { ThumbnailConfigUpdate } from "~/lib/api/files-config.api";

export interface ThumbnailConfigProps {
  value: ThumbnailConfigUpdate;
  onChange: (value: ThumbnailConfigUpdate) => void;
}

function formatBytesToMB(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

function formatMBToBytes(mb: number): number {
  return mb * 1024 * 1024;
}

export function ThumbnailConfig({ value, onChange }: ThumbnailConfigProps) {
  const { t } = useTranslation();

  const handleChange = (
    field: keyof ThumbnailConfigUpdate,
    fieldValue: number | boolean | undefined
  ) => {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  };

  return (
    <ConfigSection
      title={t("config.files.thumbnails.title")}
      description={t("config.files.thumbnails.description")}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ConfigFormField
            label={t("config.files.thumbnails.defaultWidth")}
            id="default_width"
            value={value.default_width?.toString() || ""}
            onChange={(val) => {
              const num = parseInt(val, 10);
              if (!isNaN(num) && num > 0) {
                handleChange("default_width", num);
              }
            }}
            type="number"
            placeholder="300"
            description={t("config.files.thumbnails.defaultWidthDescription")}
          />

          <ConfigFormField
            label={t("config.files.thumbnails.defaultHeight")}
            id="default_height"
            value={value.default_height?.toString() || ""}
            onChange={(val) => {
              const num = parseInt(val, 10);
              if (!isNaN(num) && num > 0) {
                handleChange("default_height", num);
              }
            }}
            type="number"
            placeholder="300"
            description={t("config.files.thumbnails.defaultHeightDescription")}
          />
        </div>

        <ConfigFormField
          label={t("config.files.thumbnails.quality")}
          id="quality"
          value={value.quality?.toString() || "85"}
          onChange={(val) => {
            const num = parseInt(val, 10);
            if (!isNaN(num) && num >= 1 && num <= 100) {
              handleChange("quality", num);
            }
          }}
          type="number"
          placeholder="85"
          description={t("config.files.thumbnails.qualityDescription")}
          input={
            <div className="space-y-2">
              <Input
                id="quality"
                type="range"
                min={1}
                max={100}
                step={1}
                value={value.quality || 85}
                onChange={(e) =>
                  handleChange("quality", parseInt(e.target.value, 10))
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span className="font-medium">{value.quality || 85}</span>
                <span>100</span>
              </div>
            </div>
          }
        />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("config.files.thumbnails.cacheEnabled")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("config.files.thumbnails.cacheEnabledDescription")}
            </p>
          </div>
          <Switch
            checked={value.cache_enabled ?? true}
            onCheckedChange={(checked) =>
              handleChange("cache_enabled", checked)
            }
          />
        </div>

        {value.cache_enabled !== false && (
          <ConfigFormField
            label={t("config.files.thumbnails.maxCacheSize")}
            id="max_cache_size"
            value={
              value.max_cache_size
                ? formatBytesToMB(value.max_cache_size)
                : undefined
            }
            onChange={(val) => {
              const mb = parseInt(val, 10);
              if (!isNaN(mb) && mb >= 0) {
                handleChange("max_cache_size", formatMBToBytes(mb));
              }
            }}
            type="number"
            placeholder="1024"
            description={t("config.files.thumbnails.maxCacheSizeDescription")}
            input={
              <div className="flex items-center gap-2">
                <Input
                  id="max_cache_size"
                  type="number"
                  value={
                    value.max_cache_size
                      ? formatBytesToMB(value.max_cache_size)
                      : ""
                  }
                  onChange={(e) => {
                    const mb = parseInt(e.target.value, 10);
                    if (!isNaN(mb) && mb >= 0) {
                      handleChange("max_cache_size", formatMBToBytes(mb));
                    }
                  }}
                  placeholder="1024"
                  min={0}
                />
                <span className="text-sm text-muted-foreground">MB</span>
              </div>
            }
          />
        )}
      </div>
    </ConfigSection>
  );
}
