/**
 * Preferences types
 * Aligned with backend schemas/preference.py
 */

export type NotificationChannel = "email" | "whatsapp" | "in-app" | "sms";

export interface NotificationPreference {
  enabled: boolean;
  channels: NotificationChannel[];
  frequency: "immediate" | "daily" | "weekly";
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
}

/** Map of event_type → NotificationPreference */
export type NotificationPreferencesMap = Record<string, NotificationPreference>;

/** PUT /api/v1/preferences/notifications body */
export interface NotificationPreferencesRequest {
  preferences: NotificationPreferencesMap;
}

/** Channel configuration status (is the provider configured in backend?) */
export interface ChannelStatus {
  channel: NotificationChannel;
  connected: boolean;
  label: string;
}

/** Known notification event types in Sprint 5 */
export const NOTIFICATION_EVENT_TYPES = [
  "billing.cobro_generado",
  "billing.pago_recibido",
  "billing.aviso_mora",
  "billing.intereses_mora",
  "lease.contrato_vence",
  "lease.notif_reajuste",
  "maintenance.ot_asignada",
  "maintenance.presupuesto_aprobado",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

/** Default channels per event type (mirrors templates seeder) */
export const DEFAULT_CHANNELS_BY_EVENT: Record<
  NotificationEventType,
  NotificationChannel[]
> = {
  "billing.cobro_generado": ["whatsapp", "email"],
  "billing.pago_recibido": ["whatsapp", "email"],
  "billing.aviso_mora": ["whatsapp"],
  "billing.intereses_mora": ["whatsapp", "email"],
  "lease.contrato_vence": ["email"],
  "lease.notif_reajuste": ["email", "whatsapp"],
  "maintenance.ot_asignada": ["whatsapp"],
  "maintenance.presupuesto_aprobado": ["whatsapp", "email"],
};
