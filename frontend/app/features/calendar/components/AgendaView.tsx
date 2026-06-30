/**
 * AgendaView component
 * List view of events grouped by date
 */

import { useMemo } from "react";
import { format, isSameDay, startOfDay } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import type { CalendarEvent } from "../types/calendar.types";

interface AgendaViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  getEventColor?: (event: CalendarEvent) => string;
  daysToShow?: number;
}

const DEFAULT_EVENT_COLOR = "#023E87";

export function AgendaView({
  events,
  currentDate,
  onEventClick,
  getEventColor,
  daysToShow = 30,
}: AgendaViewProps) {
  const { t, language } = useTranslation();
  const dateLocale = language === "en" ? enUS : es;

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, CalendarEvent[]>();
    const today = startOfDay(new Date());
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + daysToShow);

    events.forEach((event) => {
      const eventDate = startOfDay(new Date(event.start_time));

      // Only show events within the date range
      if (eventDate >= currentDate && eventDate <= endDate) {
        const dateKey = format(eventDate, "yyyy-MM-dd");
        if (!groups.has(dateKey)) {
          groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(event);
      }
    });

    // Sort events within each day by start time
    groups.forEach((dayEvents) => {
      dayEvents.sort((a, b) => {
        const aTime = new Date(a.start_time).getTime();
        const bTime = new Date(b.start_time).getTime();
        return aTime - bTime;
      });
    });

    // Convert to sorted array
    return Array.from(groups.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([dateKey, dayEvents]) => ({
        date: new Date(dateKey),
        dateKey,
        events: dayEvents,
        isToday: isSameDay(new Date(dateKey), today),
      }));
  }, [events, currentDate, daysToShow]);

  const resolveEventColor = (event: CalendarEvent) => {
    return getEventColor?.(event) ?? DEFAULT_EVENT_COLOR;
  };

  if (groupedEvents.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex h-64 items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">
              {t("calendar.agenda.noEvents")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groupedEvents.map(({ date, dateKey, events: dayEvents, isToday }) => (
        <Card
          key={dateKey}
          className={cn(
            "border-border/60 transition-colors",
            isToday && "border-primary/40 bg-primary/5"
          )}
        >
          <CardContent className="p-4">
            {/* Date header */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">
                  {format(date, "d", { locale: dateLocale })}
                </span>
                <span className="text-xs text-muted-foreground uppercase">
                  {format(date, "MMM", { locale: dateLocale })}
                </span>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {format(date, "EEEE", { locale: dateLocale })}
                  </h3>
                  {isToday && (
                    <Badge variant="default" className="text-xs">
                      {t("calendar.today")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(date, "PPP", { locale: dateLocale })}
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                {dayEvents.length}{" "}
                {dayEvents.length === 1
                  ? t("calendar.agenda.event")
                  : t("calendar.agenda.events")}
              </Badge>
            </div>

            {/* Events list */}
            <div className="space-y-2">
              {dayEvents.map((event) => {
                const eventColor = resolveEventColor(event);

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onEventClick?.(event)}
                    className="group w-full rounded-lg border border-border/60 bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      {/* Color indicator */}
                      <div
                        className="mt-1 h-10 w-1 rounded-full"
                        style={{ backgroundColor: eventColor }}
                      />

                      {/* Event details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {event.title}
                          </h4>
                          {event.status && (
                            <Badge
                              variant="outline"
                              className="shrink-0 text-xs"
                              style={{
                                backgroundColor: `${eventColor}20`,
                                borderColor: eventColor,
                                color: eventColor,
                              }}
                            >
                              {event.status}
                            </Badge>
                          )}
                        </div>

                        {event.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {event.description}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {/* Time */}
                          {!event.all_day && (
                            <div className="flex items-center gap-1">
                              <span>🕐</span>
                              <span>
                                {format(new Date(event.start_time), "HH:mm", {
                                  locale: dateLocale,
                                })}{" "}
                                -{" "}
                                {format(new Date(event.end_time), "HH:mm", {
                                  locale: dateLocale,
                                })}
                              </span>
                            </div>
                          )}

                          {event.all_day && (
                            <div className="flex items-center gap-1">
                              <span>📅</span>
                              <span>{t("calendar.events.allDay")}</span>
                            </div>
                          )}

                          {/* Location */}
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <span>📍</span>
                              <span className="truncate max-w-[200px]">
                                {event.location}
                              </span>
                            </div>
                          )}

                          {/* Recurrence indicator */}
                          {event.recurrence_type &&
                            event.recurrence_type !== "none" && (
                              <div className="flex items-center gap-1">
                                <span>🔄</span>
                                <span>
                                  {t("calendar.recurrence.recurring")}
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
