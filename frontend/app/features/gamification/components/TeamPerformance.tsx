/**
 * TeamPerformance component
 * Displays top performers and users needing attention for the manager dashboard.
 */

import { Trophy, AlertTriangle } from "lucide-react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface Performer {
  user_id: string;
  points: number;
  level: number;
  [key: string]: unknown;
}

interface AttentionUser {
  user_id: string;
  reason: string;
  [key: string]: unknown;
}

interface TeamPerformanceProps {
  topPerformers: Performer[];
  needsAttention: AttentionUser[];
  isLoading?: boolean;
}

export function TeamPerformance({
  topPerformers,
  needsAttention,
  isLoading = false,
}: TeamPerformanceProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-yellow-500" />
            {t("gamification.manager.topPerformers")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topPerformers.length === 0 ? (
            <p className="text-sm text-muted-foreground">-</p>
          ) : (
            <div className="space-y-2">
              {topPerformers.map((p, i) => (
                <div
                  key={String(p.user_id)}
                  className="flex items-center justify-between rounded-lg border p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {`#${i + 1}`}
                    </span>
                    <span className="text-sm">
                      {String(p.user_id).slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{`${p.points} pts`}</span>
                    <span>{`Lv ${p.level}`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Needs Attention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            {t("gamification.manager.needsAttention")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {needsAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground">-</p>
          ) : (
            <div className="space-y-2">
              {needsAttention.map((p) => (
                <div
                  key={String(p.user_id)}
                  className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-2.5 dark:border-yellow-900 dark:bg-yellow-950"
                >
                  <span className="text-sm">
                    {String(p.user_id).slice(0, 8)}...
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {String(p.reason)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
