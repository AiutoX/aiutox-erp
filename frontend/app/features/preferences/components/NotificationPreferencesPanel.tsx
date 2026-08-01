/**
 * NotificationPreferencesPanel
 * Renders checkboxes per channel per notification event type,
 * grouped by module (billing, lease, maintenance).
 *
 * Uses GET/PUT /api/v1/preferences/notifications
 */

import { useState, useEffect, useMemo } from "react";
import { Switch } from "~/components/ui/switch";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useChannelIdentities } from "~/features/integrations/hooks/useChannelIdentities";
import {
  useNotificationEventTypes,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "../hooks/usePreferences";
import { ChannelStatusBadge } from "./ChannelStatusBadge";
import { translations as eventTypeTranslationsEs } from "../i18n/es";
import { translations as eventTypeTranslationsEn } from "../i18n/en";
import {
  NOTIFICATION_EVENT_TYPES,
  DEFAULT_CHANNELS_BY_EVENT,
  type NotificationChannel,
  type NotificationEventType,
  type NotificationPreference,
  type NotificationPreferencesMap,
} from "../types/preferences.types";

/**
 * Event type identifiers (e.g. "billing.cobro_generado") already contain a
 * literal dot, so they can't be looked up through t()'s dotted-path nested
 * traversal (`t(\`preferences.eventTypes.${eventType}\`)` would look for a
 * NESTED eventTypes.billing.cobro_generado structure, not the flat
 * eventTypes["billing.cobro_generado"] key that actually exists). Index the
 * flat map directly instead.
 */
function useEventTypeLabel() {
  const { language } = useTranslation();
  const eventTypes =
    language === "en"
      ? eventTypeTranslationsEn.preferences.eventTypes
      : eventTypeTranslationsEs.preferences.eventTypes;

  return (eventType: string): string =>
    (eventTypes as Record<string, string>)[eventType] ?? eventType;
}

const AVAILABLE_CHANNELS: NotificationChannel[] = [
  "whatsapp",
  "telegram",
  "email",
  "in-app",
];

/** Legacy event types with no publisher yet — see
 * .claude/current-dev-issues/Pendiente-notification-event-publishers/.
 * Still rendered so existing user preferences remain editable, alongside
 * dynamically-discovered groups from useNotificationEventTypes(). */
const LEGACY_EVENT_GROUPS: Record<
  string,
  (typeof NOTIFICATION_EVENT_TYPES)[number][]
> = {
  billing: [
    "billing.cobro_generado",
    "billing.pago_recibido",
    "billing.aviso_mora",
    "billing.intereses_mora",
  ],
  lease: ["lease.contrato_vence", "lease.notif_reajuste"],
  maintenance: ["maintenance.ot_asignada", "maintenance.presupuesto_aprobado"],
};

/** Whether each channel provider is configured/linked for the current user */
function useChannelConnected(): Record<NotificationChannel, boolean> {
  // For now derive from env/config: if EVOLUTION_API_URL env var would be set,
  // we'd know. Since we can't read env on frontend, we check via a lightweight
  // config endpoint. As a safe default, assume connected only if explicitly confirmed.
  // In a real integration this could hit /api/v1/config/notifications/channels.
  const { data: identities } = useChannelIdentities();
  const hasTelegram = (identities ?? []).some(
    (identity) => identity.channel === "telegram" && identity.is_active
  );

  return {
    whatsapp: false, // conservative — update when EvolutionAPI is connected
    telegram: hasTelegram,
    email: true,
    "in-app": true,
    sms: false,
  };
}

export function NotificationPreferencesPanel() {
  const { t } = useTranslation();
  const getEventTypeLabel = useEventTypeLabel();
  const { data: savedPrefs, isLoading } = useNotificationPreferences();
  const { data: eventTypes = [] } = useNotificationEventTypes();
  const updateMutation = useUpdateNotificationPreferences();
  const channelConnected = useChannelConnected();

  const groupedEvents = useMemo(() => {
    const groups: Record<string, NotificationEventType[]> = {};
    for (const event of eventTypes) {
      (groups[event.module] ??= []).push(event);
    }
    return groups;
  }, [eventTypes]);

  // Local editable state — initialized from server data
  const [local, setLocal] = useState<NotificationPreferencesMap>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (savedPrefs) {
      const init: NotificationPreferencesMap = {};
      for (const eventType of NOTIFICATION_EVENT_TYPES) {
        init[eventType] = savedPrefs[eventType] ?? {
          enabled: true,
          channels: DEFAULT_CHANNELS_BY_EVENT[eventType],
          frequency: "immediate",
        };
      }
      for (const event of eventTypes) {
        init[event.event_type] = savedPrefs[event.event_type] ?? {
          enabled: event.default_enabled,
          channels: event.default_channels,
          frequency: "immediate",
        };
      }
      setLocal(init);
      setDirty(false);
    }
  }, [savedPrefs, eventTypes]);

  const getPref = (eventType: string): NotificationPreference =>
    local[eventType] ?? {
      enabled: true,
      channels:
        DEFAULT_CHANNELS_BY_EVENT[
          eventType as keyof typeof DEFAULT_CHANNELS_BY_EVENT
        ] ?? [],
      frequency: "immediate",
    };

  const setEnabled = (eventType: string, enabled: boolean) => {
    setLocal((prev) => ({
      ...prev,
      [eventType]: { ...getPref(eventType), enabled },
    }));
    setDirty(true);
  };

  const toggleChannel = (
    eventType: string,
    channel: NotificationChannel,
    checked: boolean
  ) => {
    const pref = getPref(eventType);
    const channels = checked
      ? [...new Set([...pref.channels, channel])]
      : pref.channels.filter((c) => c !== channel);
    setLocal((prev) => ({
      ...prev,
      [eventType]: { ...pref, channels },
    }));
    setDirty(true);
  };

  const handleSave = () => {
    updateMutation.mutate(local, {
      onSuccess: () => setDirty(false),
    });
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold">{t("preferences.title")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("preferences.description")}
        </p>
      </div>

      {/* Channel status row */}
      <div className="flex flex-wrap gap-2">
        {AVAILABLE_CHANNELS.map((ch) => (
          <ChannelStatusBadge
            key={ch}
            channel={ch}
            connected={channelConnected[ch]}
          />
        ))}
      </div>

      <Separator />

      {/* Legacy groups (billing/lease/maintenance — no publisher yet) */}
      {Object.entries(LEGACY_EVENT_GROUPS).map(([group, eventTypes]) => (
        <div key={group} className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t(`preferences.groups.${group}`)}
          </h4>

          <div className="rounded-md border divide-y">
            {eventTypes.map((eventType) => {
              const pref = getPref(eventType);
              return (
                <div
                  key={eventType}
                  className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Event name + toggle */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Switch
                      checked={pref.enabled}
                      onCheckedChange={(v) => setEnabled(eventType, v)}
                      aria-label={getEventTypeLabel(eventType)}
                    />
                    <Label className="text-sm cursor-pointer">
                      {getEventTypeLabel(eventType)}
                    </Label>
                  </div>

                  {/* Channel checkboxes */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {AVAILABLE_CHANNELS.map((channel) => {
                      const isChecked = pref.channels.includes(channel);
                      const isDisabled =
                        !pref.enabled || !channelConnected[channel];
                      return (
                        <label
                          key={channel}
                          className={`flex items-center gap-1.5 text-xs cursor-pointer select-none ${
                            isDisabled ? "opacity-40 cursor-not-allowed" : ""
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            disabled={isDisabled}
                            onCheckedChange={(v) =>
                              toggleChannel(eventType, channel, !!v)
                            }
                          />
                          {t(`preferences.channels.${channel}`)}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Dynamic groups — self-discovered from enabled modules via the
          backend registry (GET /notifications/event-types) */}
      {Object.entries(groupedEvents).map(([group, events]) => (
        <div key={group} className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t(`preferences.groups.${group}`)}
          </h4>

          <div className="rounded-md border divide-y">
            {events.map((event) => {
              const pref = getPref(event.event_type);
              const label = t(event.label_key);
              return (
                <div
                  key={event.event_type}
                  className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Event name + toggle */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Switch
                      checked={pref.enabled}
                      onCheckedChange={(v) => setEnabled(event.event_type, v)}
                      aria-label={label}
                    />
                    <Label className="text-sm cursor-pointer">{label}</Label>
                  </div>

                  {/* Channel checkboxes */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {AVAILABLE_CHANNELS.map((channel) => {
                      const isChecked = pref.channels.includes(channel);
                      const isDisabled =
                        !pref.enabled || !channelConnected[channel];
                      return (
                        <label
                          key={channel}
                          className={`flex items-center gap-1.5 text-xs cursor-pointer select-none ${
                            isDisabled ? "opacity-40 cursor-not-allowed" : ""
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            disabled={isDisabled}
                            onCheckedChange={(v) =>
                              toggleChannel(event.event_type, channel, !!v)
                            }
                          />
                          {t(`preferences.channels.${channel}`)}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Separator />

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!dirty || updateMutation.isPending}
        >
          {updateMutation.isPending
            ? t("preferences.saving")
            : t("preferences.save")}
        </Button>
      </div>

      {/* Feedback messages */}
      {updateMutation.isSuccess && !dirty && (
        <p className="text-sm text-green-600 text-right">
          {t("preferences.saved")}
        </p>
      )}
      {updateMutation.isError && (
        <p className="text-sm text-destructive text-right">
          {t("preferences.saveError")}
        </p>
      )}
    </div>
  );
}
