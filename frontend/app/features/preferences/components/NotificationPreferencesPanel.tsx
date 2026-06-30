/**
 * NotificationPreferencesPanel
 * Renders checkboxes per channel per notification event type,
 * grouped by module (billing, lease, maintenance).
 *
 * Uses GET/PUT /api/v1/preferences/notifications
 */

import { useState, useEffect } from "react";
import { Switch } from "~/components/ui/switch";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "../hooks/usePreferences";
import { ChannelStatusBadge } from "./ChannelStatusBadge";
import {
  NOTIFICATION_EVENT_TYPES,
  DEFAULT_CHANNELS_BY_EVENT,
  type NotificationChannel,
  type NotificationPreference,
  type NotificationPreferencesMap,
} from "../types/preferences.types";

const AVAILABLE_CHANNELS: NotificationChannel[] = [
  "whatsapp",
  "email",
  "in-app",
];

const EVENT_GROUPS: Record<
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

/** Whether WhatsApp provider is configured in the backend */
function useChannelConnected(): Record<NotificationChannel, boolean> {
  // For now derive from env/config: if EVOLUTION_API_URL env var would be set,
  // we'd know. Since we can't read env on frontend, we check via a lightweight
  // config endpoint. As a safe default, assume connected only if explicitly confirmed.
  // In a real integration this could hit /api/v1/config/notifications/channels.
  return {
    whatsapp: false, // conservative — update when EvolutionAPI is connected
    email: true,
    "in-app": true,
    sms: false,
  };
}

export function NotificationPreferencesPanel() {
  const { t } = useTranslation();
  const { data: savedPrefs, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();
  const channelConnected = useChannelConnected();

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
      setLocal(init);
      setDirty(false);
    }
  }, [savedPrefs]);

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

      {/* Groups */}
      {Object.entries(EVENT_GROUPS).map(([group, eventTypes]) => (
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
                      aria-label={t(`preferences.eventTypes.${eventType}`)}
                    />
                    <Label className="text-sm cursor-pointer">
                      {t(`preferences.eventTypes.${eventType}`)}
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
