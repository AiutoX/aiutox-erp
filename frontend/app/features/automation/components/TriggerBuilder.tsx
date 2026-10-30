/**
 * Trigger Builder component
 * Allows configuration of automation rule triggers (event, schedule, manual)
 */

import { useTranslation } from "~/lib/i18n/useTranslation";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { AutomationTrigger } from "../types/automation.types";

interface TriggerBuilderProps {
  trigger: AutomationTrigger;
  onChange: (trigger: AutomationTrigger) => void;
}

export function TriggerBuilder({ trigger, onChange }: TriggerBuilderProps) {
  const { t } = useTranslation();

  const handleTriggerTypeChange = (value: string) => {
    onChange({
      ...trigger,
      type: value as "event" | "schedule" | "manual",
    });
  };

  const handleEventTypeChange = (value: string) => {
    onChange({
      ...trigger,
      event_type: value,
    });
  };

  const handleEntityTypeChange = (value: string) => {
    onChange({
      ...trigger,
      entity_type: value,
    });
  };

  const handleScheduleTypeChange = (value: string) => {
    onChange({
      ...trigger,
      schedule: {
        ...trigger.schedule,
        type: value as "cron" | "interval",
      },
    });
  };

  const handleCronExpressionChange = (value: string) => {
    onChange({
      ...trigger,
      schedule: {
        type: trigger.schedule?.type ?? "cron",
        ...trigger.schedule,
        expression: value,
      },
    });
  };

  const handleIntervalSecondsChange = (value: string) => {
    onChange({
      ...trigger,
      schedule: {
        type: trigger.schedule?.type ?? "interval",
        ...trigger.schedule,
        interval_seconds: parseInt(value, 10),
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="trigger_type">{t("automation.form.triggerType")}</Label>
        <Select value={trigger.type} onValueChange={handleTriggerTypeChange}>
          <SelectTrigger>
            <SelectValue
              placeholder={t("automation.form.triggerTypePlaceholder")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="event">
              {t("automation.trigger.event")}
            </SelectItem>
            <SelectItem value="schedule">
              {t("automation.trigger.schedule")}
            </SelectItem>
            <SelectItem value="manual">
              {t("automation.trigger.manual")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {trigger.type === "event" && (
        <>
          <div>
            <Label htmlFor="event_type">{t("automation.form.eventType")}</Label>
            <Input
              id="event_type"
              value={trigger.event_type || ""}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              placeholder={t("automation.form.eventTypePlaceholder")}
            />
            <p className="text-xs text-muted-foreground mt-1">
              e.g., task.assigned, file.uploaded, user.created
            </p>
          </div>

          <div>
            <Label htmlFor="entity_type">
              {t("automation.form.entityType")}
            </Label>
            <Input
              id="entity_type"
              value={trigger.entity_type || ""}
              onChange={(e) => handleEntityTypeChange(e.target.value)}
              placeholder={t("automation.form.entityTypePlaceholder")}
            />
            <p className="text-xs text-muted-foreground mt-1">
              e.g., task, file, user
            </p>
          </div>
        </>
      )}

      {trigger.type === "schedule" && (
        <>
          <div>
            <Label htmlFor="schedule_type">
              {t("automation.form.scheduleType")}
            </Label>
            <Select
              value={trigger.schedule?.type}
              onValueChange={handleScheduleTypeChange}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("automation.form.scheduleTypePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cron">
                  {t("automation.schedule.cron")}
                </SelectItem>
                <SelectItem value="interval">
                  {t("automation.schedule.interval")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {trigger.schedule?.type === "cron" && (
            <div>
              <Label htmlFor="cron_expression">
                {t("automation.form.cronExpression")}
              </Label>
              <Input
                id="cron_expression"
                value={trigger.schedule?.expression || ""}
                onChange={(e) => handleCronExpressionChange(e.target.value)}
                placeholder="0 9 * * 1-5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cron format: minute hour day month weekday (UTC)
              </p>
            </div>
          )}

          {trigger.schedule?.type === "interval" && (
            <div>
              <Label htmlFor="interval_seconds">
                {t("automation.form.intervalSeconds")}
              </Label>
              <Input
                id="interval_seconds"
                type="number"
                min="60"
                value={trigger.schedule?.interval_seconds || ""}
                onChange={(e) => handleIntervalSecondsChange(e.target.value)}
                placeholder="3600"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 60 seconds
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
