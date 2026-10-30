/**
 * CreateTaskConfig
 * Config form for create_task action nodes — title, description, due days.
 * Task is always assigned to the rule owner (no assignee field).
 */

import { Info } from "lucide-react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface CreateTaskData {
  label?: string;
  node_type?: string;
  type?: string;
  params?: {
    title?: string;
    description?: string;
    due_in_days?: number | string;
  };
}

interface CreateTaskConfigProps {
  data: CreateTaskData;
  onChange: (patch: Partial<CreateTaskData>) => void;
}

export function CreateTaskConfig({ data, onChange }: CreateTaskConfigProps) {
  const { t } = useTranslation();
  const params = data.params ?? {};

  const setParams = (patch: Partial<typeof params>) => {
    onChange({ params: { ...params, ...patch } });
  };

  return (
    <div className="space-y-3">
      {/* Self-assign note */}
      <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        {t("automation.nodeConfig.create_task.selfAssignedNote")}
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label>{t("automation.nodeConfig.create_task.titleLabel")}</Label>
        <Input
          value={params.title ?? ""}
          onChange={(e) => setParams({ title: e.target.value })}
          placeholder={t(
            "automation.nodeConfig.create_task.titlePlaceholder"
          )}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label>
          {t("automation.nodeConfig.create_task.descriptionLabel")}
        </Label>
        <Textarea
          rows={3}
          value={params.description ?? ""}
          onChange={(e) => setParams({ description: e.target.value })}
        />
      </div>

      {/* Due in days */}
      <div className="space-y-1.5">
        <Label>{t("automation.nodeConfig.create_task.dueDaysLabel")}</Label>
        <Input
          type="number"
          min={0}
          value={params.due_in_days ?? ""}
          onChange={(e) =>
            setParams({
              due_in_days: e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
          placeholder={t(
            "automation.nodeConfig.create_task.dueDaysPlaceholder"
          )}
        />
      </div>
    </div>
  );
}
