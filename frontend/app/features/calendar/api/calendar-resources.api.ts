/**
 * Calendar Resources API functions
 * Provides API integration for calendar resources
 */

import apiClient from "~/lib/api/client";
import type {
  StandardResponse,
  StandardListResponse,
} from "~/lib/api/types/common.types";
import type {
  CalendarResource,
  CalendarResourceCreate,
  CalendarResourceUpdate,
  EventResource,
  EventResourceCreate,
  ResourceListParams,
  CalendarEvent,
} from "~/features/calendar/types/calendar.types";

/**
 * List resources with pagination and filters
 * GET /api/v1/calendar/resources
 *
 * Requires: calendar.view permission
 */
export async function getResources(
  params?: ResourceListParams
): Promise<StandardListResponse<CalendarResource>> {
  const response = await apiClient.get<StandardListResponse<CalendarResource>>(
    "/calendar/resources",
    {
      params: {
        calendar_id: params?.calendar_id,
        resource_type: params?.resource_type,
        is_active: params?.is_active,
        page: params?.page || 1,
        page_size: params?.page_size || 20,
      },
    }
  );
  return response.data;
}

/**
 * Get resource by ID
 * GET /api/v1/calendar/resources/{id}
 *
 * Requires: calendar.view permission
 */
export async function getResource(
  id: string
): Promise<StandardResponse<CalendarResource>> {
  const response = await apiClient.get<StandardResponse<CalendarResource>>(
    `/calendar/resources/${id}`
  );
  return response.data;
}

/**
 * Create new resource
 * POST /api/v1/calendar/resources
 *
 * Requires: calendar.manage permission
 */
export async function createResource(
  payload: CalendarResourceCreate
): Promise<StandardResponse<CalendarResource>> {
  const response = await apiClient.post<StandardResponse<CalendarResource>>(
    "/calendar/resources",
    payload
  );
  return response.data;
}

/**
 * Update existing resource
 * PATCH /api/v1/calendar/resources/{id}
 *
 * Requires: calendar.manage permission
 */
export async function updateResource(
  id: string,
  payload: CalendarResourceUpdate
): Promise<StandardResponse<CalendarResource>> {
  const response = await apiClient.patch<StandardResponse<CalendarResource>>(
    `/calendar/resources/${id}`,
    payload
  );
  return response.data;
}

/**
 * Delete resource
 * DELETE /api/v1/calendar/resources/{id}
 *
 * Requires: calendar.manage permission
 */
export async function deleteResource(id: string): Promise<void> {
  await apiClient.delete(`/calendar/resources/${id}`);
}

/**
 * Get resources assigned to an event
 * GET /api/v1/calendar/events/{eventId}/resources
 *
 * Requires: calendar.events.view permission
 */
export async function getEventResources(
  eventId: string
): Promise<StandardListResponse<EventResource>> {
  const response = await apiClient.get<StandardListResponse<EventResource>>(
    `/calendar/events/${eventId}/resources`
  );
  return response.data;
}

/**
 * Assign resource to event
 * POST /api/v1/calendar/events/{eventId}/resources
 *
 * Requires: calendar.events.manage permission
 */
export async function assignResourceToEvent(
  eventId: string,
  payload: EventResourceCreate
): Promise<StandardResponse<EventResource>> {
  const response = await apiClient.post<StandardResponse<EventResource>>(
    `/calendar/events/${eventId}/resources`,
    payload
  );
  return response.data;
}

/**
 * Remove resource from event
 * DELETE /api/v1/calendar/events/{eventId}/resources/{resourceId}
 *
 * Requires: calendar.events.manage permission
 */
export async function removeResourceFromEvent(
  eventId: string,
  resourceId: string
): Promise<void> {
  await apiClient.delete(`/calendar/events/${eventId}/resources/${resourceId}`);
}

/**
 * Move event to new start time
 * POST /api/v1/calendar/events/{id}/move
 *
 * Requires: calendar.events.manage permission
 */
export async function moveEvent(
  id: string,
  startTime: string,
  preserveDuration: boolean = true,
  scope: string = "single"
): Promise<StandardResponse<CalendarEvent>> {
  const response = await apiClient.post<StandardResponse<CalendarEvent>>(
    `/calendar/events/${id}/move`,
    null,
    {
      params: {
        start_time: startTime,
        preserve_duration: preserveDuration,
        scope,
      },
    }
  );
  return response.data;
}

/**
 * Resize event by changing end time
 * POST /api/v1/calendar/events/{id}/resize
 *
 * Requires: calendar.events.manage permission
 */
export async function resizeEvent(
  id: string,
  endTime: string,
  scope: string = "single"
): Promise<StandardResponse<CalendarEvent>> {
  const response = await apiClient.post<StandardResponse<CalendarEvent>>(
    `/calendar/events/${id}/resize`,
    null,
    {
      params: {
        end_time: endTime,
        scope,
      },
    }
  );
  return response.data;
}

/**
 * Check resource availability (mock implementation)
 * This would typically be a backend endpoint
 */
export async function checkResourceAvailability(
  _resourceId: string,
  _startTime: string,
  _endTime: string,
  _excludeEventId?: string
): Promise<{ available: boolean }> {
  // TODO: Implement backend endpoint
  // For now, return mock data
  return { available: true };
}

// Export all resource functions
export const calendarResourcesApi = {
  getResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  getEventResources,
  assignResourceToEvent,
  removeResourceFromEvent,
  moveEvent,
  resizeEvent,
  checkResourceAvailability,
};
