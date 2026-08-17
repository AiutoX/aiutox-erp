/**
 * CalendarSyncToggle Component
 * Toggle para sincronizar/desincronizar tareas con calendario
 * Sprint 1 - Fase 2
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon, LinkSquare02Icon } from "@hugeicons/core-free-icons";
import { useCalendarSync } from "../hooks/useCalendarSync";
import { showToast } from "~/components/common/Toast";

interface CalendarSyncToggleProps {
  taskId: string;
  compact?: boolean;
  showStatus?: boolean;
}

export function CalendarSyncToggle({
  taskId,
  compact = false,
  showStatus = true,
}: CalendarSyncToggleProps) {
  const { t } = useTranslation();
  const {
    isSynced,
    calendarProvider,
    syncedAt,
    isLoading,
    sync,
    unsync,
    isSyncing,
    isUnsyncing,
  } = useCalendarSync(taskId);

  const [showDialog, setShowDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("internal");

  const handleToggle = (checked: boolean) => {
    if (checked) {
      setShowDialog(true);
    } else {
      handleUnsync();
    }
  };

  const handleSync = () => {
    sync(selectedProvider);
    setShowDialog(false);
    showToast(
      t("tasks.calendarSync.syncSuccess") ||
        "Tarea sincronizada con calendario",
      "success"
    );
  };

  const handleUnsync = () => {
    unsync();
    showToast(
      t("tasks.calendarSync.unsyncSuccess") ||
        "Sincronización con calendario eliminada",
      "success"
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary" />
        <span className="text-sm text-muted-foreground">
          {t("common.loading")}
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <>
        <Button
          variant={isSynced ? "default" : "outline"}
          size="sm"
          onClick={() => (isSynced ? handleUnsync() : setShowDialog(true))}
          disabled={isSyncing || isUnsyncing}
        >
          <HugeiconsIcon
            icon={isSynced ? LinkSquare02Icon : Calendar03Icon}
            size={16}
            className="mr-1"
          />
          {isSynced
            ? t("tasks.calendarSync.synced")
            : t("tasks.calendarSync.sync")}
        </Button>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("tasks.calendarSync.dialogTitle") ||
                  "Sincronizar con calendario"}
              </DialogTitle>
              <DialogDescription>
                {t("tasks.calendarSync.dialogDescription") ||
                  "Selecciona el proveedor de calendario para sincronizar esta tarea."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>
                  {t("tasks.calendarSync.provider") ||
                    "Proveedor de calendario"}
                </Label>
                <Select
                  value={selectedProvider}
                  onValueChange={setSelectedProvider}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">
                      {t("tasks.calendarSync.providers.internal") ||
                        "Calendario interno"}
                    </SelectItem>
                    <SelectItem value="google">
                      {t("tasks.calendarSync.providers.google") ||
                        "Google Calendar"}
                    </SelectItem>
                    <SelectItem value="outlook">
                      {t("tasks.calendarSync.providers.outlook") ||
                        "Outlook Calendar"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSync} disabled={isSyncing}>
                {isSyncing ? t("common.loading") : t("common.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-base">
            {t("tasks.calendarSync.title") || "Sincronización con calendario"}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("tasks.calendarSync.description") ||
              "Sincroniza esta tarea con tu calendario externo"}
          </p>
        </div>
        <Switch
          checked={isSynced}
          onCheckedChange={handleToggle}
          disabled={isSyncing || isUnsyncing}
        />
      </div>

      {showStatus && isSynced && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <HugeiconsIcon icon={LinkSquare02Icon} size={16} />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {t("tasks.calendarSync.syncedWith") || "Sincronizado con"}:{" "}
              <Badge variant="secondary">{calendarProvider}</Badge>
            </p>
            {syncedAt && (
              <p className="text-xs text-muted-foreground">
                {t("tasks.calendarSync.lastSync") || "Última sincronización"}:{" "}
                {new Date(syncedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("tasks.calendarSync.dialogTitle") ||
                "Sincronizar con calendario"}
            </DialogTitle>
            <DialogDescription>
              {t("tasks.calendarSync.dialogDescription") ||
                "Selecciona el proveedor de calendario para sincronizar esta tarea."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {t("tasks.calendarSync.provider") || "Proveedor de calendario"}
              </Label>
              <Select
                value={selectedProvider}
                onValueChange={setSelectedProvider}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">
                    {t("tasks.calendarSync.providers.internal") ||
                      "Calendario interno"}
                  </SelectItem>
                  <SelectItem value="google">
                    {t("tasks.calendarSync.providers.google") ||
                      "Google Calendar"}
                  </SelectItem>
                  <SelectItem value="outlook">
                    {t("tasks.calendarSync.providers.outlook") ||
                      "Outlook Calendar"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? t("common.loading") : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
