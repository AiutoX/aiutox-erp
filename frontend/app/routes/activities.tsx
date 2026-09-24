/**
 * Activities page
 * Main page for activities management
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useHasAnyPermission } from "~/hooks/usePermissions";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ActivityTimeline } from "~/features/activities/components/ActivityTimeline";
import { ActivityForm } from "~/features/activities/components/ActivityForm";
import { ActivityFilters } from "~/features/activities/components/ActivityFilters";
import {
  useActivities,
  useUpdateActivity,
  useDeleteActivity,
} from "~/features/activities/hooks/useActivities";
import {
  canModifyActivity,
  humanizeActivityType,
} from "~/features/activities/utils/activityTypes";
import type {
  Activity,
  ActivityUpdate,
  ActivityFilters as ActivityFiltersType,
} from "~/features/activities/types/activity.types";

export default function ActivitiesPage() {
  const { t } = useTranslation();
  const canManageActivities = useHasAnyPermission([
    "activities.manage",
    "activities.edit",
    "activities.delete",
  ]);
  const [activeTab, setActiveTab] = useState("timeline");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>(
    undefined
  );
  const [filters, setFilters] = useState<ActivityFiltersType>({
    activity_types: [],
    entity_types: [],
    date_from: "",
    date_to: "",
    search: "",
  });

  // Query hooks
  const {
    data: activitiesData,
    isLoading,
    error,
    refetch,
  } = useActivities({
    ...filters,
    page: 1,
    page_size: 20,
  });

  const updateActivityMutation = useUpdateActivity();
  const deleteActivityMutation = useDeleteActivity();

  // This page only edits existing activities (each already has a real
  // entity_type/entity_id). Creating a brand new activity requires a real
  // entity context, which this global view doesn't have — that flow belongs
  // to the entity screens that already embed ActivityForm/ActivityTimeline
  // with a real entityType/entityId (e.g. maintenance work orders).
  const handleSubmit = (data: ActivityUpdate) => {
    if (!editingActivity) return;

    updateActivityMutation.mutate(
      { id: editingActivity.id, payload: data },
      {
        onSuccess: () => {
          setEditingActivity(undefined);
          setIsFormDialogOpen(false);
          void refetch();
        },
      }
    );
  };

  const handleDeleteActivity = (activity: Activity) => {
    if (!confirm(t("activities.deleteConfirm"))) return;

    deleteActivityMutation.mutate(activity.id, {
      onSuccess: () => {
        void refetch();
      },
    });
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setIsFormDialogOpen(true);
  };

  const handleApplyFilters = () => {
    void refetch();
  };

  const handleResetFilters = () => {
    setFilters({
      activity_types: [],
      entity_types: [],
      date_from: "",
      date_to: "",
      search: "",
    });
    void refetch();
  };

  const activities = activitiesData?.data || [];
  const total = activitiesData?.meta?.total || 0;

  return (
    <PageLayout
      title={t("activities.title")}
      description={t("activities.description")}
      loading={isLoading}
      error={error}
    >
      <div className="space-y-6">
        {/* Header with actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">
              {total} {t("activities.activities")}
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <ActivityFilters
          filters={filters}
          onFiltersChange={setFilters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          loading={isLoading}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timeline">
              {t("activities.timeline.title")}
            </TabsTrigger>
            <TabsTrigger value="list">{t("activities.list.title")}</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-6">
            <ActivityTimeline
              activities={activities}
              loading={isLoading}
              onRefresh={() => void refetch()}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("activities.list.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {t("activities.noActivities")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity: Activity) => {
                      const typeKey = `activities.types.${activity.activity_type}`;
                      const typeLabel = t(typeKey);
                      const canModifyThisActivity =
                        canManageActivities && canModifyActivity(activity);
                      return (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <Badge variant="outline">
                                {typeLabel === typeKey
                                  ? humanizeActivityType(activity.activity_type)
                                  : typeLabel}
                              </Badge>
                              <span className="font-medium">
                                {activity.title}
                              </span>
                            </div>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {activity.description}
                              </p>
                            )}
                          </div>
                          {canModifyThisActivity && (
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditActivity(activity)}
                              >
                                {t("common.edit")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteActivity(activity)}
                                className="text-destructive hover:text-destructive"
                              >
                                {t("common.delete")}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={isFormDialogOpen}
        onOpenChange={(open) => {
          setIsFormDialogOpen(open);
          if (!open) setEditingActivity(undefined);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("activities.editActivity")}</DialogTitle>
          </DialogHeader>
          <ActivityForm
            activity={editingActivity}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsFormDialogOpen(false);
              setEditingActivity(undefined);
            }}
            loading={updateActivityMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
