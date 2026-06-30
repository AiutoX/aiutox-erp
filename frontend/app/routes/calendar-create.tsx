/**
 * Create Event Page
 * Página para crear un nuevo evento en el calendario
 */

import { useNavigate } from "react-router";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { EmptyState } from "~/components/common/EmptyState";
import { Button } from "~/components/ui/button";
import { EventForm } from "~/features/calendar/components/EventForm";
import {
  useCalendars,
  useCreateEvent,
  useCreateReminder,
} from "~/features/calendar/hooks/useCalendar";
import type {
  EventCreate,
  EventReminderCreate,
} from "~/features/calendar/types/calendar.types";

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: calendarsData, isLoading: calendarsLoading } = useCalendars();
  const createEventMutation = useCreateEvent();
  const createReminderMutation = useCreateReminder();

  const calendars = calendarsData?.data || [];
  const hasCalendars = calendars.length > 0;

  const handleSubmit = async (payload: {
    event: EventCreate;
    reminders: EventReminderCreate[];
  }) => {
    const { event, reminders } = payload;

    try {
      const response = await createEventMutation.mutateAsync(event);
      const createdEvent = response.data;

      if (createdEvent && reminders.length > 0) {
        await Promise.all(
          reminders.map((reminder) =>
            createReminderMutation.mutateAsync({
              eventId: createdEvent.id,
              payload: reminder,
            })
          )
        );
      }

      void navigate("/calendar");
    } catch (error) {
      console.error("Error creating event:", error);
    }
  };

  const handleCancel = () => {
    void navigate("/calendar");
  };

  return (
    <PageLayout
      title={t("calendar.events.create")}
      description={t("calendar.description")}
      loading={calendarsLoading || createEventMutation.isPending}
    >
      <div className="max-w-2xl mx-auto">
        {!hasCalendars && !calendarsLoading ? (
          <EmptyState
            title={t("calendar.emptyTitle")}
            description={t("calendar.emptyDescription")}
            action={
              <Button onClick={() => void navigate("/tasks/settings")}>
                {t("calendar.emptyAction")}
              </Button>
            }
          />
        ) : (
          <EventForm
            calendars={calendars}
            onSubmit={(payload) => void handleSubmit(payload)}
            onCancel={handleCancel}
            loading={createEventMutation.isPending}
          />
        )}
      </div>
    </PageLayout>
  );
}
