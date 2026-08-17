/**
 * AiActionConfig
 * Config form for ai_action nodes — select an @agent_capability by qualified_name.
 */

import { useQuery } from "@tanstack/react-query";
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
import { getDataSources } from "../../api/automation.api";
import type { NodeCatalogItem } from "../../types/automation.types";

export interface AiActionData {
  label?: string;
  node_type?: string;
  params?: {
    qualified_name?: string;
  };
}

interface AiActionConfigProps {
  data: AiActionData;
  onChange: (patch: Partial<AiActionData>) => void;
}

export function AiActionConfig({ data, onChange }: AiActionConfigProps) {
  const { t } = useTranslation();
  const params = data.params ?? {};

  const { data: sourcesData } = useQuery({
    queryKey: ["automation", "meta", "data-sources"],
    queryFn: getDataSources,
    staleTime: 5 * 60 * 1000,
  });

  const capabilities: NodeCatalogItem[] = (sourcesData?.data ?? []).filter(
    (s: NodeCatalogItem) => s.node_type === "erp_query"
  );

  const setParams = (patch: Partial<typeof params>) => {
    onChange({ params: { ...params, ...patch } });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t("automation.nodeConfig.ai_action.capabilityLabel")}</Label>

        {capabilities.length > 0 ? (
          <Select
            value={params.qualified_name ?? ""}
            onValueChange={(v) => setParams({ qualified_name: v })}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t("automation.nodeConfig.ai_action.capabilityPlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {capabilities.map((cap) => {
                const schema = cap.config_schema as Record<string, Record<string, unknown>> | undefined;
                const qn = String(schema?.["qualified_name"]?.["const"] ?? "");
                return (
                <SelectItem
                  key={qn || cap.label}
                  value={qn}
                >
                  {cap.label}
                </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={params.qualified_name ?? ""}
            onChange={(e) => setParams({ qualified_name: e.target.value })}
            placeholder={t("automation.nodeConfig.ai_action.capabilityManualPlaceholder")}
          />
        )}

        <p className="text-xs text-muted-foreground">
          {t("automation.nodeConfig.ai_action.hint")}
        </p>
      </div>
    </div>
  );
}
