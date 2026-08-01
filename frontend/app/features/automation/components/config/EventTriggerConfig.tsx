/**
 * EventTriggerConfig
 * Config form for event_trigger nodes — lets the user pick an event type
 * from the catalog (permission-filtered) grouped by module.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { getTriggerTypes } from "../../api/automation.api";
import type { NodeCatalogItem } from "../../types/automation.types";

export interface EventTriggerData {
  label?: string;
  trigger_type?: string;
  event_type?: string;
}

interface EventTriggerConfigProps {
  data: EventTriggerData;
  onChange: (patch: Partial<EventTriggerData>) => void;
}

export function EventTriggerConfig({ data, onChange }: EventTriggerConfigProps) {
  const { t } = useTranslation();

  const { data: catalogData } = useQuery({
    queryKey: ["automation", "meta", "triggers"],
    queryFn: getTriggerTypes,
    staleTime: 5 * 60 * 1000,
  });

  const eventItems: NodeCatalogItem[] = useMemo(
    () =>
      (catalogData?.data ?? []).filter(
        (i) => i.node_type === "event_trigger"
      ),
    [catalogData]
  );

  // Group by module (first segment of event_type label)
  const grouped = useMemo(() => {
    const map = new Map<string, NodeCatalogItem[]>();
    for (const item of eventItems) {
      const module = item.label.split(".")[0] ?? "other";
      const existing = map.get(module) ?? [];
      map.set(module, [...existing, item]);
    }
    return map;
  }, [eventItems]);

  const selected = data.event_type ?? "";

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t("automation.nodeConfig.event_trigger.eventTypeLabel")}</Label>
        <Select
          value={selected}
          onValueChange={(v) => onChange({ event_type: v })}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={t(
                "automation.nodeConfig.event_trigger.eventTypePlaceholder"
              )}
            />
          </SelectTrigger>
          <SelectContent>
            {grouped.size === 0 && (
              <SelectItem value="__none__" disabled>
                {t(
                  "automation.nodeConfig.event_trigger.noEventsAvailable"
                )}
              </SelectItem>
            )}
            {Array.from(grouped.entries()).map(([module, items]) => (
              <SelectGroup key={module}>
                <SelectLabel className="capitalize">{module}</SelectLabel>
                {items.map((item) => (
                  <SelectItem
                    key={item.label}
                    value={item.label}
                    disabled={!item.available}
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <p className="text-xs text-muted-foreground">
          {eventItems.find((i) => i.label === selected)?.description ?? ""}
        </p>
      )}
    </div>
  );
}
