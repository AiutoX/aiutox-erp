/**
 * TemplateManager
 * CRUD panel for notification templates.
 * Uses GET/POST/PUT/DELETE /api/v1/notifications/templates
 */

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { showToast } from "~/components/common/Toast";
import {
  useNotificationTemplates,
  useCreateNotificationTemplate,
  useUpdateNotificationTemplate,
  useDeleteNotificationTemplate,
} from "../hooks/useNotifications";
import type {
  NotificationTemplate,
  NotificationTemplateCreate,
} from "../types/notifications.types";

const CHANNELS = ["email", "sms", "in-app", "whatsapp", "webhook"] as const;

const EMPTY_FORM: NotificationTemplateCreate = {
  name: "",
  event_type: "",
  channel: "email",
  subject: "",
  body: "",
  is_active: true,
};

export function TemplateManager() {
  const { t } = useTranslation();
  const { data: resp, isLoading } = useNotificationTemplates();
  const templates = resp?.data ?? [];

  const createMutation = useCreateNotificationTemplate();
  const updateMutation = useUpdateNotificationTemplate();
  const deleteMutation = useDeleteNotificationTemplate();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NotificationTemplate | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<NotificationTemplate | null>(
    null
  );
  const [form, setForm] = useState<NotificationTemplateCreate>(EMPTY_FORM);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (tpl: NotificationTemplate) => {
    setEditTarget(tpl);
    setForm({
      name: tpl.name,
      event_type: tpl.event_type,
      channel: tpl.channel,
      subject: tpl.subject,
      body: tpl.body,
      is_active: tpl.is_active,
    });
    setFormOpen(true);
  };

  const set = (key: keyof NotificationTemplateCreate, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.name || !form.event_type || !form.body) {
      showToast(t("notifications.templates.validationError"), "error");
      return;
    }

    if (editTarget) {
      updateMutation.mutate(
        { templateId: editTarget.id, data: form },
        {
          onSuccess: () => {
            showToast(t("notifications.templates.updated"), "success");
            setFormOpen(false);
          },
          onError: () => showToast(t("notifications.templates.error"), "error"),
        }
      );
    } else {
      createMutation.mutate(form, {
        onSuccess: () => {
          showToast(t("notifications.templates.created"), "success");
          setFormOpen(false);
        },
        onError: () => showToast(t("notifications.templates.error"), "error"),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        showToast(t("notifications.templates.deleted"), "success");
        setDeleteTarget(null);
      },
      onError: () => showToast(t("notifications.templates.error"), "error"),
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {templates.length} {t("notifications.templates.count")}
        </p>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" />
          {t("notifications.templates.create")}
        </Button>
      </div>

      {/* Template list */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {t("notifications.templates.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">
                      {tpl.name}
                    </span>
                    <Badge
                      variant={tpl.is_active ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {tpl.is_active
                        ? t("notifications.templates.active")
                        : t("notifications.templates.inactive")}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-mono">
                      {tpl.channel}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {tpl.event_type}
                  </p>
                  {tpl.subject && (
                    <p className="text-xs text-muted-foreground truncate">
                      {t("notifications.templates.subject")}: {tpl.subject}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(tpl)}
                    className="h-8 w-8 p-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(tpl)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(v) => !v && setFormOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget
                ? t("notifications.templates.edit")
                : t("notifications.templates.create")}
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? t("notifications.templates.editDescription")
                : t("notifications.templates.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>{t("notifications.templates.name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("notifications.templates.namePlaceholder")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("notifications.templates.eventType")}</Label>
                <Input
                  value={form.event_type}
                  onChange={(e) => set("event_type", e.target.value)}
                  placeholder="ej. billing.cobro_generado"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("notifications.templates.channel")}</Label>
                <Select
                  value={form.channel}
                  onValueChange={(v) => set("channel", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((ch) => (
                      <SelectItem key={ch} value={ch}>
                        {ch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("notifications.templates.subject")}</Label>
              <Input
                value={form.subject ?? ""}
                onChange={(e) => set("subject", e.target.value)}
                placeholder={t("notifications.templates.subjectPlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("notifications.templates.body")}</Label>
              <Textarea
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder={t("notifications.templates.bodyPlaceholder")}
                rows={5}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_active ?? true}
                onCheckedChange={(v) => set("is_active", v)}
                id="tpl-active"
              />
              <Label htmlFor="tpl-active">
                {t("notifications.templates.active")}
              </Label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={isPending}
              >
                {isPending ? t("common.saving") : t("common.save")}
              </Button>
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("notifications.templates.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("notifications.templates.deleteConfirm")} &quot;
              {deleteTarget?.name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
