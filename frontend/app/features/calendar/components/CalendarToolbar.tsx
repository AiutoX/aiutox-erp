import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  PanelLeft,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { CalendarViewType } from "../types/calendar.types";

interface CalendarToolbarProps {
  currentDate: Date;
  viewType: CalendarViewType;
  onNavigate: (action: "prev" | "next" | "today") => void;
  onViewChange: (view: CalendarViewType) => void;
  onCreateEvent?: () => void;
  showCreateButton?: boolean;
  showSidebarToggle?: boolean;
  onToggleSidebar?: () => void;
}

export function CalendarToolbar({
  currentDate,
  viewType,
  onNavigate,
  onViewChange,
  onCreateEvent,
  showCreateButton = true,
  showSidebarToggle = false,
  onToggleSidebar,
}: CalendarToolbarProps) {
  const { t, language } = useTranslation();
  const locale = language === "es" ? es : enUS;

  const getDateLabel = () => {
    switch (viewType) {
      case "month":
        return format(currentDate, "MMMM yyyy", { locale });
      case "week":
        return format(currentDate, "'Semana del' dd MMM yyyy", { locale });
      case "day":
        return format(currentDate, "EEEE, dd MMMM yyyy", { locale });
      case "agenda":
        return format(currentDate, "MMMM yyyy", { locale });
      default:
        return format(currentDate, "MMMM yyyy", { locale });
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2 sm:px-4 sm:py-3">
      {/* Navegación de fecha */}
      <div className="flex items-center gap-1 sm:gap-2">
        {showSidebarToggle && onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            aria-label={t("calendar.myCalendars")}
            className="sm:hidden"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate("today")}
          className="hidden sm:flex"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {t("calendar.today")}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate("today")}
          aria-label={t("calendar.today")}
          className="sm:hidden"
        >
          <CalendarIcon className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate("prev")}
            aria-label={t("calendar.previous")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0 text-center sm:min-w-50">
            <span className="block truncate text-sm font-semibold capitalize">
              {getDateLabel()}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate("next")}
            aria-label={t("calendar.next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selector de vista y acciones */}
      <div className="flex items-center gap-2">
        <Select
          value={viewType}
          onValueChange={(value) => onViewChange(value as CalendarViewType)}
        >
          <SelectTrigger className="w-28 sm:w-35">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">{t("calendar.views.month")}</SelectItem>
            <SelectItem value="week">{t("calendar.views.week")}</SelectItem>
            <SelectItem value="day">{t("calendar.views.day")}</SelectItem>
            <SelectItem value="agenda">{t("calendar.views.agenda")}</SelectItem>
          </SelectContent>
        </Select>

        {showCreateButton && onCreateEvent && (
          <>
            <Button onClick={onCreateEvent} size="sm" className="hidden sm:flex">
              <Plus className="mr-2 h-4 w-4" />
              {t("calendar.newEvent")}
            </Button>
            <Button
              onClick={onCreateEvent}
              size="icon"
              aria-label={t("calendar.newEvent")}
              className="sm:hidden"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
