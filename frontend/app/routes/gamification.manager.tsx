import { AlertTriangle, TrendingUp, Trophy, Users } from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PermissionRoute } from "~/components/auth";

import {
  useTeamAnalytics,
  useAlerts,
} from "~/features/gamification/hooks/useManagerAnalytics";
import { TeamPerformance } from "~/features/gamification/components/TeamPerformance";
import { AlertsPanel } from "~/features/gamification/components/AlertsPanel";

const TEAM_ID = "default";

function GamificationManagerContent() {
  const { t } = useTranslation();
  const { data: teamStats, isLoading } = useTeamAnalytics(TEAM_ID);
  const { data: alerts = [] } = useAlerts(TEAM_ID);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">
          {t("gamification.manager.title")}
        </h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t("gamification.manager.title")}
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("gamification.manager.teamVelocity")}
              </p>
              <p className="text-xl font-bold">
                {teamStats?.team_velocity ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                {teamStats?.trend ?? "+0%"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("gamification.manager.totalPoints")}
              </p>
              <p className="text-xl font-bold">
                {(teamStats?.total_points ?? 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("gamification.manager.activeUsers")}
              </p>
              <p className="text-xl font-bold">
                {teamStats?.active_users ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("gamification.manager.alerts")}
              </p>
              <p className="text-xl font-bold">{alerts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance (extracted component) */}
      <TeamPerformance
        topPerformers={
          (teamStats?.top_performers ?? []) as {
            user_id: string;
            points: number;
            level: number;
          }[]
        }
        needsAttention={
          (teamStats?.needs_attention ?? []) as {
            user_id: string;
            reason: string;
          }[]
        }
      />

      {/* Alerts (extracted component) */}
      <AlertsPanel alerts={alerts} />
    </div>
  );
}

export default function GamificationManagerPage() {
  return (
    <PermissionRoute
      permission="gamification.manage"
      redirectTo="/unauthorized"
    >
      <GamificationManagerContent />
    </PermissionRoute>
  );
}
