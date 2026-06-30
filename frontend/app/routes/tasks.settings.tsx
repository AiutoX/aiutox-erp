/**
 * Tasks settings page
 * Tenant-level settings for Tasks module
 */

import { useMemo } from "react";
import { Link } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from "@hugeicons/core-free-icons";
import {
  useTaskModuleSettings,
  useTaskModuleSettingsMutation,
} from "~/features/tasks/hooks/useTasks";
import type { TaskModuleSettingsUpdate } from "~/features/tasks/types/task.types";

export default function TaskSettingsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useTaskModuleSettings();
  const updateMutation = useTaskModuleSettingsMutation();

  const settings = data?.data;
  const saving = updateMutation.isPending;

  const groupedSettings = useMemo(
    () => [
      {
        key: "calendar_enabled",
        label: t("tasks.settings.calendar"),
        description: t("tasks.settings.calendarDescription"),
      },
      {
        key: "board_enabled",
        label: t("tasks.settings.board"),
        description: t("tasks.settings.boardDescription"),
      },
      {
        key: "inbox_enabled",
        label: t("tasks.settings.inbox"),
        description: t("tasks.settings.inboxDescription"),
      },
      {
        key: "list_enabled",
        label: t("tasks.settings.list"),
        description: t("tasks.settings.listDescription"),
      },
      {
        key: "stats_enabled",
        label: t("tasks.settings.stats"),
        description: t("tasks.settings.statsDescription"),
      },
    ],
    [t]
  );

  const handleToggle = (
    key: keyof TaskModuleSettingsUpdate,
    value: boolean
  ) => {
    updateMutation.mutate({ [key]: value });
  };

  return (
    <PageLayout
      title={t("tasks.settings.title")}
      description={t("tasks.settings.description")}
      loading={isLoading}
    >
      <div className="space-y-6">
        {/* Quick Actions Card - Sprint 2.2 */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t("tasks.settings.quickActions") || "Acciones Rápidas"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/tasks/status-customizer">
              <Button variant="outline" className="w-full justify-start">
                <HugeiconsIcon
                  icon={Settings01Icon}
                  size={20}
                  className="mr-2"
                />
                {t("tasks.statusCustomizer.title") ||
                  "Personalizar Estados de Tareas"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("tasks.settings.sectionTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {groupedSettings.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-6 border-b border-border/60 pb-4 last:border-b-0 last:pb-0"
              >
                <div className="space-y-1">
                  <Label className="text-base font-medium">{item.label}</Label>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <Switch
                  checked={Boolean(
                    settings?.[item.key as keyof TaskModuleSettingsUpdate]
                  )}
                  onCheckedChange={(checked) =>
                    handleToggle(
                      item.key as keyof TaskModuleSettingsUpdate,
                      checked
                    )
                  }
                  disabled={saving || !settings}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
