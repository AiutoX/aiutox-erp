/**
 * Calendar page
 * Main page for calendar management with React Big Calendar
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { CalendarContainer } from "~/features/calendar/components/CalendarContainer";

export default function CalendarPage() {
  const { t } = useTranslation();

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
        className="h-[calc(100vh-220px)] min-h-[500px]"
      />
    </PageLayout>
  );
}
