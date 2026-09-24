/**
 * ScheduleTriggerConfig
 * Config form for schedule_trigger nodes — cron expression input with
 * live human-readable preview via cronstrue and quick presets.
 */

import { useState, useEffect } from "react";
import cronstrue from "cronstrue";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface ScheduleTriggerData {
  label?: string;
  trigger_type?: string;
  schedule?: {
    type: "cron";
    expression: string;
    timezone: string;
  };
}

const PRESETS: Array<{ label: string; expression: string }> = [
  { label: "Every day at 9am", expression: "0 9 * * *" },
  { label: "Every Monday at 9am", expression: "0 9 * * 1" },
  { label: "1st of month at 9am", expression: "0 9 1 * *" },
  { label: "Every hour", expression: "0 * * * *" },
];

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Madrid",
  "Asia/Tokyo",
];

interface ScheduleTriggerConfigProps {
  data: ScheduleTriggerData;
  onChange: (patch: Partial<ScheduleTriggerData>) => void;
}

export function ScheduleTriggerConfig({
  data,
  onChange,
}: ScheduleTriggerConfigProps) {
  const { t } = useTranslation();
  const expression = data.schedule?.expression ?? "";
  const timezone = data.schedule?.timezone ?? "UTC";
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!expression.trim()) {
      setPreview(null);
      setError(false);
      return;
    }
    try {
      setPreview(cronstrue.toString(expression, { verbose: true }));
      setError(false);
    } catch {
      setPreview(null);
      setError(true);
    }
  }, [expression]);

  const setExpression = (expr: string) => {
    onChange({
      schedule: { type: "cron", expression: expr, timezone },
    });
  };

  const setTimezone = (tz: string) => {
    onChange({
      schedule: { type: "cron", expression, timezone: tz },
    });
  };

  return (
    <div className="space-y-3">
      {/* Presets */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          {t("automation.nodeConfig.schedule_trigger.presets")}
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p.expression}
              type="button"
              size="sm"
              variant={expression === p.expression ? "secondary" : "outline"}
              className="h-7 text-xs"
              onClick={() => setExpression(p.expression)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Cron expression */}
      <div className="space-y-1.5">
        <Label>
          {t("automation.nodeConfig.schedule_trigger.expressionLabel")}
        </Label>
        <Input
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder={t(
            "automation.nodeConfig.schedule_trigger.expressionPlaceholder"
          )}
          className={error ? "border-destructive" : ""}
        />
        {preview && !error && (
          <p className="text-xs text-green-600 dark:text-green-400">
            {t("automation.nodeConfig.schedule_trigger.previewLabel").replace(
              "{{preview}}",
              preview
            )}
          </p>
        )}
        {error && (
          <p className="text-xs text-destructive">
            {t("automation.nodeConfig.schedule_trigger.invalidExpression")}
          </p>
        )}
      </div>

      {/* Timezone */}
      <div className="space-y-1.5">
        <Label>
          {t("automation.nodeConfig.schedule_trigger.timezoneLabel")}
        </Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMMON_TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
