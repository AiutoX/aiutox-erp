import { useState } from "react";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Search, Filter } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { Calendar } from "../types/calendar.types";

interface CalendarSidebarProps {
  calendars: Calendar[];
  selectedCalendarIds: string[];
  onToggleCalendar: (calendarId: string) => void;
  onDateSelect?: (date: Date) => void;
  currentDate: Date;
  showMiniCalendar?: boolean;
  showFilters?: boolean;
}

export function CalendarSidebar({
  calendars,
  selectedCalendarIds,
  onToggleCalendar,
  currentDate,
  showMiniCalendar = true,
  showFilters = true,
}: CalendarSidebarProps) {
  const { t, language } = useTranslation();
  const locale = language === "es" ? es : enUS;
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCalendars = calendars.filter((calendar) =>
    calendar.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      {/* Mini Calendar */}
      {showMiniCalendar && (
        <div className="border-b p-4">
          <div className="text-center">
            <p className="text-sm font-semibold capitalize">
              {format(currentDate, "MMMM yyyy", { locale })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(currentDate, "EEEE, dd", { locale })}
            </p>
          </div>
          {/* TODO: Integrar MiniCalendar component existente */}
        </div>
      )}

      {/* Búsqueda de calendarios */}
      <div className="border-b p-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("calendar.searchCalendars")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Lista de calendarios */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-semibold">
                {t("calendar.myCalendars")}
              </Label>
              <span className="text-xs text-muted-foreground">
                {selectedCalendarIds.length}/{calendars.length}
              </span>
            </div>

            <div className="space-y-2">
              {filteredCalendars.map((calendar) => (
                <div key={calendar.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`calendar-${calendar.id}`}
                    checked={selectedCalendarIds.includes(calendar.id)}
                    onCheckedChange={() => onToggleCalendar(calendar.id)}
                  />
                  <div className="flex flex-1 items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: calendar.color || "#023E87" }}
                    />
                    <Label
                      htmlFor={`calendar-${calendar.id}`}
                      className="flex-1 cursor-pointer text-sm font-normal"
                    >
                      {calendar.name}
                    </Label>
                  </div>
                </div>
              ))}

              {filteredCalendars.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {t("calendar.noCalendarsFound")}
                </p>
              )}
            </div>
          </div>

          {showFilters && (
            <>
              <Separator className="my-2" />
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <Label className="text-sm font-semibold">
                    {t("calendar.filters")}
                  </Label>
                </div>
                {/* TODO: Agregar filtros adicionales (status, recursos, etc.) */}
              </div>
            </>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
