/**
 * RecurrenceEditor component
 * UI for configuring event recurrence patterns
 */

import { useMemo } from "react";
import { format } from "date-fns";
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
import { Checkbox } from "~/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  calculateNextOccurrences,
  formatRecurrence,
} from "~/features/calendar/utils/recurrence";

export interface RecurrenceConfig {
  type: "none" | "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  daysOfWeek?: number[]; // 0-6 (Sun-Sat)
  endDate?: Date;
}

interface RecurrenceEditorProps {
  value: RecurrenceConfig | null;
  onChange: (config: RecurrenceConfig | null) => void;
  startDate?: Date;
}

export function RecurrenceEditor({
  value,
  onChange,
  startDate = new Date(),
}: RecurrenceEditorProps) {
  const { t } = useTranslation();

  // Initialize default config if null
  const config = useMemo(() => {
    if (value) return value;
    return {
      type: "none" as const,
      interval: 1,
      daysOfWeek: [],
      endDate: undefined,
    };
  }, [value]);

  const updateConfig = (updates: Partial<RecurrenceConfig>) => {
    const newConfig = { ...config, ...updates };

    // Reset to none if type is none
    if (updates.type === "none") {
      onChange(null);
      return;
    }

    onChange(newConfig);
  };

  const handleTypeChange = (type: RecurrenceConfig["type"]) => {
    if (type === "none") {
      onChange(null);
      return;
    }

    // Reset daysOfWeek when changing type (except for weekly)
    const updates: Partial<RecurrenceConfig> = { type };
    if (type !== "weekly") {
      updates.daysOfWeek = [];
    }

    updateConfig(updates);
  };

  const handleDayToggle = (day: number) => {
    const currentDays = config.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort();

    updateConfig({ daysOfWeek: newDays });
  };

  const weekDays = [
    { id: 0, label: t("calendar.weekdays.sun") },
    { id: 1, label: t("calendar.weekdays.mon") },
    { id: 2, label: t("calendar.weekdays.tue") },
    { id: 3, label: t("calendar.weekdays.wed") },
    { id: 4, label: t("calendar.weekdays.thu") },
    { id: 5, label: t("calendar.weekdays.fri") },
    { id: 6, label: t("calendar.weekdays.sat") },
  ];

  const recurrenceTypes = [
    { value: "none", label: t("calendar.recurrence.none") },
    { value: "daily", label: t("calendar.recurrence.daily") },
    { value: "weekly", label: t("calendar.recurrence.weekly") },
    { value: "monthly", label: t("calendar.recurrence.monthly") },
    { value: "yearly", label: t("calendar.recurrence.yearly") },
  ];

  const intervalLabels = {
    daily: t("calendar.recurrence.days"),
    weekly: t("calendar.recurrence.weeks"),
    monthly: t("calendar.recurrence.months"),
    yearly: t("calendar.recurrence.years"),
  };

  // Calculate preview occurrences
  const previewOccurrences = useMemo(() => {
    if (config.type === "none") return [];
    return calculateNextOccurrences(startDate, config, 5);
  }, [config, startDate]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base">
          {t("calendar.recurrence.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recurrence Type */}
        <div className="space-y-2">
          <Label>{t("calendar.recurrence.type")}</Label>
          <Select value={config.type} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {recurrenceTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {config.type !== "none" && (
          <>
            {/* Interval */}
            <div className="space-y-2">
              <Label>{t("calendar.recurrence.interval")}</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="1"
                  max="999"
                  value={config.interval}
                  onChange={(e) => {
                    const interval = parseInt(e.target.value) || 1;
                    updateConfig({
                      interval: Math.max(1, Math.min(999, interval)),
                    });
                  }}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {intervalLabels[config.type]}
                </span>
              </div>
            </div>

            {/* Days of Week (for weekly) */}
            {config.type === "weekly" && (
              <div className="space-y-2">
                <Label>{t("calendar.recurrence.days")}</Label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <div key={day.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.id}`}
                        checked={config.daysOfWeek?.includes(day.id) || false}
                        onCheckedChange={() => handleDayToggle(day.id)}
                      />
                      <Label
                        htmlFor={`day-${day.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* End Date */}
            <div className="space-y-2">
              <Label>{t("calendar.recurrence.endsOn")}</Label>
              <Input
                type="date"
                value={
                  config.endDate ? format(config.endDate, "yyyy-MM-dd") : ""
                }
                onChange={(e) => {
                  const date = e.target.value
                    ? new Date(e.target.value)
                    : undefined;
                  updateConfig({ endDate: date });
                }}
                min={format(startDate, "yyyy-MM-dd")}
                className="w-full"
              />
            </div>

            {/* Preview */}
            {previewOccurrences.length > 0 && (
              <div className="space-y-2">
                <Label>{t("calendar.recurrence.preview")}</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  {previewOccurrences.map((date, index) => (
                    <div key={index}>{format(date, "PPP")}</div>
                  ))}
                  {previewOccurrences.length === 5 && (
                    <div className="italic">
                      {t("calendar.recurrence.andMore")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Human-readable description */}
            <div className="text-sm text-muted-foreground">
              {formatRecurrence(config, t)}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
