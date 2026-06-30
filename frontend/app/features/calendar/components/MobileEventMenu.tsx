/**
 * MobileEventMenu component
 * Bottom sheet menu for mobile calendar event actions.
 * Uses Dialog with bottom-aligned content for mobile UX.
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Eye, Edit, Trash2, Pencil } from "lucide-react";
import type { CalendarEvent } from "~/features/calendar/types/calendar.types";

interface MobileEventMenuProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onView?: (event: CalendarEvent) => void;
  onEdit?: (event: CalendarEvent) => void;
  onQuickEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
}

export function MobileEventMenu({
  event,
  open,
  onOpenChange,
  onView,
  onEdit,
  onQuickEdit,
  onDelete,
}: MobileEventMenuProps) {
  const { t } = useTranslation();

  if (!event) return null;

  const actions = [
    {
      key: "view",
      label: t("calendar.mobile.view"),
      icon: Eye,
      onClick: () => {
        onView?.(event);
        onOpenChange(false);
      },
    },
    {
      key: "quickEdit",
      label: t("calendar.mobile.quickEdit"),
      icon: Pencil,
      onClick: () => {
        onQuickEdit?.(event);
        onOpenChange(false);
      },
      hidden: !onQuickEdit,
    },
    {
      key: "edit",
      label: t("calendar.mobile.edit"),
      icon: Edit,
      onClick: () => {
        onEdit?.(event);
        onOpenChange(false);
      },
    },
    {
      key: "delete",
      label: t("calendar.mobile.delete"),
      icon: Trash2,
      onClick: () => {
        onDelete?.(event);
        onOpenChange(false);
      },
      variant: "destructive" as const,
    },
  ].filter((a) => !a.hidden);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md fixed bottom-0 left-0 right-0 top-auto translate-y-0 rounded-t-2xl rounded-b-none data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom">
        <DialogHeader>
          <DialogTitle className="text-left truncate pr-8">
            {event.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 pb-4">
          {actions.map((action) => (
            <Button
              key={action.key}
              variant={
                action.variant === "destructive" ? "destructive" : "outline"
              }
              className="w-full justify-start gap-3 h-12 text-base"
              onClick={action.onClick}
            >
              <action.icon className="h-5 w-5" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Bottom safe area for mobile */}
        <div className="h-safe-area-inset-bottom" />
      </DialogContent>
    </Dialog>
  );
}
