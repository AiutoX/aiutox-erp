/**
 * AI Configuration Page
 *
 * Configure AI assistant settings: cache TTL, rate limiting, classification pipeline,
 * token budgets, supported channels, and PubSub events.
 */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "~/lib/i18n/useTranslation";
import apiClient from "~/lib/api/client";
import { ConfigPageLayout } from "~/components/config/ConfigPageLayout";
import { ConfigFormField } from "~/components/config/ConfigFormField";
import { ConfigSection } from "~/components/config/ConfigSection";
import { ConfigLoadingState } from "~/components/config/ConfigLoadingState";
import { ConfigErrorState } from "~/components/config/ConfigErrorState";
import { Switch } from "~/components/ui/switch";
import { useConfigForm } from "~/hooks/useConfigForm";
import { useConfigSave } from "~/hooks/useConfigSave";
import { z } from "zod";

interface AIConfig {
  id: string;
  tenant_id: string;
  cache_ttl_seconds: number;
  rate_limit_max: number;
  rate_limit_window_seconds: number;
  classification_stages: string[];
  token_budgets: Record<string, number>;
  supported_channels: string[];
  pubsub_enabled: boolean;
  max_capability_response_tokens: number;
  compaction_threshold: number;
  auto_archive_after_days: number;
  hard_delete_after_days: number;
  created_at: string;
  updated_at: string;
}

type AIConfigForm = Omit<AIConfig, "id" | "tenant_id" | "created_at" | "updated_at">;

const validationSchema = z.object({
  cache_ttl_seconds: z.number().min(0).max(3600),
  rate_limit_max: z.number().min(1).max(10000),
  rate_limit_window_seconds: z.number().min(60).max(86400),
  classification_stages: z.array(z.string()).min(1),
  token_budgets: z.record(z.string(), z.number().min(512).max(32768)),
  supported_channels: z.array(z.string()).min(1),
  pubsub_enabled: z.boolean(),
  max_capability_response_tokens: z.number().min(512).max(32768),
  compaction_threshold: z.number().min(5).max(500),
  auto_archive_after_days: z.number().min(0).max(3650),
  hard_delete_after_days: z.number().min(0).max(3650),
});

const AVAILABLE_STAGES = [
  { value: "context_router", label: "Context Router" },
  { value: "rules_engine", label: "Rules Engine" },
  { value: "embedding", label: "Embedding Matcher" },
  { value: "small_llm", label: "Small LLM" },
];

const AVAILABLE_CHANNELS = [
  { value: "embedded_chat", label: "Embedded Chat" },
  { value: "slack", label: "Slack" },
  { value: "teams", label: "Microsoft Teams" },
  { value: "email", label: "Email" },
];

const DEFAULT_VALUES: AIConfigForm = {
  cache_ttl_seconds: 300,
  rate_limit_max: 100,
  rate_limit_window_seconds: 3600,
  classification_stages: ["context_router", "rules_engine", "small_llm"],
  token_budgets: {
    small_query: 2048,
    standard: 4096,
    complex: 8192,
    advanced: 16384,
  },
  supported_channels: ["embedded_chat"],
  pubsub_enabled: true,
  max_capability_response_tokens: 8000,
  compaction_threshold: 20,
  auto_archive_after_days: 0,
  hard_delete_after_days: 0,
};

async function getAIConfig(): Promise<AIConfig> {
  const response = await apiClient.get("/ai/config");
  return response.data.data;
}

async function updateAIConfig(config: AIConfigForm): Promise<AIConfig> {
  const response = await apiClient.put("/ai/config", config);
  return response.data.data;
}

export default function ConfigAutomationPage() {
  const { t } = useTranslation();

  const {
    data: config,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["ai-config"],
    queryFn: getAIConfig,
  });

  const { values, hasChanges, setValue, reset, updateOriginalValues } =
    useConfigForm<AIConfigForm>({
      initialValues: DEFAULT_VALUES,
      schema: validationSchema,
    });

  useEffect(() => {
    if (config) {
      updateOriginalValues({
        cache_ttl_seconds: config.cache_ttl_seconds,
        rate_limit_max: config.rate_limit_max,
        rate_limit_window_seconds: config.rate_limit_window_seconds,
        classification_stages: config.classification_stages,
        token_budgets: config.token_budgets,
        supported_channels: config.supported_channels,
        pubsub_enabled: config.pubsub_enabled,
        max_capability_response_tokens: config.max_capability_response_tokens ?? 8000,
        compaction_threshold: config.compaction_threshold ?? 20,
        auto_archive_after_days: config.auto_archive_after_days ?? 0,
        hard_delete_after_days: config.hard_delete_after_days ?? 0,
      });
    }
  }, [config, updateOriginalValues]);

  const { save, isSaving } = useConfigSave<AIConfigForm>({
    queryKey: ["ai-config"],
    saveFn: updateAIConfig,
    successMessage: t("config.ai.saveSuccess"),
    errorMessage: t("config.ai.saveError"),
  });

  const toggleStage = (stage: string) => {
    const current = values.classification_stages;
    setValue(
      "classification_stages",
      current.includes(stage)
        ? current.filter((s) => s !== stage)
        : [...current, stage]
    );
  };

  const toggleChannel = (channel: string) => {
    const current = values.supported_channels;
    setValue(
      "supported_channels",
      current.includes(channel)
        ? current.filter((c) => c !== channel)
        : [...current, channel]
    );
  };

  if (isLoading) {
    return <ConfigLoadingState />;
  }

  if (error) {
    return (
      <ConfigErrorState
        message={error.message}
        onRetry={() => { void refetch(); }}
      />
    );
  }

  return (
    <ConfigPageLayout
      title={t("config.ai.title")}
      description={t("config.ai.description")}
      hasChanges={hasChanges}
      isSaving={isSaving}
      onReset={reset}
      onSave={() => save(values)}
    >
      <div className="space-y-6">
        <ConfigSection
          title={t("config.ai.cache.title")}
          description={t("config.ai.cache.description")}
        >
          <ConfigFormField
            id="cache_ttl_seconds"
            label={t("config.ai.cache.ttl")}
            description={t("config.ai.cache.ttlDescription")}
            type="number"
            value={values.cache_ttl_seconds}
            onChange={(v) => setValue("cache_ttl_seconds", parseInt(v) || 0)}
          />
        </ConfigSection>

        <ConfigSection
          title={t("config.ai.rateLimit.title")}
          description={t("config.ai.rateLimit.description")}
        >
          <ConfigFormField
            id="rate_limit_max"
            label={t("config.ai.rateLimit.maxRequests")}
            description={t("config.ai.rateLimit.maxRequestsDescription")}
            type="number"
            value={values.rate_limit_max}
            onChange={(v) => setValue("rate_limit_max", parseInt(v) || 1)}
          />
          <ConfigFormField
            id="rate_limit_window_seconds"
            label={t("config.ai.rateLimit.window")}
            description={t("config.ai.rateLimit.windowDescription")}
            type="number"
            value={values.rate_limit_window_seconds}
            onChange={(v) => setValue("rate_limit_window_seconds", parseInt(v) || 3600)}
          />
        </ConfigSection>

        <ConfigSection
          title={t("config.ai.classification.title")}
          description={t("config.ai.classification.description")}
        >
          <div className="space-y-2">
            {AVAILABLE_STAGES.map((stage) => (
              <div key={stage.value} className="flex items-center space-x-2">
                <Switch
                  checked={values.classification_stages.includes(stage.value)}
                  onCheckedChange={() => toggleStage(stage.value)}
                />
                <label className="text-sm font-medium">{stage.label}</label>
              </div>
            ))}
          </div>
        </ConfigSection>

        <ConfigSection
          title={t("config.ai.tokenBudgets.title")}
          description={t("config.ai.tokenBudgets.description")}
        >
          {(["small_query", "standard", "complex", "advanced"] as const).map((budget) => (
            <ConfigFormField
              key={budget}
              id={`token_budget_${budget}`}
              label={t(`config.ai.tokenBudgets.${budget}`)}
              description={t(`config.ai.tokenBudgets.${budget}Description`)}
              type="number"
              value={values.token_budgets[budget] ?? 4096}
              onChange={(v) =>
                setValue("token_budgets", {
                  ...values.token_budgets,
                  [budget]: parseInt(v) || 4096,
                })
              }
            />
          ))}
        </ConfigSection>

        <ConfigSection
          title={t("config.ai.channels.title")}
          description={t("config.ai.channels.description")}
        >
          <div className="space-y-2">
            {AVAILABLE_CHANNELS.map((channel) => (
              <div key={channel.value} className="flex items-center space-x-2">
                <Switch
                  checked={values.supported_channels.includes(channel.value)}
                  onCheckedChange={() => toggleChannel(channel.value)}
                />
                <label className="text-sm font-medium">{channel.label}</label>
              </div>
            ))}
          </div>
        </ConfigSection>

        <ConfigSection
          title={t("config.ai.pubsub.title")}
          description={t("config.ai.pubsub.description")}
        >
          <div className="flex items-center space-x-2">
            <Switch
              checked={values.pubsub_enabled}
              onCheckedChange={(checked) => setValue("pubsub_enabled", checked)}
            />
            <label className="text-sm font-medium">
              {t("config.ai.pubsub.enabled")}
            </label>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t("config.ai.pubsub.description2")}
          </p>
        </ConfigSection>

        <ConfigSection
          title={t("config.ai.memory.title")}
          description={t("config.ai.memory.description")}
        >
          <ConfigFormField
            id="max_capability_response_tokens"
            label={t("config.ai.memory.maxCapabilityTokens")}
            description={t("config.ai.memory.maxCapabilityTokensDescription")}
            type="number"
            value={values.max_capability_response_tokens}
            onChange={(v) =>
              setValue("max_capability_response_tokens", parseInt(v) || 8000)
            }
          />
          <ConfigFormField
            id="compaction_threshold"
            label={t("config.ai.memory.compactionThreshold")}
            description={t("config.ai.memory.compactionThresholdDescription")}
            type="number"
            value={values.compaction_threshold}
            onChange={(v) =>
              setValue("compaction_threshold", parseInt(v) || 20)
            }
          />
          <ConfigFormField
            id="auto_archive_after_days"
            label={t("config.ai.retention.autoArchiveLabel")}
            description={t("config.ai.retention.autoArchiveDescription")}
            type="number"
            value={values.auto_archive_after_days}
            onChange={(v) =>
              setValue("auto_archive_after_days", parseInt(v) || 0)
            }
          />
          <ConfigFormField
            id="hard_delete_after_days"
            label={t("config.ai.retention.hardDeleteLabel")}
            description={t("config.ai.retention.hardDeleteDescription")}
            type="number"
            value={values.hard_delete_after_days}
            onChange={(v) =>
              setValue("hard_delete_after_days", parseInt(v) || 0)
            }
          />
        </ConfigSection>
      </div>
    </ConfigPageLayout>
  );
}
