/**
 * Calendar page
 * Main page for calendar management with React Big Calendar
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { CalendarContainer } from "~/features/calendar/components/CalendarContainer";
import { EventEdit } from "~/features/calendar/components/EventEdit";
import type { CalendarEvent } from "~/features/calendar/types/calendar.types";

export default function CalendarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  return (
    <PageLayout
      title={t("calendar.title")}
      description={t("calendar.description")}
    >
      <CalendarContainer
        mode="modal"
        dataSource="calendars"
        showSidebar={true}
        showToolbar={true}
        defaultView="month"
        className="h-[calc(100vh-220px)] min-h-125"
        onEventClick={setSelectedEvent}
        onEventCreate={() => void navigate("/calendar-create")}
      />
      <EventEdit
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      />
    </PageLayout>
  );
}
