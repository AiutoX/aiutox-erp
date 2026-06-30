/**
 * Activity Icon Customizer Component
 * Allows users to customize icons for different activity types and statuses
 */

import { useEffect, useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Skeleton } from "~/components/ui/skeleton";
import {
  useActivityIcons,
  useUpdateActivityIcons,
  useDefaultActivityIcons,
} from "../hooks/useActivityIcons";
import type {
  ActivityType,
  ActivityStatus,
} from "../types/activity-icon.types";

const AVAILABLE_ICONS = [
  "📋",
  "👥",
  "📅",
  "🚀",
  "⚙️",
  "🎯",
  "🎪",
  "🔧",
  "⚡",
  "🔄",
  "✅",
  "🚫",
  "🛑",
  "📍",
  "🏷️",
  "📌",
  "🔔",
  "💡",
  "🎨",
  "🔥",
  "📊",
  "💼",
  "🎓",
  "🏆",
  "⭐",
  "🌟",
  "💪",
  "🎉",
  "🎁",
  "📝",
];

const ACTIVITY_TYPES: ActivityType[] = [
  "task",
  "meeting",
  "event",
  "project",
  "workflow",
];
const STATUSES: ActivityStatus[] = [
  "todo",
  "pending",
  "in_progress",
  "done",
  "completed",
  "canceled",
  "blocked",
];

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  task: "📋 Tareas",
  meeting: "👥 Reuniones",
  event: "📅 Eventos",
  project: "🚀 Proyectos",
  workflow: "⚙️ Workflows",
};

const STATUS_LABELS: Record<ActivityStatus, string> = {
  todo: "Por hacer",
  pending: "Pendiente",
  in_progress: "En progreso",
  done: "Completado",
  completed: "Completado",
  canceled: "Cancelado",
  blocked: "Bloqueado",
};

export function ActivityIconCustomizer() {
  const { t } = useTranslation();
  const { data: icons, isLoading } = useActivityIcons();
  const { data: defaults } = useDefaultActivityIcons();
  const updateIcons = useUpdateActivityIcons();

  const [selectedIcons, setSelectedIcons] = useState<
    Record<string, Record<string, string>>
  >({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (icons && icons.length > 0) {
      const iconsMap: Record<string, Record<string, string>> = {};
      icons.forEach((config) => {
        if (!iconsMap[config.activity_type]) {
          iconsMap[config.activity_type] = {};
        }
        const activityMap = iconsMap[config.activity_type];
        if (activityMap && config.status) {
          activityMap[config.status] = config.icon;
        }
      });
      setSelectedIcons(iconsMap);
    } else if (defaults) {
      const defaultsMap: Record<string, Record<string, string>> = {};
      Object.entries(defaults).forEach(([activityType, statuses]) => {
        if (statuses) {
          defaultsMap[activityType] = {};
          Object.entries(statuses).forEach(([status, config]) => {
            const activityMap = defaultsMap[activityType];
            if (config && activityMap && status) {
              activityMap[status] = config.icon;
            }
          });
        }
      });
      setSelectedIcons(defaultsMap);
    }
  }, [icons, defaults]);

  const handleIconChange = (
    activityType: string,
    status: string,
    icon: string
  ) => {
    setSelectedIcons((prev) => ({
      ...prev,
      [activityType]: {
        ...prev[activityType],
        [status]: icon,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateIcons.mutateAsync({ configs: selectedIcons });
    setHasChanges(false);
  };

  const handleReset = () => {
    if (defaults) {
      const resetIcons: Record<string, Record<string, string>> = {};
      Object.entries(defaults).forEach(([activityType, statuses]) => {
        if (statuses) {
          resetIcons[activityType] = {};
          Object.entries(statuses).forEach(([status, config]) => {
            const activityMap = resetIcons[activityType];
            if (config && activityMap && status) {
              activityMap[status] = config.icon;
            }
          });
        }
      });
      setSelectedIcons(resetIcons);
      setHasChanges(true);
    }
  };

  const getCurrentIcon = (activityType: string, status: string): string => {
    return (
      selectedIcons[activityType]?.[status] ||
      defaults?.[activityType]?.[status]?.icon ||
      "•"
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {t("activityIcons.title") ||
                  "Personalizar Iconos de Actividades"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t("activityIcons.description") ||
                  "Configura los iconos para diferentes tipos de actividades y sus estados"}
              </p>
            </div>
            {hasChanges && (
              <Badge variant="secondary">
                {t("common.unsavedChanges") || "Cambios sin guardar"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="task" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {ACTIVITY_TYPES.map((type) => (
                <TabsTrigger key={type} value={type}>
                  {ACTIVITY_TYPE_LABELS[type]}
                </TabsTrigger>
              ))}
            </TabsList>

            {ACTIVITY_TYPES.map((activityType) => (
              <TabsContent
                key={activityType}
                value={activityType}
                className="space-y-4 mt-6"
              >
                <div className="grid gap-4">
                  {STATUSES.map((status) => (
                    <div
                      key={status}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{status}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {STATUS_LABELS[status]}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="grid grid-cols-10 gap-1">
                          {AVAILABLE_ICONS.map((icon) => (
                            <button
                              key={icon}
                              type="button"
                              className={`w-8 h-8 text-sm border rounded transition-all hover:scale-110 ${
                                getCurrentIcon(activityType, status) === icon
                                  ? "border-primary bg-primary/20 scale-110"
                                  : "border-border hover:border-primary/50"
                              }`}
                              onClick={() =>
                                handleIconChange(activityType, status, icon)
                              }
                              title={icon}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {t("activityIcons.selected") || "Seleccionado:"}
                          </span>
                          <div className="w-12 h-12 border-2 border-primary rounded flex items-center justify-center bg-muted text-lg">
                            {getCurrentIcon(activityType, status)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex justify-between pt-6 border-t mt-6">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={updateIcons.isPending}
            >
              {t("activityIcons.resetToDefaults") || "Restablecer por defecto"}
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={updateIcons.isPending || !hasChanges}
            >
              {updateIcons.isPending
                ? t("common.saving") || "Guardando..."
                : t("common.saveChanges") || "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
