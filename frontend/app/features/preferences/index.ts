/**
 * Preferences feature — public API
 */

export { NotificationPreferencesPanel } from "./components/NotificationPreferencesPanel";
export { ChannelStatusBadge } from "./components/ChannelStatusBadge";
export {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "./hooks/usePreferences";
export * from "./types/preferences.types";
export * from "./api/preferences.api";
