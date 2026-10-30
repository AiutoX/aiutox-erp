/**
 * Action Builder component
 * Allows configuration of actions to execute when rule conditions are met
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { AutomationAction } from "../types/automation.types";

interface ActionBuilderProps {
  actions: AutomationAction[];
  onAddAction: () => void;
  onUpdateAction: (index: number, field: string, value: unknown) => void;
  onRemoveAction: (index: number) => void;
}

const ACTION_TYPES = [
  { value: "send_notification", label: "Send Notification" },
  { value: "create_task", label: "Create Task" },
  { value: "update_entity", label: "Update Entity" },
  { value: "send_webhook", label: "Send Webhook" },
  { value: "publish_event", label: "Publish Event" },
];

const CHANNELS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "in-app", label: "In-App" },
  { value: "webhook", label: "Webhook" },
];

export function ActionBuilder({
  actions,
  onAddAction,
  onUpdateAction,
  onRemoveAction,
}: ActionBuilderProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {actions.map((action, index) => (
        <ActionRow
          key={index}
          index={index}
          action={action}
          onUpdate={onUpdateAction}
          onRemove={onRemoveAction}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={onAddAction}
        className="w-full"
      >
        {t("automation.form.addAction")}
      </Button>
    </div>
  );
}

interface ActionRowProps {
  index: number;
  action: AutomationAction;
  onUpdate: (index: number, field: string, value: unknown) => void;
  onRemove: (index: number) => void;
}

function ActionRow({ index, action, onUpdate, onRemove }: ActionRowProps) {
  const { t } = useTranslation();

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">
          {t("automation.form.action")} {index + 1}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          {t("common.remove")}
        </Button>
      </div>

      <div>
        <Label className="text-sm">{t("automation.form.actionType")}</Label>
        <Select
          value={action.type}
          onValueChange={(value) => onUpdate(index, "type", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {action.type === "send_notification" && (
        <NotificationActionFields
          action={action}
          index={index}
          onUpdate={onUpdate}
        />
      )}

      {action.type === "create_task" && (
        <CreateTaskActionFields
          action={action}
          index={index}
          onUpdate={onUpdate}
        />
      )}

      {action.type === "update_entity" && (
        <UpdateEntityActionFields
          action={action}
          index={index}
          onUpdate={onUpdate}
        />
      )}

      {action.type === "send_webhook" && (
        <WebhookActionFields
          action={action}
          index={index}
          onUpdate={onUpdate}
        />
      )}

      {action.type === "publish_event" && (
        <PublishEventActionFields
          action={action}
          index={index}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}

interface ActionFieldsProps {
  action: AutomationAction;
  index: number;
  onUpdate: (index: number, field: string, value: unknown) => void;
}

function NotificationActionFields({
  action,
  index,
  onUpdate,
}: ActionFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <Label className="text-sm">{t("automation.form.channel")}</Label>
        <Select
          value={action.channel || "email"}
          onValueChange={(value) => onUpdate(index, "channel", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHANNELS.map((ch) => (
              <SelectItem key={ch.value} value={ch.value}>
                {ch.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm">{t("automation.form.template")}</Label>
        <Input
          value={action.template || ""}
          onChange={(e) => onUpdate(index, "template", e.target.value)}
          placeholder="task_assigned"
        />
      </div>

      <div className="md:col-span-2">
        <Label className="text-sm">{t("automation.form.recipients")}</Label>
        <Input
          value={action.recipients?.join(", ") || ""}
          onChange={(e) =>
            onUpdate(
              index,
              "recipients",
              e.target.value
                .split(",")
                .map((r) => r.trim())
                .filter(Boolean)
            )
          }
          placeholder="user_id_1, user_id_2"
        />
      </div>
    </div>
  );
}

function CreateTaskActionFields({
  action,
  index,
  onUpdate,
}: ActionFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm">{t("automation.form.template")}</Label>
        <Input
          value={action.template || ""}
          onChange={(e) => onUpdate(index, "template", e.target.value)}
          placeholder="followup_task"
        />
      </div>

      <div>
        <Label className="text-sm">JSON Data</Label>
        <Textarea
          value={JSON.stringify(action.data || {}, null, 2)}
          onChange={(e) => {
            try {
              const data = JSON.parse(e.target.value);
              onUpdate(index, "data", data);
            } catch {
              // Invalid JSON, ignore
            }
          }}
          placeholder='{"title": "Follow up", "priority": "high"}'
          rows={3}
        />
      </div>
    </div>
  );
}

function UpdateEntityActionFields({
  action,
  index,
  onUpdate,
}: ActionFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <Label className="text-sm">{t("automation.form.entityType")}</Label>
        <Input
          value={action.entity_type || ""}
          onChange={(e) => onUpdate(index, "entity_type", e.target.value)}
          placeholder="task"
        />
      </div>

      <div>
        <Label className="text-sm">Entity ID Field</Label>
        <Input
          value={action.entity_id || ""}
          onChange={(e) => onUpdate(index, "entity_id", e.target.value)}
          placeholder="id"
        />
      </div>

      <div className="md:col-span-2">
        <Label className="text-sm">JSON Data</Label>
        <Textarea
          value={JSON.stringify(action.data || {}, null, 2)}
          onChange={(e) => {
            try {
              const data = JSON.parse(e.target.value);
              onUpdate(index, "data", data);
            } catch {
              // Invalid JSON, ignore
            }
          }}
          placeholder='{"status": "completed", "assigned_to": null}'
          rows={3}
        />
      </div>
    </div>
  );
}

function WebhookActionFields({ action, index, onUpdate }: ActionFieldsProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm">Webhook URL</Label>
        <Input
          value={action.webhook_url || ""}
          onChange={(e) => onUpdate(index, "webhook_url", e.target.value)}
          placeholder="https://example.com/webhook"
        />
      </div>

      <div>
        <Label className="text-sm">JSON Payload</Label>
        <Textarea
          value={JSON.stringify(action.data || {}, null, 2)}
          onChange={(e) => {
            try {
              const data = JSON.parse(e.target.value);
              onUpdate(index, "data", data);
            } catch {
              // Invalid JSON, ignore
            }
          }}
          placeholder='{"action": "notify", "event": "task.completed"}'
          rows={3}
        />
      </div>
    </div>
  );
}

function PublishEventActionFields({
  action,
  index,
  onUpdate,
}: ActionFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm">{t("automation.form.eventType")}</Label>
        <Input
          value={action.event_type || ""}
          onChange={(e) => onUpdate(index, "event_type", e.target.value)}
          placeholder="rule.executed"
        />
      </div>

      <div>
        <Label className="text-sm">{t("automation.form.eventData")}</Label>
        <Textarea
          value={JSON.stringify(action.event_data || {}, null, 2)}
          onChange={(e) => {
            try {
              const data = JSON.parse(e.target.value);
              onUpdate(index, "event_data", data);
            } catch {
              // Invalid JSON, ignore
            }
          }}
          placeholder='{"source": "automation", "rule_id": "..."}'
          rows={3}
        />
      </div>
    </div>
  );
}
