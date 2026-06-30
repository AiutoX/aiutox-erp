import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  getEntityTimeline,
  deleteActivity,
  type Activity,
} from "~/lib/api/activities.api";
import { toast } from "sonner";

interface ActivityTimelineProps {
  entityType: string;
  entityId: string;
  onActivityCreate?: () => void;
  onActivityEdit?: (activity: Activity) => void;
}

export function ActivityTimeline({
  entityType,
  entityId,
  onActivityCreate,
  onActivityEdit,
}: ActivityTimelineProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(
    null
  );
  const [selectedActivityType, setSelectedActivityType] = useState<
    string | undefined
  >();

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "activities",
      "timeline",
      entityType,
      entityId,
      selectedActivityType,
    ],
    queryFn: () =>
      getEntityTimeline(entityType, entityId, {
        page: 1,
        page_size: 100,
        activity_type: selectedActivityType,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (activityId: string) => deleteActivity(activityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success(t("config.activities.deleteConfirm"));
      setDeleteDialogOpen(false);
      setActivityToDelete(null);
    },
    onError: (error) => {
      toast.error(
        `${t("config.activities.errorDeleting")}: ${error instanceof Error ? error.message : t("config.common.errorUnknown")}`
      );
    },
  });

  const handleDelete = (activity: Activity) => {
    setActivityToDelete(activity);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (activityToDelete) {
      deleteMutation.mutate(activityToDelete.id);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      comment: t("config.activities.activityTypeComment"),
      call: t("config.activities.activityTypeCall"),
      email: t("config.activities.activityTypeEmail"),
      meeting: t("config.activities.activityTypeMeeting"),
      task: t("config.activities.activityTypeTask"),
      status_change: t("config.activities.activityTypeStatusChange"),
      note: t("config.activities.activityTypeNote"),
      file_upload: t("config.activities.activityTypeFileUpload"),
      custom: t("config.activities.activityTypeCustom"),
    };
    return typeMap[type] || type;
  };

  const getActivityTypeBadgeVariant = (
    type: string
  ): "default" | "secondary" | "outline" => {
    switch (type) {
      case "comment":
        return "default";
      case "status_change":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p>{t("config.activities.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">
          {t("config.activities.errorLoading")}:{" "}
          {error instanceof Error
            ? error.message
            : t("config.common.errorUnknown")}
        </p>
      </div>
    );
  }

  const activities = data?.data || [];

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <Select
            value={selectedActivityType || "all"}
            onValueChange={(value) =>
              setSelectedActivityType(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("config.activities.filterByType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("config.common.all")}</SelectItem>
              <SelectItem value="comment">
                {t("config.activities.activityTypeComment")}
              </SelectItem>
              <SelectItem value="call">
                {t("config.activities.activityTypeCall")}
              </SelectItem>
              <SelectItem value="email">
                {t("config.activities.activityTypeEmail")}
              </SelectItem>
              <SelectItem value="meeting">
                {t("config.activities.activityTypeMeeting")}
              </SelectItem>
              <SelectItem value="task">
                {t("config.activities.activityTypeTask")}
              </SelectItem>
              <SelectItem value="status_change">
                {t("config.activities.activityTypeStatusChange")}
              </SelectItem>
              <SelectItem value="note">
                {t("config.activities.activityTypeNote")}
              </SelectItem>
              <SelectItem value="file_upload">
                {t("config.activities.activityTypeFileUpload")}
              </SelectItem>
              <SelectItem value="custom">
                {t("config.activities.activityTypeCustom")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {onActivityCreate && (
          <Button onClick={onActivityCreate}>
            {t("config.activities.create")}
          </Button>
        )}
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>{t("config.activities.noActivities")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Card key={activity.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={getActivityTypeBadgeVariant(
                          activity.activity_type
                        )}
                      >
                        {getActivityTypeLabel(activity.activity_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(activity.created_at)}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm mb-1">
                      {activity.title}
                    </h4>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {activity.description}
                      </p>
                    )}
                    {activity.metadata &&
                      Object.keys(activity.metadata).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-2">
                          <details>
                            <summary className="cursor-pointer hover:text-foreground">
                              {t("config.activities.metadataLabel")}
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                              {JSON.stringify(activity.metadata, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                  </div>
                  <div className="flex items-center gap-2">
                    {onActivityEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onActivityEdit(activity)}
                      >
                        {t("config.common.edit")}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(activity)}
                      className="text-red-600 hover:text-red-700"
                    >
                      {t("config.common.delete")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("config.activities.deleteConfirm")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("config.activities.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("config.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("config.common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
