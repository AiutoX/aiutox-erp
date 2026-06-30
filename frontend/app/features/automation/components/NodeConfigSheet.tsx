/**
 * NodeConfigSheet
 * Slide-over panel that opens when the user clicks a node on the canvas.
 * Renders the appropriate config form based on node_type / type.
 */

import { useState, useEffect, useCallback } from "react";
import { type Node } from "reactflow";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { EventTriggerConfig } from "./config/EventTriggerConfig";
import { ScheduleTriggerConfig } from "./config/ScheduleTriggerConfig";
import { NotifyActionConfig } from "./config/NotifyActionConfig";
import { CreateTaskConfig } from "./config/CreateTaskConfig";
import { AiActionConfig } from "./config/AiActionConfig";
import { PublishEventConfig } from "./config/PublishEventConfig";
import { UpdateEntityConfig } from "./config/UpdateEntityConfig";
import { WebhookTriggerConfig, type WebhookTriggerData } from "./config/WebhookTriggerConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NodeConfigSheetProps {
  node: Node | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}

// ─── Condition config (inline — simple enough) ───────────────────────────────

function ConditionConfig({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="space-y-1.5">
        <Label>
          {t("automation.nodeConfig.field_condition.fieldLabel")}
        </Label>
        <Input
          value={String(data.field ?? "")}
          onChange={(e) => onChange({ field: e.target.value })}
          placeholder={t(
            "automation.nodeConfig.field_condition.fieldPlaceholder"
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label>
          {t("automation.nodeConfig.field_condition.operatorLabel")}
        </Label>
        <Select
          value={String(data.operator ?? "eq")}
          onValueChange={(v) => onChange({ operator: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(
              [
                ["eq", "= (equals)"],
                ["ne", "≠ (not equals)"],
                ["gt", "> (greater)"],
                ["gte", "≥ (greater or equal)"],
                ["lt", "< (less)"],
                ["lte", "≤ (less or equal)"],
                ["contains", "contains"],
                ["not_contains", "not contains"],
                ["in", "in list"],
                ["nin", "not in list"],
              ] as [string, string][]
            ).map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{t("automation.nodeConfig.field_condition.valueLabel")}</Label>
        <Input
          value={String(data.value ?? "")}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder={t(
            "automation.nodeConfig.field_condition.valuePlaceholder"
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label>
          {t("automation.nodeConfig.field_condition.logicalOperatorLabel")}
        </Label>
        <Select
          value={String(data.logical_operator ?? "and")}
          onValueChange={(v) => onChange({ logical_operator: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">{t("automation.logical.and")}</SelectItem>
            <SelectItem value="or">{t("automation.logical.or")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export function NodeConfigSheet({
  node,
  open,
  onClose,
  onSave,
}: NodeConfigSheetProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (node) setForm({ ...(node.data as Record<string, unknown>) });
  }, [node]);

  const patch = useCallback(
    (update: Record<string, unknown>) =>
      setForm((f) => ({ ...f, ...update })),
    []
  );

  if (!node) return null;

  const nodeType = node.type; // "trigger" | "condition" | "action"
  const nodeSubType = String(form.node_type ?? form.trigger_type ?? form.type ?? "");
  const label = String(form.label ?? nodeSubType ?? nodeType ?? "Node");

  const title = t("automation.nodeConfig.title").replace("{{label}}", label);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-95 sm:w-105 overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Label — shown for all node types */}
          <div className="space-y-1.5">
            <Label>{t("automation.nodeConfig.labelField")}</Label>
            <Input
              value={String(form.label ?? "")}
              onChange={(e) => patch({ label: e.target.value })}
              placeholder={t("automation.nodeConfig.labelPlaceholder")}
            />
          </div>

          {/* ── Trigger sub-forms ──────────────────────────────────────────── */}
          {nodeType === "trigger" && nodeSubType === "event_trigger" && (
            <EventTriggerConfig data={form} onChange={patch} />
          )}
          {nodeType === "trigger" && nodeSubType === "schedule_trigger" && (
            <ScheduleTriggerConfig data={form} onChange={patch} />
          )}
          {nodeType === "trigger" && nodeSubType === "manual_trigger" && (
            <p className="text-sm text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
              {t("automation.nodeConfig.manual_trigger.description")}
            </p>
          )}
          {nodeType === "trigger" && nodeSubType === "webhook_trigger" && (
            <WebhookTriggerConfig
              data={form as unknown as WebhookTriggerData}
              ruleId={String(form.rule_id ?? "")}
            />
          )}
          {/* Fallback trigger: generic event fields */}
          {nodeType === "trigger" &&
            !["event_trigger", "schedule_trigger", "manual_trigger", "webhook_trigger"].includes(
              nodeSubType
            ) && <EventTriggerConfig data={form} onChange={patch} />}

          {/* ── Condition sub-form ─────────────────────────────────────────── */}
          {nodeType === "condition" && (
            <ConditionConfig data={form} onChange={patch} />
          )}

          {/* ── Action sub-forms ───────────────────────────────────────────── */}
          {nodeType === "action" &&
            (nodeSubType === "notify" ||
              nodeSubType === "send_notification") && (
              <NotifyActionConfig data={form} onChange={patch} />
            )}
          {nodeType === "action" && nodeSubType === "create_task" && (
            <CreateTaskConfig data={form} onChange={patch} />
          )}
          {nodeType === "action" && nodeSubType === "ai_action" && (
            <AiActionConfig data={form} onChange={patch} />
          )}
          {nodeType === "action" && nodeSubType === "publish_event" && (
            <PublishEventConfig data={form} onChange={patch} />
          )}
          {nodeType === "action" && nodeSubType === "update_entity" && (
            <UpdateEntityConfig data={form} onChange={patch} />
          )}

          {/* ── Buttons ────────────────────────────────────────────────────── */}
          <div className="pt-2 flex gap-2">
            <Button className="flex-1" onClick={() => onSave(form)}>
              {t("automation.nodeConfig.save")}
            </Button>
            <Button variant="outline" onClick={onClose}>
              {t("automation.nodeConfig.cancel")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
