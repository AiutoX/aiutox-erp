import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  createTemplate,
  updateTemplate,
  type NotificationTemplate,
  type NotificationTemplateCreate,
} from "~/lib/api/notifications.api";

interface TemplateEditorProps {
  template?: NotificationTemplate | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const AVAILABLE_VARIABLES = [
  { name: "product_name", description: "Nombre del producto" },
  { name: "sku", description: "SKU del producto" },
  { name: "price", description: "Precio" },
  { name: "created_by_name", description: "Nombre del creador" },
  { name: "user_name", description: "Nombre del usuario" },
  { name: "user_email", description: "Email del usuario" },
  { name: "order_id", description: "ID de la orden" },
  { name: "order_total", description: "Total de la orden" },
];

export function TemplateEditor({
  template,
  onCancel,
  onSuccess,
}: TemplateEditorProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditing = !!template;

  const [formData, setFormData] = useState<NotificationTemplateCreate>({
    name: template?.name || "",
    event_type: template?.event_type || "",
    channel: template?.channel || "email",
    subject: template?.subject || "",
    body: template?.body || "",
    is_active: template?.is_active ?? true,
  });

  const createMutation = useMutation({
    mutationFn: (data: NotificationTemplateCreate) => createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", "templates"],
      });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: string;
      data: Partial<NotificationTemplateCreate>;
    }) => updateTemplate(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", "templates"],
      });
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && template) {
      updateMutation.mutate({ templateId: template.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById(
      "templateBody"
    ) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = `${before}{{${variable}}}${after}`;
      setFormData({ ...formData, body: newText });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + variable.length + 4,
          start + variable.length + 4
        );
      }, 0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing
              ? t("config.notifications.templateUpdate")
              : t("config.notifications.templateCreate")}
          </CardTitle>
          <CardDescription>
            {t("config.notifications.templatesDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="templateName">
              {t("config.notifications.templateName")} *
            </Label>
            <Input
              id="templateName"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={t("config.notifications.templateNamePlaceholder")}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="templateChannel">
                {t("config.notifications.templateChannel")} *
              </Label>
              <Select
                value={formData.channel}
                onValueChange={(
                  value: "email" | "sms" | "webhook" | "in-app"
                ) => setFormData({ ...formData, channel: value })}
              >
                <SelectTrigger id="templateChannel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    {t("config.notifications.templateChannelEmail")}
                  </SelectItem>
                  <SelectItem value="sms">
                    {t("config.notifications.templateChannelSMS")}
                  </SelectItem>
                  <SelectItem value="webhook">
                    {t("config.notifications.templateChannelWebhook")}
                  </SelectItem>
                  <SelectItem value="in-app">
                    {t("config.notifications.templateChannelInApp")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateEventType">
                {t("config.notifications.templateEventType")} *
              </Label>
              <Input
                id="templateEventType"
                value={formData.event_type}
                onChange={(e) =>
                  setFormData({ ...formData, event_type: e.target.value })
                }
                placeholder={t(
                  "config.notifications.templateEventTypePlaceholder"
                )}
                required
              />
            </div>
          </div>

          {formData.channel === "email" && (
            <div className="space-y-2">
              <Label htmlFor="templateSubject">
                {t("config.notifications.templateSubject")}
              </Label>
              <Input
                id="templateSubject"
                value={formData.subject || ""}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder={t(
                  "config.notifications.templateSubjectPlaceholder"
                )}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="templateBody">
              {t("config.notifications.templateBody")} *
            </Label>
            <Textarea
              id="templateBody"
              value={formData.body}
              onChange={(e) =>
                setFormData({ ...formData, body: e.target.value })
              }
              placeholder={t("config.notifications.templateBodyPlaceholder")}
              rows={8}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="templateIsActive"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
            <Label htmlFor="templateIsActive" className="cursor-pointer">
              {t("config.notifications.templateIsActive")}
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("config.notifications.templateVariables")}</CardTitle>
          <CardDescription>
            {t("config.notifications.templateVariablesDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_VARIABLES.map((variable) => (
              <Badge
                key={variable.name}
                variant="outline"
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => insertVariable(variable.name)}
              >
                {`{{${variable.name}}}`}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("config.notifications.templateCancel")}
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending
            ? t("config.common.saving")
            : isEditing
              ? t("config.notifications.templateUpdate")
              : t("config.notifications.templateCreate")}
        </Button>
      </div>
    </form>
  );
}
