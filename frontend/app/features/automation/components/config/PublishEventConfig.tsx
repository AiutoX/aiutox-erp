/**
 * PublishEventConfig
 * Config form for publish_event action nodes — custom event type + entity type + payload.
 */

import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface PublishEventData {
  label?: string;
  node_type?: string;
  params?: {
    event_type?: string;
    entity_type?: string;
    payload?: string;
  };
}

interface PublishEventConfigProps {
  data: PublishEventData;
  onChange: (patch: Partial<PublishEventData>) => void;
}

export function PublishEventConfig({ data, onChange }: PublishEventConfigProps) {
  const { t } = useTranslation();
  const params = data.params ?? {};

  const setParams = (patch: Partial<typeof params>) => {
    onChange({ params: { ...params, ...patch } });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t("automation.nodeConfig.publish_event.eventTypeLabel")}</Label>
        <Input
          value={params.event_type ?? ""}
          onChange={(e) => setParams({ event_type: e.target.value })}
          placeholder={t("automation.nodeConfig.publish_event.eventTypePlaceholder")}
        />
        <p className="text-xs text-muted-foreground">
          {t("automation.nodeConfig.publish_event.eventTypeHint")}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>{t("automation.nodeConfig.publish_event.entityTypeLabel")}</Label>
        <Input
          value={params.entity_type ?? ""}
          onChange={(e) => setParams({ entity_type: e.target.value })}
          placeholder={t("automation.nodeConfig.publish_event.entityTypePlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t("automation.nodeConfig.publish_event.payloadLabel")}</Label>
        <Textarea
          rows={3}
          value={params.payload ?? ""}
          onChange={(e) => setParams({ payload: e.target.value })}
          placeholder={t("automation.nodeConfig.publish_event.payloadPlaceholder")}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          {t("automation.nodeConfig.publish_event.payloadHint")}
        </p>
      </div>
    </div>
  );
}
