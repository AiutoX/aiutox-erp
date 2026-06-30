/**
 * ActivityTimeline component
 * Displays a chronological timeline of activities
 */

import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type {
  Activity,
  ActivityType,
} from "~/features/activities/types/activity.types";
import { cn } from "~/lib/utils";

interface ActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
  onRefresh?: () => void;
}

// Activity type icons mapping
const activityTypeIcons: Record<ActivityType, string> = {
  comment: "💬",
  call: "📞",
  email: "📧",
  meeting: "👥",
  task: "✅",
  status_change: "🔄",
  note: "📝",
  file_upload: "📁",
  custom: "⚡",
};

// Activity type colors
const activityTypeColors: Record<ActivityType, string> = {
  comment: "bg-blue-100 text-blue-800 border-blue-200",
  call: "bg-green-100 text-green-800 border-green-200",
  email: "bg-purple-100 text-purple-800 border-purple-200",
  meeting: "bg-orange-100 text-orange-800 border-orange-200",
  task: "bg-emerald-100 text-emerald-800 border-emerald-200",
  status_change: "bg-yellow-100 text-yellow-800 border-yellow-200",
  note: "bg-gray-100 text-gray-800 border-gray-200",
  file_upload: "bg-indigo-100 text-indigo-800 border-indigo-200",
  custom: "bg-pink-100 text-pink-800 border-pink-200",
};

export function ActivityTimeline({
  activities,
  loading,
  onRefresh,
}: ActivityTimelineProps) {
  const { t } = useTranslation();
  const dateLocale = t("common.locale") === "es" ? es : enUS;

  const formatActivityDate = (dateString: string) => {
    return format(new Date(dateString), "PPP", { locale: dateLocale });
  };

  const getActivityTypeLabel = (type: ActivityType) => {
    return t(`activities.types.${type}`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!activities.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            {t("activities.noActivities")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {onRefresh && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {t("activities.timeline.title")}
          </h3>
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            {t("common.refresh")}
          </Button>
        </div>
      )}

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        {activities.map((activity) => (
          <div
            key={activity.id}
            className="relative flex items-start space-x-4 pb-8"
          >
            {/* Timeline dot */}
            <div className="relative z-10">
              <div
                className={cn(
                  "w-3 h-3 rounded-full border-2 flex items-center justify-center",
                  activityTypeColors[activity.activity_type]
                )}
              >
                <span className="text-xs">
                  {activityTypeIcons[activity.activity_type]}
                </span>
              </div>
            </div>

            {/* Activity card */}
            <Card className="flex-1">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-base">
                      {activity.title}
                    </CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>
                        {getActivityTypeLabel(activity.activity_type)}
                      </span>
                      <span>•</span>
                      <span>{formatActivityDate(activity.created_at)}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {t("activities.timeline.activity")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {activity.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {activity.description}
                  </p>
                )}

                {/* Activity metadata */}
                {activity.metadata &&
                  Object.keys(activity.metadata).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(activity.metadata).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center space-x-2 text-xs"
                        >
                          <span className="font-medium text-muted-foreground">
                            {t(`activities.metadata.${key}`) || key}:
                          </span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
