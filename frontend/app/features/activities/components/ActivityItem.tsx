/**
 * ActivityItem component
 * Individual activity item for list view
 */

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { enUS } from "date-fns/locale/en-US";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type {
  Activity,
  ActivityType,
} from "~/features/activities/types/activity.types";

interface ActivityItemProps {
  activity: Activity;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
  showActions?: boolean;
}

// Activity type icons and colors (same as ActivityTimeline)
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

export function ActivityItem({
  activity,
  onEdit,
  onDelete,
  showActions = false,
}: ActivityItemProps) {
  const { t, language } = useTranslation();
  const dateLocale = language === "es" ? es : enUS;

  const formatActivityDate = (dateString: string) => {
    return format(new Date(dateString), "PPP", { locale: dateLocale });
  };

  const getActivityTypeLabel = (type: ActivityType) => {
    return t(`activities.types.${type}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-3">
              <span
                className={cn(
                  "text-lg",
                  activityTypeColors[activity.activity_type]
                )}
              >
                {activityTypeIcons[activity.activity_type]}
              </span>
              <Badge variant="secondary" className="text-xs">
                {getActivityTypeLabel(activity.activity_type)}
              </Badge>
            </div>
            <CardTitle className="text-base leading-tight">
              {activity.title}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {formatActivityDate(activity.created_at)}
            </div>
          </div>

          {showActions && (
            <div className="flex space-x-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(activity)}
                >
                  {t("common.edit")}
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(activity)}
                  className="text-destructive hover:text-destructive"
                >
                  {t("common.delete")}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {activity.description && (
          <p className="text-sm text-muted-foreground mb-4">
            {activity.description}
          </p>
        )}

        {/* Activity metadata */}
        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <div className="space-y-2">
            {Object.entries(activity.metadata).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between py-2 border-b border-border"
              >
                <span className="text-sm font-medium text-muted-foreground">
                  {t(`activities.metadata.${key}`)}
                </span>
                <span className="text-sm">{String(value)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Entity reference */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{t("activities.entity")}:</span>{" "}
            <span>{activity.entity_type}</span> (ID: {activity.entity_id})
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
