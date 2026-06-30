/**
 * NotifyActionConfig
 * Config form for notify action nodes — channel multi-select, message textarea,
 * and optional recipient override.
 */

import { useState } from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface NotifyActionData {
  label?: string;
  node_type?: string;
  type?: string;
  params?: {
    channels?: string[];
    message?: string;
    recipient_id?: string;
    notification_event_type?: string;
  };
}

const CHANNELS = ["in-app", "email", "whatsapp"] as const;

interface NotifyActionConfigProps {
  data: NotifyActionData;
  onChange: (patch: Partial<NotifyActionData>) => void;
}

export function NotifyActionConfig({ data, onChange }: NotifyActionConfigProps) {
  const { t } = useTranslation();
  const params = data.params ?? {};
  const channels: string[] = params.channels ?? ["in-app"];
  const [recipientMode, setRecipientMode] = useState<"owner" | "custom">(
    params.recipient_id ? "custom" : "owner"
  );

  const setParams = (patch: Partial<typeof params>) => {
    onChange({ params: { ...params, ...patch } });
  };

  const toggleChannel = (ch: string) => {
    const next = channels.includes(ch)
      ? channels.filter((c) => c !== ch)
      : [...channels, ch];
    setParams({ channels: next.length > 0 ? next : ["in-app"] });
  };

  return (
    <div className="space-y-3">
      {/* Channels */}
      <div className="space-y-1.5">
        <Label>{t("automation.nodeConfig.notify.channelsLabel")}</Label>
        <div className="flex flex-col gap-1.5">
          {CHANNELS.map((ch) => (
            <label
              key={ch}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <Checkbox
                checked={channels.includes(ch)}
                onCheckedChange={() => toggleChannel(ch)}
              />
              <span className="capitalize">{ch}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <Label>{t("automation.nodeConfig.notify.messageLabel")}</Label>
        <Textarea
          rows={3}
          value={params.message ?? ""}
          onChange={(e) => setParams({ message: e.target.value })}
          placeholder={t("automation.nodeConfig.notify.messagePlaceholder")}
        />
        <p className="text-xs text-muted-foreground">
          {t("automation.nodeConfig.notify.interpolationHint")}
        </p>
      </div>

      {/* Recipient */}
      <div className="space-y-1.5">
        <Label>{t("automation.nodeConfig.notify.recipientLabel")}</Label>
        <Select
          value={recipientMode}
          onValueChange={(v) => {
            const mode = v as "owner" | "custom";
            setRecipientMode(mode);
            if (mode === "owner") setParams({ recipient_id: undefined });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owner">
              {t("automation.nodeConfig.notify.recipientDefault")}
            </SelectItem>
            <SelectItem value="custom">
              {t("automation.nodeConfig.notify.recipientCustom")}
            </SelectItem>
          </SelectContent>
        </Select>
        {recipientMode === "custom" && (
          <Input
            value={params.recipient_id ?? ""}
            onChange={(e) => setParams({ recipient_id: e.target.value })}
            placeholder={t(
              "automation.nodeConfig.notify.recipientIdPlaceholder"
            )}
          />
        )}
      </div>
    </div>
  );
}
