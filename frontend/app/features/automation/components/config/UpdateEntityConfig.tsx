import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useTranslation } from "~/lib/i18n/useTranslation";

export interface UpdateEntityConfigData {
  label?: string;
  node_type?: string;
  type?: string;
  params?: {
    entity_type?: string;
    fields?: Record<string, string>;
  };
}

interface UpdateEntityConfigProps {
  data: UpdateEntityConfigData;
  onChange: (patch: Partial<UpdateEntityConfigData>) => void;
}

const TASK_STATUSES = ["open", "in_progress", "completed", "cancelled"] as const;
const TASK_PRIORITIES = ["low", "medium", "high", "critical"] as const;
const LEASE_STATUSES = ["active", "expired", "terminated"] as const;
const WORK_ORDER_STATUSES = ["open", "assigned", "in_progress", "completed", "cancelled"] as const;

export function UpdateEntityConfig({ data, onChange }: UpdateEntityConfigProps) {
  const { t } = useTranslation();
  const params = data.params ?? {};
  const fields = params.fields ?? {};
  const entityType = params.entity_type ?? "";

  const setParams = (patch: Partial<typeof params>) => {
    onChange({ params: { ...params, ...patch } });
  };

  const setField = (fieldName: string, value: string) => {
    setParams({ fields: { ...fields, [fieldName]: value } });
  };

  const handleEntityTypeChange = (value: string) => {
    // Reset fields when entity type changes
    setParams({ entity_type: value, fields: {} });
  };

  return (
    <div className="space-y-3">
      {/* Entity Type */}
      <div className="space-y-1.5">
        <Label>{t("automation.nodeConfig.update_entity.entityTypeLabel")}</Label>
        <Select value={entityType} onValueChange={handleEntityTypeChange}>
          <SelectTrigger>
            <SelectValue
              placeholder={t(
                "automation.nodeConfig.update_entity.entityTypePlaceholder"
              )}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="task">task</SelectItem>
            <SelectItem value="lease">lease</SelectItem>
            <SelectItem value="work_order">work_order</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task fields */}
      {entityType === "task" && (
        <>
          <div className="space-y-1.5">
            <Label>{t("automation.nodeConfig.update_entity.statusLabel")}</Label>
            <Select
              value={fields.status ?? ""}
              onValueChange={(v) => setField("status", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("automation.nodeConfig.update_entity.priorityLabel")}</Label>
            <Select
              value={fields.priority ?? ""}
              onValueChange={(v) => setField("priority", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Lease fields */}
      {entityType === "lease" && (
        <div className="space-y-1.5">
          <Label>{t("automation.nodeConfig.update_entity.statusLabel")}</Label>
          <Select
            value={fields.status ?? ""}
            onValueChange={(v) => setField("status", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {LEASE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Work order fields */}
      {entityType === "work_order" && (
        <div className="space-y-1.5">
          <Label>{t("automation.nodeConfig.update_entity.statusLabel")}</Label>
          <Select
            value={fields.status ?? ""}
            onValueChange={(v) => setField("status", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {WORK_ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Interpolation hint */}
      {entityType && (
        <p className="text-xs text-muted-foreground">
          {t("automation.nodeConfig.update_entity.interpolationHint")}
        </p>
      )}
    </div>
  );
}
