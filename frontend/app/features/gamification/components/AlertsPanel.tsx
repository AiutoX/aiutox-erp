/**
 * AlertsPanel component
 * Displays gamification alerts (burnout risk, disengagement, bottlenecks) for managers.
 */

import { AlertTriangle, TrendingUp, Users } from "lucide-react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { Alert } from "~/features/gamification/api/gamification.api";

interface AlertsPanelProps {
  alerts: Alert[];
  isLoading?: boolean;
}

function getSeverityColor(severity: string): string {
  if (severity === "high")
    return "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950";
  if (severity === "medium")
    return "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950";
  return "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950";
}

function getAlertIcon(type: string) {
  if (type === "burnout_risk")
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  if (type === "disengagement")
    return <Users className="h-4 w-4 text-yellow-500" />;
  return <TrendingUp className="h-4 w-4 text-blue-500" />;
}

function getAlertTypeKey(type: string): string {
  if (type === "burnout_risk") return "burnoutRisk";
  if (type === "disengagement") return "disengagement";
  return "bottleneck";
}

export function AlertsPanel({ alerts, isLoading = false }: AlertsPanelProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t("gamification.manager.alerts")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t("gamification.manager.noAlerts")}
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div
                key={`${alert.type}-${alert.employee_id}-${i}`}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3",
                  getSeverityColor(alert.severity)
                )}
              >
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {t(`gamification.manager.${getAlertTypeKey(alert.type)}`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {alert.recommendation}
                  </p>
                </div>
                <span className="text-xs font-medium capitalize">
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
