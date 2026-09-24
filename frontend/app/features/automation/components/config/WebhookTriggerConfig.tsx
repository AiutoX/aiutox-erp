/**
 * WebhookTriggerConfig
 * Config panel for webhook_trigger nodes — shows the inbound webhook URL
 * and lets the user generate or rotate the HMAC-SHA256 secret.
 */

import { useState } from "react";
import { Copy, Check, RefreshCw, AlertTriangle } from "lucide-react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { generateWebhookSecret } from "../../api/automation.api";

export interface WebhookTriggerData {
  label?: string;
  node_type?: string;
  rule_id?: string;
  params?: {
    secret_hash?: string;
  };
}

interface WebhookTriggerConfigProps {
  data: WebhookTriggerData;
  ruleId?: string;
}

export function WebhookTriggerConfig({ data, ruleId }: WebhookTriggerConfigProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const effectiveRuleId = ruleId ?? data.rule_id ?? "";
  const hasSecret = Boolean(data.params?.secret_hash);
  const webhookUrl = effectiveRuleId
    ? `${window.location.origin}/api/v1/automation/webhooks/${effectiveRuleId}`
    : "";

  const handleCopy = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleGenerateSecret = async () => {
    if (!effectiveRuleId) return;
    setLoading(true);
    try {
      const res = await generateWebhookSecret(effectiveRuleId);
      if (res.data?.secret) {
        setRevealedSecret(res.data.secret);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Webhook URL row */}
      {webhookUrl && (
        <div className="space-y-1.5">
          <Label>{t("automation.nodeConfig.webhook_trigger.urlLabel")}</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={webhookUrl}
              className="font-mono text-xs flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
              title={t("automation.nodeConfig.webhook_trigger.copyButton")}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("automation.nodeConfig.webhook_trigger.urlHint")}
          </p>
        </div>
      )}

      {/* No rule id yet — can't generate */}
      {!webhookUrl && (
        <p className="text-sm text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
          {t("automation.nodeConfig.webhook_trigger.noSecretYet")}
        </p>
      )}

      {/* Generate / Rotate button */}
      {effectiveRuleId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={handleGenerateSecret}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {hasSecret
            ? t("automation.nodeConfig.webhook_trigger.rotateSecretButton")
            : t("automation.nodeConfig.webhook_trigger.generateSecretButton")}
        </Button>
      )}

      {/* Revealed secret alert */}
      {revealedSecret && (
        <div className="rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">
              {t("automation.nodeConfig.webhook_trigger.secretWarning")}
            </p>
          </div>
          <Label className="text-xs">
            {t("automation.nodeConfig.webhook_trigger.secretLabel")}
          </Label>
          <Input
            readOnly
            value={revealedSecret}
            className="font-mono text-xs"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRevealedSecret(null)}
          >
            {t("automation.nodeConfig.cancel")}
          </Button>
        </div>
      )}
    </div>
  );
}
