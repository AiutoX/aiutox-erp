import { useState } from "react";
import { Medal, User } from "lucide-react";

import { cn } from "~/lib/utils";
import { useTranslation } from "~/lib/i18n/useTranslation";

import type { LeaderboardEntry } from "../api/gamification.api";
import { useLeaderboard } from "../hooks/useGamification";

type Period = "daily" | "weekly" | "monthly" | "all_time";

const PERIOD_OPTIONS: { value: Period; labelKey: string }[] = [
  { value: "daily", labelKey: "gamification.daily" },
  { value: "weekly", labelKey: "gamification.weekly" },
  { value: "monthly", labelKey: "gamification.monthly" },
  { value: "all_time", labelKey: "gamification.allTime" },
];

function getRankColor(rank: number | null): string {
  if (rank === 1) return "text-yellow-500";
  if (rank === 2) return "text-gray-400";
  if (rank === 3) return "text-amber-700";
  return "text-muted-foreground";
}

export function Leaderboard() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>("all_time");
  const { data: entries = [], isLoading } = useLeaderboard(period);

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPeriod(opt.value)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              period === opt.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>

      {/* Leaderboard list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("gamification.noLeaderboard")}
        </p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry: LeaderboardEntry) => (
            <div
              key={entry.user_id}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                entry.is_current_user
                  ? "bg-primary/5 ring-1 ring-primary/20"
                  : "hover:bg-muted/50"
              )}
            >
              {/* Rank */}
              <div className="flex w-8 items-center justify-center">
                {entry.rank && entry.rank <= 3 ? (
                  <Medal className={cn("h-5 w-5", getRankColor(entry.rank))} />
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">
                    {entry.rank ?? "-"}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* Name */}
              <div className="flex-1">
                <span
                  className={cn(
                    "text-sm",
                    entry.is_current_user && "font-semibold"
                  )}
                >
                  {entry.user_name}
                  {entry.is_current_user && (
                    <span className="ml-1.5 text-xs text-primary">
                      ({t("gamification.you")})
                    </span>
                  )}
                </span>
              </div>

              {/* Points (only for current user) */}
              {entry.is_current_user && entry.points > 0 && (
                <span className="text-sm font-medium text-primary">
                  {entry.points.toLocaleString()} pts
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
