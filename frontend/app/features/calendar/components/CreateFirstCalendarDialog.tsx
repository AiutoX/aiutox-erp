/**
 * CreateFirstCalendarDialog
 * Minimal form for a user with zero calendars to create their own personal
 * calendar, so they can start creating events without needing another user
 * to share a calendar with them.
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useCreateCalendar } from "~/features/calendar/hooks/useCalendar";

interface CreateFirstCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const DEFAULT_COLOR = "#023E87";

export function CreateFirstCalendarDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateFirstCalendarDialogProps) {
  const { t } = useTranslation();
  const createCalendar = useCreateCalendar();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(
        t("calendar.errors.nameRequired") || "El nombre es obligatorio"
      );
      return;
    }

    try {
      await createCalendar.mutateAsync({
        name: name.trim(),
        calendar_type: "personal",
        color: DEFAULT_COLOR,
      });
      setName("");
      onOpenChange(false);
      onCreated();
    } catch {
      setError(
        t("calendar.errors.createCalendarFailed") ||
          "Error al crear el calendario"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle>
            {t("calendar.createFirstCalendar") || "Crear mi calendario"}
          </DialogTitle>
          <DialogDescription>
            {t("calendar.createFirstCalendarDescription") ||
              "Crea tu primer calendario personal para poder agregar eventos."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4"
        >
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="new-calendar-name">
              {t("calendar.calendarName") || "Nombre del calendario"} *
            </Label>
            <Input
              id="new-calendar-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                t("calendar.calendarNamePlaceholder") || "Mi calendario"
              }
              required
              autoFocus
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createCalendar.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createCalendar.isPending}>
              {createCalendar.isPending
                ? t("common.saving")
                : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
