import { useState } from "react";
import { Award, Clock, Flame, Medal, Trophy } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useTranslation } from "~/lib/i18n/useTranslation";

import type { GamificationEvent } from "~/features/gamification/api/gamification.api";
import { BadgeDisplay } from "~/features/gamification/components/BadgeDisplay";
import { Leaderboard } from "~/features/gamification/components/Leaderboard";
import {
  useMyHistory,
  useMyPoints,
} from "~/features/gamification/hooks/useGamification";

export default function GamificationPage() {
  const { t } = useTranslation();
  const { data: userPoints } = useMyPoints();
  const { data: history = [] } = useMyHistory(50);
  const [activeTab, setActiveTab] = useState("overview");

  const level = userPoints?.level ?? 1;
  const totalPoints = userPoints?.total_points ?? 0;
  const progress = userPoints?.progress_to_next_level ?? 0;
  const pointsToNext = userPoints?.points_to_next_level ?? 100;

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("gamification.title")}</h1>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("gamification.totalPoints")}
              </p>
              <p className="text-xl font-bold">
                {totalPoints.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Medal className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("gamification.level")}
              </p>
              <p className="text-xl font-bold">{level}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
              <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("gamification.currentStreak")}
              </p>
              <p className="text-xl font-bold">
                {`${userPoints?.current_streak ?? 0} ${t("gamification.days")}`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("gamification.longestStreak")}
              </p>
              <p className="text-xl font-bold">
                {`${userPoints?.longest_streak ?? 0} ${t("gamification.days")}`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span>{`${t("gamification.level")} ${level}`}</span>
            <span className="text-muted-foreground">
              {`${pointsToNext} ${t("gamification.pointsToNext")}`}
            </span>
            <span>{`${t("gamification.level")} ${level + 1}`}</span>
          </div>
          <Progress value={progress} className="mt-2 h-3" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            {t("gamification.overview")}
          </TabsTrigger>
          <TabsTrigger value="badges">{t("gamification.badges")}</TabsTrigger>
          <TabsTrigger value="leaderboard">
            {t("gamification.leaderboard")}
          </TabsTrigger>
          <TabsTrigger value="history">{t("gamification.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("gamification.badges")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BadgeDisplay variant="grid" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("gamification.leaderboard")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Leaderboard />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="badges" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("gamification.allBadges")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BadgeDisplay variant="grid" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("gamification.leaderboard")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Leaderboard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("gamification.history")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("gamification.noHistory")}
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((event: GamificationEvent) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {event.event_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(event.created_at),
                              "dd/MM/yyyy HH:mm"
                            )}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {`+${event.points_earned} ${t("gamification.pointsEarned")}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
