/**
 * BadgeBuilder component
 * Form for creating and editing gamification badges
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import type {
  Badge,
  BadgeCreate,
  BadgeUpdate,
} from "~/features/gamification/api/gamification.api";

interface BadgeBuilderProps {
  badge?: Badge;
  onSubmit: (data: BadgeCreate | BadgeUpdate) => void;
  onCancel?: () => void;
  loading?: boolean;
}

const EVENT_TYPES = [
  "task.completed",
  "task.created",
  "calendar.event_attended",
] as const;

export function BadgeBuilder({
  badge,
  onSubmit,
  onCancel,
  loading = false,
}: BadgeBuilderProps) {
  const { t } = useTranslation();

  const [name, setName] = useState(badge?.name ?? "");
  const [description, setDescription] = useState(badge?.description ?? "");
  const [icon, setIcon] = useState(badge?.icon ?? "");
  const [pointsValue, setPointsValue] = useState(
    badge?.points_value ?? 0
  );
  const [eventType, setEventType] = useState<string>(
    (badge?.criteria?.event_type as string) ?? EVENT_TYPES[0]
  );
  const [count, setCount] = useState<number>(
    (badge?.criteria?.count as number) ?? 1
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: BadgeCreate | BadgeUpdate = {
      name,
      description: description || undefined,
      icon,
      points_value: pointsValue,
      criteria: { event_type: eventType, count },
    };
    onSubmit(payload);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {badge
              ? t("gamification.badges.builder.edit")
              : t("gamification.badges.builder.create")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t("gamification.badges.fields.name")}
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("gamification.badges.builder.name.placeholder")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">
                  {t("gamification.badges.fields.icon")}
                </Label>
                <Input
                  id="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder={t("gamification.badges.builder.icon.placeholder")}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {t("gamification.badges.fields.description")}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(
                  "gamification.badges.builder.description.placeholder"
                )}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_type">
                  {t("gamification.badges.fields.eventType")}
                </Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger id="event_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(
                          `gamification.badges.eventTypes.${type.replaceAll(".", "_")}`
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="count">
                  {t("gamification.badges.fields.count")}
                </Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  step={1}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="points_value">
                  {t("gamification.badges.fields.pointsValue")}
                </Label>
                <Input
                  id="points_value"
                  type="number"
                  min={0}
                  step={1}
                  value={pointsValue}
                  onChange={(e) => setPointsValue(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  {t("common.cancel")}
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
