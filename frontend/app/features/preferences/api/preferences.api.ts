/**
 * Preferences API — notification channel preferences
 * Backend: GET/PUT /api/v1/preferences/notifications
 */

import apiClient from "~/lib/api/client";
import type { StandardResponse } from "~/lib/api/types/common.types";
import type {
  NotificationPreference,
  NotificationPreferencesMap,
  NotificationPreferencesRequest,
} from "../types/preferences.types";

const BASE = "/api/v1/preferences";

/**
 * Get notification preferences for the current user.
 * Returns a map of event_type → NotificationPreference.
 */
export async function getNotificationPreferences(): Promise<
  StandardResponse<NotificationPreferencesMap>
> {
  const response = await apiClient.get<
    StandardResponse<NotificationPreferencesMap>
  >(`${BASE}/notifications`);
  return response.data;
}

/**
 * Update notification preferences for the current user.
 * @param preferences - Map of event_type → NotificationPreference
 */
export async function updateNotificationPreferences(
  preferences: NotificationPreferencesMap
): Promise<StandardResponse<NotificationPreferencesMap>> {
  const body: NotificationPreferencesRequest = { preferences };
  const response = await apiClient.put<
    StandardResponse<NotificationPreferencesMap>
  >(`${BASE}/notifications`, body);
  return response.data;
}

/**
 * Update a single notification preference entry.
 * Convenience wrapper over updateNotificationPreferences.
 */
export async function updateSingleNotificationPreference(
  eventType: string,
  preference: Partial<NotificationPreference>
): Promise<StandardResponse<NotificationPreferencesMap>> {
  const current = await getNotificationPreferences();
  const existing = current.data?.[eventType] ?? {
    enabled: true,
    channels: ["in-app"],
    frequency: "immediate",
  };
  return updateNotificationPreferences({
    [eventType]: { ...existing, ...preference },
  });
}
