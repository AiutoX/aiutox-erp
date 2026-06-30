import { Award, Lock } from "lucide-react";
import { format } from "date-fns";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useTranslation } from "~/lib/i18n/useTranslation";

import type { Badge, UserBadge } from "../api/gamification.api";
import { useAllBadges, useMyBadges } from "../hooks/useGamification";

interface BadgeDisplayProps {
  variant?: "grid" | "list";
}

export function BadgeDisplay({ variant = "grid" }: BadgeDisplayProps) {
  const { t } = useTranslation();
  const { data: myBadges = [] } = useMyBadges();
  const { data: allBadges = [] } = useAllBadges();

  const earnedIds = new Set(myBadges.map((ub: UserBadge) => ub.badge_id));

  const lockedBadges = allBadges.filter((b: Badge) => !earnedIds.has(b.id));

  if (variant === "list") {
    return (
      <div className="space-y-3">
        {myBadges.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("gamification.noBadgesYet")}
          </p>
        )}
        {myBadges.map((ub: UserBadge) => (
          <div
            key={ub.id}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{ub.badge_name}</p>
              {ub.badge_description && (
                <p className="text-xs text-muted-foreground">
                  {ub.badge_description}
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(ub.earned_at), "dd/MM/yyyy")}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Earned badges */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          {`${t("gamification.earnedBadges")} (${myBadges.length})`}
        </h3>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
          <TooltipProvider>
            {myBadges.map((ub: UserBadge) => (
              <Tooltip key={ub.id}>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                      <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span className="max-w-[64px] truncate text-center text-xs">
                      {ub.badge_name}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{ub.badge_name}</p>
                  {ub.badge_description && (
                    <p className="text-xs">{ub.badge_description}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {`${t("gamification.earnedOn")} ${format(new Date(ub.earned_at), "dd/MM/yyyy")}`}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>

      {/* Locked badges */}
      {lockedBadges.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            {`${t("gamification.lockedBadges")} (${lockedBadges.length})`}
          </h3>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
            <TooltipProvider>
              {lockedBadges.map((b: Badge) => (
                <Tooltip key={b.id}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-1 opacity-40">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="max-w-[64px] truncate text-center text-xs">
                        {b.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{b.name}</p>
                    {b.description && (
                      <p className="text-xs">{b.description}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </div>
      )}
    </div>
  );
}
