/**
 * Calendar API functions
 * Provides API integration for calendar module
 * Following frontend-api.md rules
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  Calendar,
  CalendarCreate,
  CalendarUpdate,
  CalendarEvent,
  EventCreate,
  EventUpdate,
  EventReminder,
  EventReminderCreate,
  CalendarListParams,
  EventListParams,
} from "~/features/calendar/types/calendar.types";

// Calendars API functions

/**
 * List calendars with pagination and filters
 * GET /api/v1/calendar/calendars
 *
 * Requires: calendar.view permission
 */
export async function listCalendars(
  params?: CalendarListParams
): Promise<StandardListResponse<Calendar>> {
  const response = await apiClient.get<StandardListResponse<Calendar>>(
    "/calendar/calendars",
    {
      params: {
        page: params?.page || 1,
        page_size: params?.page_size || 20,
        calendar_type: params?.calendar_type,
      },
    }
  );
  return response.data;
}

/**
 * Get calendar by ID
 * GET /api/v1/calendar/calendars/{id}
 *
 * Requires: calendar.view permission
 */
export async function getCalendar(
  id: string
): Promise<StandardResponse<Calendar>> {
  const response = await apiClient.get<StandardResponse<Calendar>>(
    `/calendar/calendars/${id}`
  );
  return response.data;
}

/**
 * Create new calendar
 * POST /api/v1/calendar/calendars
 *
 * Requires: calendar.manage permission
 */
export async function createCalendar(
  payload: CalendarCreate
): Promise<StandardResponse<Calendar>> {
  const response = await apiClient.post<StandardResponse<Calendar>>(
    "/calendar/calendars",
    payload
  );
  return response.data;
}

/**
 * Update existing calendar
 * PUT /api/v1/calendar/calendars/{id}
 *
 * Requires: calendar.manage permission
 */
export async function updateCalendar(
  id: string,
  payload: CalendarUpdate
): Promise<StandardResponse<Calendar>> {
  const response = await apiClient.put<StandardResponse<Calendar>>(
    `/calendar/calendars/${id}`,
    payload
  );
  return response.data;
}

/**
 * Delete calendar
 * DELETE /api/v1/calendar/calendars/{id}
 *
 * Requires: calendar.manage permission
 */
export async function deleteCalendar(
  id: string
): Promise<StandardResponse<null>> {
  const response = await apiClient.delete<StandardResponse<null>>(
    `/calendar/calendars/${id}`
  );
  return response.data;
}

// Events API functions

/**
 * List events with pagination and filters
 * GET /api/v1/calendar/events
 *
 * Requires: calendar.view permission
 */
export async function listEvents(
  params?: EventListParams
): Promise<StandardListResponse<CalendarEvent>> {
  const response = await apiClient.get<StandardListResponse<CalendarEvent>>(
    "/calendar/events",
    {
      params: {
        page: params?.page || 1,
        page_size: params?.page_size || 20,
        calendar_id: params?.calendar_id,
        start_date: params?.start_date,
        end_date: params?.end_date,
        status: params?.status,
      },
    }
  );
  return response.data;
}

/**
 * Get event by ID
 * GET /api/v1/calendar/events/{id}
 *
 * Requires: calendar.view permission
 */
export async function getEvent(
  id: string
): Promise<StandardResponse<CalendarEvent>> {
  const response = await apiClient.get<StandardResponse<CalendarEvent>>(
    `/calendar/events/${id}`
  );
  return response.data;
}

/**
 * Create new event
 * POST /api/v1/calendar/events
 *
 * Requires: calendar.manage permission
 */
export async function createEvent(
  payload: EventCreate
): Promise<StandardResponse<CalendarEvent>> {
  const response = await apiClient.post<StandardResponse<CalendarEvent>>(
    "/calendar/events",
    payload
  );
  return response.data;
}

/**
 * Update existing event
 * PUT /api/v1/calendar/events/{id}
 *
 * Requires: calendar.manage permission
 */
export async function updateEvent(
  id: string,
  payload: EventUpdate
): Promise<StandardResponse<CalendarEvent>> {
  const response = await apiClient.put<StandardResponse<CalendarEvent>>(
    `/calendar/events/${id}`,
    payload
  );
  return response.data;
}

/**
 * Delete event
 * DELETE /api/v1/calendar/events/{id}
 *
 * Requires: calendar.manage permission
 */
export async function deleteEvent(id: string): Promise<StandardResponse<null>> {
  const response = await apiClient.delete<StandardResponse<null>>(
    `/calendar/events/${id}`
  );
  return response.data;
}

// Event Reminders API functions

/**
 * Create reminder for event
 * POST /api/v1/calendar/events/{id}/reminders
 *
 * Requires: calendar.manage permission
 */
export async function createReminder(
  eventId: string,
  payload: EventReminderCreate
): Promise<StandardResponse<null>> {
  const response = await apiClient.post<StandardResponse<null>>(
    `/calendar/events/${eventId}/reminders`,
    payload
  );
  return response.data;
}

/**
 * List reminders for event
 * GET /api/v1/calendar/events/{id}/reminders
 *
 * Requires: calendar.view permission
 */
export async function listEventReminders(
  eventId: string,
  params?: { page?: number; page_size?: number }
): Promise<StandardListResponse<EventReminder>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.page_size)
    searchParams.set("page_size", params.page_size.toString());

  const response = await apiClient.get<StandardListResponse<EventReminder>>(
    `/calendar/events/${eventId}/reminders?${searchParams.toString()}`
  );
  return response.data;
}

/**
 * Delete reminder from event
 * DELETE /api/v1/calendar/reminders/{reminder_id}
 *
 * Requires: calendar.manage permission
 */
export async function deleteReminder(
  reminderId: string
): Promise<StandardResponse<null>> {
  const response = await apiClient.delete<StandardResponse<null>>(
    `/calendar/reminders/${reminderId}`
  );
  return response.data;
}

// Event Attendees API functions

/**
 * Update attendee status
 * PUT /api/v1/calendar/events/{id}/attendees/me?status={status}
 *
 * Requires: calendar.view permission
 */
export async function updateAttendeeStatus(
  eventId: string,
  status: "accepted" | "declined" | "tentative"
): Promise<StandardResponse<null>> {
  const response = await apiClient.put<StandardResponse<null>>(
    `/calendar/events/${eventId}/attendees/me`,
    null,
    {
      params: { status },
    }
  );
  return response.data;
}
