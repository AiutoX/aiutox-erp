import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
import { Switch } from "~/components/ui/switch";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  listTemplates,
  deleteTemplate,
  updateTemplate,
  type NotificationTemplate,
} from "~/lib/api/notifications.api";

interface TemplateListProps {
  onEdit: (template: NotificationTemplate) => void;
  onCreate: () => void;
}

export function TemplateList({ onEdit, onCreate }: TemplateListProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] =
    useState<NotificationTemplate | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications", "templates"],
    queryFn: () => listTemplates({ page: 1, page_size: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => deleteTemplate(templateId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["notifications", "templates"],
      });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({
      templateId,
      isActive,
    }: {
      templateId: string;
      isActive: boolean;
    }) => updateTemplate(templateId, { is_active: isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["notifications", "templates"],
      });
    },
  });

  const handleDelete = (template: NotificationTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id);
    }
  };

  const handleToggleActive = (
    template: NotificationTemplate,
    checked: boolean
  ) => {
    toggleActiveMutation.mutate({ templateId: template.id, isActive: checked });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p>{t("config.notifications.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">
          {t("config.notifications.errorLoading")}:{" "}
          {error instanceof Error
            ? error.message
            : t("config.common.errorUnknown")}
        </p>
      </div>
    );
  }

  const templates = data?.data || [];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            {t("config.notifications.templatesTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("config.notifications.templatesDesc")}
          </p>
        </div>
        <Button onClick={onCreate}>
          {t("config.notifications.templatesNew")}
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {t("config.notifications.templatesEmpty")}
            </p>
            <Button onClick={onCreate}>
              {t("config.notifications.templatesNew")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {template.name}
                      <Badge
                        variant={template.is_active ? "default" : "secondary"}
                      >
                        {template.is_active
                          ? t("config.notifications.templateActive")
                          : t("config.notifications.templateInactive")}
                      </Badge>
                      <Badge variant="outline">{template.channel}</Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {t("config.notifications.templateEventType")}:{" "}
                      {template.event_type}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={(checked) =>
                        handleToggleActive(template, checked)
                      }
                      disabled={toggleActiveMutation.isPending}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(template)}
                    >
                      {t("config.common.edit")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(template)}
                      disabled={deleteMutation.isPending}
                    >
                      {t("config.common.delete")}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {template.subject && (
                  <div className="mb-2">
                    <p className="text-sm font-medium">
                      {t("config.notifications.templateSubject")}:
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {template.subject}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">
                    {t("config.notifications.templateBody")}:
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.body}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("config.notifications.templateDeleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("config.notifications.templateDeleteMessage")}
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
