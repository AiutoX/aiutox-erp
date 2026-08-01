/**
 * StorageQuota - Configuración y visualización de cuotas de almacenamiento
 * (tenant y personal por defecto) con desglose por usuario.
 */

import { useState, useEffect } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ConfigSection } from "~/components/config/ConfigSection";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Progress } from "~/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ConfigLoadingState } from "~/components/config/ConfigLoadingState";
import { ConfigErrorState } from "~/components/config/ConfigErrorState";
import {
  useStorageQuotaConfig,
  useStorageQuotaConfigUpdate,
  useUserQuotaUsage,
  useUserQuotaOverrideUpdate,
} from "~/hooks/useFilesConfig";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function bytesFromMB(mb: number): number {
  return Math.round(mb * 1024 * 1024);
}

function mbFromBytes(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

function usageColor(pct: number): string {
  if (pct >= 100) return "text-destructive";
  if (pct >= 90) return "text-destructive";
  if (pct >= 75) return "text-yellow-600 dark:text-yellow-500";
  return "text-muted-foreground";
}

export function StorageQuota() {
  const { t } = useTranslation();
  const { data: quota, isLoading, error } = useStorageQuotaConfig();
  const { mutate: updateQuota, isPending: isSaving } =
    useStorageQuotaConfigUpdate();
  const { data: userUsage, isLoading: isLoadingUsers } = useUserQuotaUsage();
  const { mutate: updateUserOverride } = useUserQuotaOverrideUpdate();

  const [tenantMaxMB, setTenantMaxMB] = useState<number>(0);
  const [tenantThresholds, setTenantThresholds] = useState<string>("");
  const [userDefaultMaxMB, setUserDefaultMaxMB] = useState<number>(0);
  const [userThresholds, setUserThresholds] = useState<string>("");
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    if (quota) {
      setTenantMaxMB(mbFromBytes(quota.tenant_max_bytes));
      setTenantThresholds(quota.tenant_warning_thresholds.join(", "));
      setUserDefaultMaxMB(mbFromBytes(quota.user_default_max_bytes));
      setUserThresholds(quota.user_warning_thresholds.join(", "));
    }
  }, [quota]);

  if (isLoading) {
    return (
      <ConfigSection
        title={t("config.files.quota.title")}
        description={t("config.files.quota.description")}
      >
        <ConfigLoadingState lines={4} />
      </ConfigSection>
    );
  }

  if (error) {
    return (
      <ConfigSection
        title={t("config.files.quota.title")}
        description={t("config.files.quota.description")}
      >
        <ConfigErrorState
          message={error instanceof Error ? error.message : String(error)}
        />
      </ConfigSection>
    );
  }

  if (!quota) return null;

  const tenantPct =
    quota.tenant_max_bytes > 0
      ? (quota.tenant_usage_bytes / quota.tenant_max_bytes) * 100
      : 0;

  const parseThresholds = (value: string): number[] =>
    value
      .split(",")
      .map((v) => parseInt(v.trim(), 10))
      .filter((v) => !isNaN(v) && v > 0 && v <= 100);

  const handleSave = () => {
    updateQuota({
      tenant_max_bytes: bytesFromMB(tenantMaxMB),
      tenant_warning_thresholds: parseThresholds(tenantThresholds),
      user_default_max_bytes: bytesFromMB(userDefaultMaxMB),
      user_warning_thresholds: parseThresholds(userThresholds),
    });
  };

  return (
    <ConfigSection
      title={t("config.files.quota.title")}
      description={t("config.files.quota.description")}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("config.files.quota.tenantUsage")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className={`text-2xl font-bold ${usageColor(tenantPct)}`}>
                {formatBytes(quota.tenant_usage_bytes)}
              </span>
              <span className="text-sm text-muted-foreground">
                {t("config.files.quota.of")} {formatBytes(quota.tenant_max_bytes)}
              </span>
            </div>
            <Progress value={tenantPct} />
            <p className="text-xs text-muted-foreground">
              {tenantPct.toFixed(1)}% {t("config.files.quota.used")}
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("config.files.quota.tenantMaxLabel")}
            </label>
            <p className="text-xs text-muted-foreground">
              {t("config.files.quota.tenantMaxDesc")}
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={tenantMaxMB}
                onChange={(e) => setTenantMaxMB(Number(e.target.value))}
              />
              <span className="text-sm text-muted-foreground shrink-0">MB</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("config.files.quota.tenantThresholdsLabel")}
            </label>
            <p className="text-xs text-muted-foreground">
              {t("config.files.quota.thresholdsDesc")}
            </p>
            <Input
              value={tenantThresholds}
              onChange={(e) => setTenantThresholds(e.target.value)}
              placeholder="75, 90, 100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("config.files.quota.userDefaultMaxLabel")}
            </label>
            <p className="text-xs text-muted-foreground">
              {t("config.files.quota.userDefaultMaxDesc")}
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={userDefaultMaxMB}
                onChange={(e) => setUserDefaultMaxMB(Number(e.target.value))}
              />
              <span className="text-sm text-muted-foreground shrink-0">MB</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("config.files.quota.userThresholdsLabel")}
            </label>
            <p className="text-xs text-muted-foreground">
              {t("config.files.quota.thresholdsDesc")}
            </p>
            <Input
              value={userThresholds}
              onChange={(e) => setUserThresholds(e.target.value)}
              placeholder="80, 100"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          {t("common.save")}
        </Button>

        <div className="pt-4">
          <h4 className="text-sm font-medium mb-3">
            {t("config.files.quota.perUserTitle")}
          </h4>
          {isLoadingUsers ? (
            <ConfigLoadingState lines={3} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("config.files.quota.user")}</TableHead>
                  <TableHead>{t("config.files.quota.usage")}</TableHead>
                  <TableHead>{t("config.files.quota.limit")}</TableHead>
                  <TableHead className="w-64">
                    {t("config.files.quota.override")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(userUsage || []).map((row) => {
                  const pct =
                    row.quota_max_bytes > 0
                      ? (row.usage_bytes / row.quota_max_bytes) * 100
                      : 0;
                  const draft = overrideDrafts[row.user_id] ?? "";
                  return (
                    <TableRow key={row.user_id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {row.full_name || row.email || row.user_id}
                          </span>
                          {row.has_override && (
                            <Badge variant="outline" className="w-fit mt-1">
                              {t("config.files.quota.hasOverride")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={usageColor(pct)}>
                        {formatBytes(row.usage_bytes)} ({pct.toFixed(0)}%)
                      </TableCell>
                      <TableCell>{formatBytes(row.quota_max_bytes)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            placeholder={t("config.files.quota.overrideMBPlaceholder")}
                            value={draft}
                            onChange={(e) =>
                              setOverrideDrafts((prev) => ({
                                ...prev,
                                [row.user_id]: e.target.value,
                              }))
                            }
                            className="w-28"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!draft}
                            onClick={() => {
                              const mb = Number(draft);
                              if (mb > 0) {
                                updateUserOverride({
                                  userId: row.user_id,
                                  maxBytes: bytesFromMB(mb),
                                });
                                setOverrideDrafts((prev) => ({
                                  ...prev,
                                  [row.user_id]: "",
                                }));
                              }
                            }}
                          >
                            {t("common.save")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </ConfigSection>
  );
}
