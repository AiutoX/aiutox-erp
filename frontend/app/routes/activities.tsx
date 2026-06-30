/**
 * Activities page
 * Main page for activities management
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ActivityTimeline } from "~/features/activities/components/ActivityTimeline";
import { ActivityForm } from "~/features/activities/components/ActivityForm";
import { ActivityFilters } from "~/features/activities/components/ActivityFilters";
import {
  useActivities,
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
} from "~/features/activities/hooks/useActivities";
import type {
  Activity,
  ActivityCreate,
  ActivityUpdate,
  ActivityFilters as ActivityFiltersType,
} from "~/features/activities/types/activity.types";

export default function ActivitiesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("timeline");
  const [_showCreateForm, _setShowCreateForm] = useState(false);
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

  const createActivityMutation = useCreateActivity();
  const updateActivityMutation = useUpdateActivity();
  const deleteActivityMutation = useDeleteActivity();

  const handleCreateActivity = (data: ActivityCreate) => {
    createActivityMutation.mutate(data, {
      onSuccess: () => {
        _setShowCreateForm(false);
        void refetch();
      },
    });
  };

  const handleUpdateActivity = (data: ActivityUpdate) => {
    if (!editingActivity) return;

    updateActivityMutation.mutate(
      { id: editingActivity.id, payload: data },
      {
        onSuccess: () => {
          setEditingActivity(undefined);
          void refetch();
        },
      }
    );
  };

  const handleSubmit = (data: ActivityCreate | ActivityUpdate) => {
    if (editingActivity) {
      handleUpdateActivity(data);
    } else {
      handleCreateActivity(data as ActivityCreate);
    }
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
            <Button onClick={() => _setShowCreateForm(true)}>
              {t("activities.createActivity")}
            </Button>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">
              {t("activities.timeline.title")}
            </TabsTrigger>
            <TabsTrigger value="list">{t("activities.list.title")}</TabsTrigger>
            <TabsTrigger value="form">{t("activities.form.title")}</TabsTrigger>
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
                    {activities.map((activity: Activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline">
                              {t(`activities.types.${activity.activity_type}`)}
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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="form" className="mt-6">
            <div className="max-w-2xl mx-auto">
              <ActivityForm
                activity={editingActivity}
                onSubmit={handleSubmit}
                onCancel={() => {
                  _setShowCreateForm(false);
                  setEditingActivity(undefined);
                }}
                loading={
                  createActivityMutation.isPending ||
                  updateActivityMutation.isPending
                }
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
