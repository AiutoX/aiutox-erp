import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bot, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "~/components/layout/PageLayout";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { showToast } from "~/components/common/Toast";
import { useHasPermission } from "~/hooks/usePermissions";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  aiProviderApi,
  type ProviderConfigCreate,
  type ProviderType,
} from "~/features/automation/ai/api/ai-provider.api";

const PROVIDER_DEFAULTS: Record<
  ProviderType,
  { conversation: string; classifier: string; embeddings: string }
> = {
  anthropic: {
    conversation: "claude-sonnet-4-6",
    classifier: "claude-haiku-4-5-20251001",
    embeddings: "voyage-3",
  },
  openai: {
    conversation: "gpt-4o",
    classifier: "gpt-4o-mini",
    embeddings: "text-embedding-3-small",
  },
  "openai-compatible": {
    conversation: "",
    classifier: "",
    embeddings: "",
  },
};

interface FormState {
  provider_type: ProviderType;
  api_key: string;
  base_url: string;
  model_conversation: string;
  model_classifier: string;
  model_embeddings: string;
}

const DEFAULT_FORM: FormState = {
  provider_type: "anthropic",
  api_key: "",
  base_url: "",
  model_conversation: "",
  model_classifier: "",
  model_embeddings: "",
};

export default function AIProviderSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasAiConfig = useHasPermission("ai.config");

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [invalidKeyError, setInvalidKeyError] = useState(false);
  const [replacingKey, setReplacingKey] = useState(false);

  // Redirect if no permission
  useEffect(() => {
    if (!hasAiConfig) {
      navigate("/settings");
    }
  }, [hasAiConfig, navigate]);

  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ["ai", "provider-config"],
    queryFn: aiProviderApi.getConfig,
    enabled: hasAiConfig,
  });

  // Pre-fill model fields from existing config; key is always blank
  useEffect(() => {
    if (existingConfig) {
      setForm((prev) => ({
        ...prev,
        provider_type: existingConfig.provider_type,
        api_key: "",
        base_url: existingConfig.base_url ?? "",
        model_conversation: existingConfig.model_conversation ?? "",
        model_classifier: existingConfig.model_classifier ?? "",
        model_embeddings: existingConfig.model_embeddings ?? "",
      }));
      setReplacingKey(false);
    }
  }, [existingConfig]);

  const { mutate: saveConfig, isPending: isSaving } = useMutation({
    mutationFn: (data: ProviderConfigCreate) => aiProviderApi.saveConfig(data),
    onSuccess: () => {
      setInvalidKeyError(false);
      queryClient.invalidateQueries({ queryKey: ["ai", "provider-config"] });
      showToast(t("ai.settings.provider.success"), "success");
    },
    onError: (err: unknown) => {
      const status =
        err &&
        typeof err === "object" &&
        "response" in err
          ? (err as { response?: { status?: number; data?: { code?: string } } })
              .response?.status
          : undefined;
      const code =
        err &&
        typeof err === "object" &&
        "response" in err
          ? (err as { response?: { data?: { code?: string } } }).response?.data
              ?.code
          : undefined;

      if (status === 422 && code === "INVALID_PROVIDER_KEY") {
        setInvalidKeyError(true);
      } else {
        showToast(t("ai.settings.provider.error.generic"), "error");
      }
    },
  });

  const handleProviderChange = (value: string) => {
    setForm({
      ...DEFAULT_FORM,
      provider_type: value as ProviderType,
      api_key: "",
    });
    setInvalidKeyError(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInvalidKeyError(false);
    saveConfig({
      provider_type: form.provider_type,
      api_key: form.api_key,
      base_url: form.base_url || null,
      model_conversation: form.model_conversation || undefined,
      model_classifier: form.model_classifier || undefined,
      model_embeddings: form.model_embeddings || undefined,
    });
  };

  if (!hasAiConfig) return null;

  const defaults = PROVIDER_DEFAULTS[form.provider_type];
  const isActive = !!existingConfig?.is_active;

  return (
    <PageLayout
      title={t("ai.settings.provider.title")}
      description={t("ai.settings.provider.description")}
      breadcrumb={[
        { label: "Inicio", href: "/" },
        { label: t("ai.settings.provider.title") },
      ]}
    >
      <div className="max-w-2xl space-y-6">
        {/* Status badge */}
        {!isLoading && isActive && (
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-green-600" />
            <Badge variant="outline" className="text-green-700 border-green-300">
              {t("ai.settings.provider.badge_active")}
            </Badge>
          </div>
        )}

        {/* Invalid key error banner */}
        {invalidKeyError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive">
            {t("ai.settings.provider.error.invalid_key")}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          {/* Provider type */}
          <div className="space-y-2">
            <Label htmlFor="provider_type">{t("ai.settings.provider.provider_label")}</Label>
            <Select
              value={form.provider_type}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger id="provider_type">
                <SelectValue placeholder={t("ai.settings.provider.provider_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="openai-compatible">OpenAI-Compatible (DeepSeek, Groq, etc.)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Base URL — only for openai-compatible */}
          {form.provider_type === "openai-compatible" && (
            <div className="space-y-2">
              <Label htmlFor="base_url">{t("ai.settings.provider.base_url_label")}</Label>
              <Input
                id="base_url"
                name="base_url"
                type="url"
                value={form.base_url}
                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                placeholder={t("ai.settings.provider.base_url_placeholder")}
              />
            </div>
          )}

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api_key">{t("ai.settings.provider.key_label")}</Label>
            {isActive && !replacingKey ? (
              <div className="flex items-center justify-between bg-muted/50 border rounded-md px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500 shrink-0" />
                  <span className="font-mono tracking-widest">••••••••••••••••</span>
                  {existingConfig?.updated_at && (
                    <span className="text-xs text-muted-foreground/70 ml-1">
                      {t("ai.settings.provider.key_updated")}{" "}
                      {new Date(existingConfig.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setReplacingKey(true); setForm({ ...form, api_key: "" }); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-3 shrink-0"
                >
                  <X className="h-3 w-3" />
                  {t("ai.settings.provider.key_replace")}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  id="api_key"
                  name="api_key"
                  type="password"
                  autoComplete="new-password"
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  placeholder={t("ai.settings.provider.key_placeholder")}
                  className="flex-1"
                  autoFocus={replacingKey}
                />
                {replacingKey && (
                  <button
                    type="button"
                    onClick={() => { setReplacingKey(false); setForm({ ...form, api_key: "" }); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    {t("ai.settings.provider.key_cancel")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Model fields */}
          <div className="space-y-2">
            <Label htmlFor="model_conversation">
              {t("ai.settings.provider.model_conversation")}
            </Label>
            <Input
              id="model_conversation"
              value={form.model_conversation}
              onChange={(e) => setForm({ ...form, model_conversation: e.target.value })}
              placeholder={defaults.conversation}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model_classifier">
              {t("ai.settings.provider.model_classifier")}
            </Label>
            <Input
              id="model_classifier"
              value={form.model_classifier}
              onChange={(e) => setForm({ ...form, model_classifier: e.target.value })}
              placeholder={defaults.classifier}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model_embeddings">
              {t("ai.settings.provider.model_embeddings")}
            </Label>
            <Input
              id="model_embeddings"
              value={form.model_embeddings}
              onChange={(e) => setForm({ ...form, model_embeddings: e.target.value })}
              placeholder={defaults.embeddings}
            />
          </div>

          <Button type="submit" disabled={isSaving || (!isActive && !form.api_key)}>
            {isSaving ? "Saving..." : t("ai.settings.provider.save")}
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}
