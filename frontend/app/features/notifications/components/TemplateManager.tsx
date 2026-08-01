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
import { Plus, Pencil, Trash2, Eye, Clock } from "lucide-react";
import DOMPurify from "dompurify";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useHasPermission } from "~/hooks/usePermissions";
import { showToast } from "~/components/common/Toast";
import {
  useNotificationTemplates,
  useCreateNotificationTemplate,
  useUpdateNotificationTemplate,
  useDeleteNotificationTemplate,
  useNotificationTemplateVersions,
  useRenderNotificationTemplate,
  useNotificationChannelsCatalog,
} from "../hooks/useNotifications";
import type {
  NotificationTemplate,
  NotificationTemplateCreate,
} from "../types/notifications.types";
import { deriveModuleFromEventType } from "../utils/deriveModuleFromEventType";

const EMPTY_FORM: NotificationTemplateCreate = {
  name: "",
  event_type: "",
  channel: "email",
  subject: "",
  body: "",
  is_active: true,
};

function VersionHistoryDialog({
  template,
  onClose,
}: {
  template: NotificationTemplate | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: resp } = useNotificationTemplateVersions(template?.id ?? "");
  const versions = resp?.data ?? [];

  return (
    <Dialog open={!!template} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("notifications.templates.versions.title")}</DialogTitle>
        </DialogHeader>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("notifications.templates.versions.empty")}
          </p>
        ) : (
          <div className="space-y-2">
            {versions.map((v) => (
              <Card key={v.id}>
                <CardContent className="p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">v{v.version_number}</span>
                    {v.is_current && (
                      <Badge className="text-xs">
                        {t("notifications.templates.versions.current")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {v.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TemplateManager() {
  const { t } = useTranslation();
  const canEdit = useHasPermission("notifications.edit");
  const canDelete = useHasPermission("notifications.delete");

  const [filterChannel, setFilterChannel] = useState<string>("");
  const [filterActive, setFilterActive] = useState<string>("");
  const [filterModule, setFilterModule] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: resp, isLoading } = useNotificationTemplates({
    channel: filterChannel || undefined,
    is_active: filterActive ? filterActive === "active" : undefined,
    q: searchQuery || undefined,
  });
  const templates = resp?.data ?? [];

  // event_type has no dedicated module column — module filtering happens
  // client-side over the already-fetched page, derived from the same
  // prefix convention the row label uses.
  const availableModules = Array.from(
    new Set(templates.map((tpl) => deriveModuleFromEventType(tpl.event_type)))
  ).sort();
  const visibleTemplates = filterModule
    ? templates.filter(
        (tpl) => deriveModuleFromEventType(tpl.event_type) === filterModule
      )
    : templates;

  const { data: catalogResp } = useNotificationChannelsCatalog();
  const channelCatalog = catalogResp?.data ?? [];

  const createMutation = useCreateNotificationTemplate();
  const updateMutation = useUpdateNotificationTemplate();
  const deleteMutation = useDeleteNotificationTemplate();
  const renderMutation = useRenderNotificationTemplate();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NotificationTemplate | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<NotificationTemplate | null>(
    null
  );
  const [versionsTarget, setVersionsTarget] =
    useState<NotificationTemplate | null>(null);
  const [renderTarget, setRenderTarget] = useState<NotificationTemplate | null>(
    null
  );
  const [renderResult, setRenderResult] = useState<{
    subject: string | null;
    body: string;
  } | null>(null);
  const [form, setForm] = useState<NotificationTemplateCreate>(EMPTY_FORM);

  const handleRenderConfirm = () => {
    if (!renderTarget) return;
    renderMutation.mutate(
      { templateId: renderTarget.id, context: {} },
      {
        onSuccess: (resp) => setRenderResult(resp.data),
        onError: () =>
          showToast(t("notifications.templates.render.error"), "error"),
      }
    );
  };

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
          {visibleTemplates.length} {t("notifications.templates.count")}
        </p>
        {canEdit && (
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t("notifications.templates.create")}
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={filterChannel || "all"}
          onValueChange={(v) => setFilterChannel(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue
              placeholder={t("notifications.templates.filter.allChannels")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("notifications.templates.filter.allChannels")}
            </SelectItem>
            {channelCatalog.map((entry) => (
              <SelectItem key={entry.channel} value={entry.channel}>
                {entry.channel}
                {!entry.available &&
                  ` (${t("notifications.templates.channelUnavailable")})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterModule || "all"}
          onValueChange={(v) => setFilterModule(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue
              placeholder={t("notifications.templates.filter.allModules")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("notifications.templates.filter.allModules")}
            </SelectItem>
            {availableModules.map((mod) => (
              <SelectItem key={mod} value={mod}>
                {mod}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterActive || "all"}
          onValueChange={(v) => setFilterActive(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue
              placeholder={t("notifications.templates.filter.allStatus")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("notifications.templates.filter.allStatus")}
            </SelectItem>
            <SelectItem value="active">
              {t("notifications.templates.active")}
            </SelectItem>
            <SelectItem value="inactive">
              {t("notifications.templates.inactive")}
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("notifications.templates.filter.search")}
          className="max-w-xs"
        />
      </div>

      {/* Template list */}
      {visibleTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {t("notifications.templates.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {visibleTemplates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">
                      {deriveModuleFromEventType(tpl.event_type)}: {tpl.name}
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
                {(canEdit || canDelete) && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRenderTarget(tpl);
                        setRenderResult(null);
                      }}
                      className="h-8 w-8 p-0"
                      title={t("notifications.templates.render.action")}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVersionsTarget(tpl)}
                      className="h-8 w-8 p-0"
                      title={t("notifications.templates.versions.title")}
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </Button>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(tpl)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(tpl)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
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
                    {channelCatalog
                      .filter((entry) => entry.available)
                      .map((entry) => (
                        <SelectItem key={entry.channel} value={entry.channel}>
                          {entry.channel}
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

      {/* Render preview dialog */}
      <Dialog
        open={!!renderTarget}
        onOpenChange={(v) => {
          if (!v) {
            setRenderTarget(null);
            setRenderResult(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("notifications.templates.render.title")}</DialogTitle>
          </DialogHeader>
          <Button onClick={handleRenderConfirm}>
            {t("notifications.templates.render.action")}
          </Button>
          {renderResult && (
            <div
              className="border rounded p-3 text-sm"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(renderResult.body),
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Version history dialog */}
      <VersionHistoryDialog
        template={versionsTarget}
        onClose={() => setVersionsTarget(null)}
      />
    </div>
  );
}
