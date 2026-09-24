/**
 * CalendarShareDialog component
 * Share a calendar with other internal users, with a per-user permission level
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Delete01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useCalendarShares,
  useShareCalendar,
  useRevokeCalendarShare,
} from "~/features/calendar/hooks/useCalendar";
import { useUsers } from "~/features/users/hooks/useUsers";
import { resolveCommentAuthorName } from "~/features/calendar/utils/comments";
import type { CalendarSharePermissionLevel } from "~/features/calendar/types/calendar.types";

interface CalendarShareDialogProps {
  calendarId: string;
  calendarName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarShareDialog({
  calendarId,
  calendarName,
  open,
  onOpenChange,
}: CalendarShareDialogProps) {
  const { t } = useTranslation();
  const { users } = useUsers({ page_size: 100 });
  const { data: sharesData } = useCalendarShares(calendarId);
  const shareCalendar = useShareCalendar();
  const revokeShare = useRevokeCalendarShare();

  const [selectedUserId, setSelectedUserId] = useState("");
  const [permissionLevel, setPermissionLevel] =
    useState<CalendarSharePermissionLevel>("view");

  const shares = sharesData?.data || [];
  const sharedUserIds = new Set(shares.map((s) => s.user_id));
  const availableUsers = users.filter((u) => !sharedUserIds.has(u.id));

  const getUserLabel = (userId: string) =>
    resolveCommentAuthorName(users, userId, userId);

  const handleShare = () => {
    if (!selectedUserId) return;

    shareCalendar.mutate(
      {
        calendarId,
        payload: { user_id: selectedUserId, permission_level: permissionLevel },
      },
      {
        onSuccess: () => {
          setSelectedUserId("");
          setPermissionLevel("view");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-110">
        <DialogHeader>
          <DialogTitle>
            {t("calendar.share.title") || "Compartir calendario"}
          </DialogTitle>
          <DialogDescription>
            {`${t("calendar.share.descriptionPrefix") || "Compartir"} "${calendarName}" ${
              t("calendar.share.descriptionSuffix") || "con otros usuarios"
            }`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue
                  placeholder={
                    t("calendar.share.selectUser") || "Seleccionar usuario"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {resolveCommentAuthorName(users, u.id, u.email)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={permissionLevel}
              onValueChange={(value) =>
                setPermissionLevel(value as CalendarSharePermissionLevel)
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">
                  {t("calendar.share.view") || "Lectura"}
                </SelectItem>
                <SelectItem value="manage">
                  {t("calendar.share.manage") || "Gestión"}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              disabled={!selectedUserId || shareCalendar.isPending}
              onClick={handleShare}
            >
              {t("calendar.share.add") || "Agregar"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              {t("calendar.share.sharedWith") || "Compartido con"}
            </Label>
            {shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("calendar.share.noShares") || "Aún no compartido"}
              </p>
            ) : (
              <div className="space-y-1">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span>{getUserLabel(share.user_id)}</span>
                      <span className="text-xs text-muted-foreground">
                        {share.permission_level === "manage"
                          ? t("calendar.share.manage") || "Gestión"
                          : t("calendar.share.view") || "Lectura"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={revokeShare.isPending}
                      onClick={() =>
                        revokeShare.mutate({ calendarId, userId: share.user_id })
                      }
                    >
                      <HugeiconsIcon icon={Delete01Icon} size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
