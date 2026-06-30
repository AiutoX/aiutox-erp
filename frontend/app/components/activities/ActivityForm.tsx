import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  createActivity,
  updateActivity,
  type Activity,
  type ActivityCreate,
  type ActivityUpdate,
} from "~/lib/api/activities.api";
import { toast } from "sonner";

interface ActivityFormProps {
  entityType: string;
  entityId: string;
  activity?: Activity;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ActivityForm({
  entityType,
  entityId,
  activity,
  onSuccess,
  onCancel,
}: ActivityFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditing = !!activity;

  const form = useForm<ActivityCreate | ActivityUpdate>({
    defaultValues: {
      entity_type: entityType,
      entity_id: entityId,
      activity_type: activity?.activity_type || "comment",
      title: activity?.title || "",
      description: activity?.description || null,
      metadata: activity?.metadata || null,
    },
  });

  useEffect(() => {
    if (activity) {
      form.reset({
        title: activity.title,
        description: activity.description || null,
        metadata: activity.metadata || null,
      });
    }
  }, [activity, form]);

  const createMutation = useMutation({
    mutationFn: (data: ActivityCreate) => createActivity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success(t("config.activities.create"));
      form.reset();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error(
        `${t("config.activities.errorCreating")}: ${error instanceof Error ? error.message : t("config.common.errorUnknown")}`
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      activityId,
      data,
    }: {
      activityId: string;
      data: ActivityUpdate;
    }) => updateActivity(activityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success(t("config.activities.edit"));
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error(
        `${t("config.activities.errorUpdating")}: ${error instanceof Error ? error.message : t("config.common.errorUnknown")}`
      );
    },
  });

  const onSubmit = (data: ActivityCreate | ActivityUpdate) => {
    if (isEditing && activity) {
      updateMutation.mutate({
        activityId: activity.id,
        data: {
          title: data.title,
          description: data.description,
          metadata: data.metadata,
        },
      });
    } else {
      createMutation.mutate({
        entity_type: entityType,
        entity_id: entityId,
        activity_type: (data as ActivityCreate).activity_type || "comment",
        title: data.title || "",
        description: data.description || null,
        metadata: data.metadata || null,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!isEditing && (
          <FormField
            control={form.control}
            name="activity_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("config.activities.activityType")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("config.activities.activityType")}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="title"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("config.activities.titleLabel")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("config.activities.titlePlaceholder")}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("config.activities.descriptionLabel")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("config.activities.descriptionPlaceholder")}
                  {...field}
                  value={field.value || ""}
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("config.activities.cancel")}
            </Button>
          )}
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {isEditing
              ? t("config.common.update")
              : t("config.activities.save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
