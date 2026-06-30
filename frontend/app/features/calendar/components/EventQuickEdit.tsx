/**
 * EventQuickEdit component
 * Popover for quick editing of calendar event basic fields (title, times, description).
 * Provides a "Edit full" button to open the full modal editor.
 */

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Maximize2, Save } from "lucide-react";
import type { CalendarEvent } from "~/features/calendar/types/calendar.types";

interface EventQuickEditProps {
  event: CalendarEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    title: string;
    description: string;
    start_time: string;
    end_time: string;
  }) => void;
  onOpenFull: () => void;
  isSaving?: boolean;
  children: React.ReactNode;
}

export function EventQuickEdit({
  event,
  open,
  onOpenChange,
  onSave,
  onOpenFull,
  isSaving = false,
  children,
}: EventQuickEditProps) {
  const { t } = useTranslation();

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || "");
  const [startTime, setStartTime] = useState(() =>
    formatDateTimeLocal(event.start_time)
  );
  const [endTime, setEndTime] = useState(() =>
    formatDateTimeLocal(event.end_time)
  );

  // Reset form when event changes
  useEffect(() => {
    setTitle(event.title);
    setDescription(event.description || "");
    setStartTime(formatDateTimeLocal(event.start_time));
    setEndTime(formatDateTimeLocal(event.end_time));
  }, [
    event.id,
    event.title,
    event.description,
    event.start_time,
    event.end_time,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
    });
  };

  const handleOpenFull = () => {
    onOpenChange(false);
    onOpenFull();
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        side="right"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <form onSubmit={handleSubmit} className="space-y-3 p-4">
          <div className="flex items-center justify-between pb-1 border-b">
            <h4 className="text-sm font-semibold text-muted-foreground">
              {t("calendar.quickEdit.title")}
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleOpenFull}
            >
              <Maximize2 className="h-3 w-3 mr-1" />
              {t("calendar.quickEdit.openFull")}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qe-title" className="text-xs">
              {t("calendar.events.title")}
            </Label>
            <Input
              id="qe-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="qe-start" className="text-xs">
                {t("calendar.events.start")}
              </Label>
              <Input
                id="qe-start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qe-end" className="text-xs">
                {t("calendar.events.end")}
              </Label>
              <Input
                id="qe-end"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="qe-desc" className="text-xs">
              {t("calendar.events.description")}
            </Label>
            <Textarea
              id="qe-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm min-h-[60px] resize-none"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-7 text-xs"
              disabled={isSaving || !title.trim()}
            >
              <Save className="h-3 w-3 mr-1" />
              {t("common.save")}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function formatDateTimeLocal(isoString: string): string {
  try {
    const date = new Date(isoString);
    return format(date, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}
