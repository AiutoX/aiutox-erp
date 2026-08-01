import { Flame, Trophy } from "lucide-react";
import { useNavigate } from "react-router";

import { Progress } from "~/components/ui/progress";
import { useTranslation } from "~/lib/i18n/useTranslation";

import { useMyPoints } from "../hooks/useGamification";

interface PointsWidgetProps {
  compact?: boolean;
}

export function PointsWidget({ compact = false }: PointsWidgetProps) {
  const { t } = useTranslation();
  const { data: userPoints, isLoading } = useMyPoints();
  const navigate = useNavigate();

  if (isLoading || !userPoints) return null;

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => navigate("/gamification")}
        className="flex items-center gap-1.5 rounded-md bg-yellow-50 px-2 py-1 text-sm font-medium text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
      >
        <Trophy className="h-4 w-4" />
        <span>{userPoints.total_points}</span>
      </button>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate("/gamification")}
      onKeyDown={(e) => e.key === "Enter" && navigate("/gamification")}
      className="fixed bottom-4 right-4 z-40 w-56 cursor-pointer rounded-lg border bg-card p-4 shadow-lg transition-shadow hover:shadow-xl"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {t("gamification.totalPoints")}
          </p>
          <p className="text-xl font-bold">
            {userPoints.total_points.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {`${t("gamification.level")} ${userPoints.level}`}
          </span>
          <span className="text-muted-foreground">
            {`${t("gamification.level")} ${userPoints.level + 1}`}
          </span>
        </div>
        <Progress value={userPoints.progress_to_next_level} className="h-2" />
        <p className="text-center text-xs text-muted-foreground">
          {`${userPoints.points_to_next_level} ${t("gamification.pointsToNext")}`}
        </p>
      </div>

      {userPoints.current_streak > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
          <Flame className="h-3.5 w-3.5" />
          <span>
            {`${userPoints.current_streak} ${t("gamification.days")} ${t("gamification.streak").toLowerCase()}`}
          </span>
        </div>
      )}
    </div>
  );
}
