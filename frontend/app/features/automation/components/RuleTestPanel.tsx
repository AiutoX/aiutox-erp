/**
 * RuleTestPanel
 * Dry-run a rule with a synthetic event and display the full execution trace.
 * Opened from AutomationFlowEditor toolbar via the "Test Rule" button.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertCircle, FlaskConical } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "~/components/ui/sheet";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { testAutomationRule } from "../api/automation.api";
import type { AutomationTestResult, ConditionTraceResult } from "../types/automation.types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface RuleTestPanelProps {
  ruleId: string;
  open: boolean;
  onClose: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PassBadge({ passed }: { passed: boolean }) {
  return passed ? (
    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Pass
    </span>
  ) : (
    <span className="flex items-center gap-1 text-destructive text-xs font-medium">
      <XCircle className="w-3.5 h-3.5" />
      Fail
    </span>
  );
}

function ConditionResultRow({ result }: { result: ConditionTraceResult }) {
  const cond = result.condition as Record<string, string>;
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b last:border-0">
      <span className="text-xs text-muted-foreground font-mono">
        {cond.field ?? "?"} {cond.operator ?? "=="} {String(cond.value ?? "")}
      </span>
      <PassBadge passed={result.passed} />
    </div>
  );
}

function ActionResultRow({ result }: { result: Record<string, unknown> }) {
  const status = String(result.status ?? "unknown");
  const isOk = status === "sent" || status === "executed" || status === "published" || status === "queued";
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b last:border-0">
      <span className="text-xs text-muted-foreground font-mono">
        {String(result.type ?? result.qualified_name ?? result.event_type ?? "action")}
      </span>
      <span className={`text-xs font-medium ${isOk ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
        {status}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RuleTestPanel({ ruleId, open, onClose }: RuleTestPanelProps) {
  const { t } = useTranslation();
  const [eventType, setEventType] = useState("");
  const [payloadRaw, setPayloadRaw] = useState("{}");
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [trace, setTrace] = useState<AutomationTestResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(payloadRaw || "{}") as Record<string, unknown>;
        setPayloadError(null);
      } catch {
        setPayloadError(t("automation.testPanel.payloadInvalid"));
        throw new Error("invalid json");
      }
      const res = await testAutomationRule(ruleId, { event_type: eventType, payload });
      return res.data;
    },
    onSuccess: (data) => {
      setTrace(data);
    },
  });

  const canRun = eventType.trim().length > 0 && !mutation.isPending;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4" />
            {t("automation.testPanel.title")}
          </SheetTitle>
          <SheetDescription>{t("automation.testPanel.description")}</SheetDescription>
        </SheetHeader>

        {/* ── Form ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="event_type">{t("automation.testPanel.eventTypeLabel")}</Label>
            <Input
              id="event_type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder={t("automation.testPanel.eventTypePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("automation.testPanel.eventTypeHint")}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payload">{t("automation.testPanel.payloadLabel")}</Label>
            <textarea
              id="payload"
              value={payloadRaw}
              onChange={(e) => setPayloadRaw(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder='{"key": "value"}'
            />
            {payloadError && (
              <p className="text-xs text-destructive">{payloadError}</p>
            )}
          </div>

          {/* ── Trace output ───────────────────────────────────────────────── */}
          {mutation.isError && !payloadError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {t("automation.testPanel.runError")}
            </div>
          )}

          {trace && (
            <div className="space-y-3">
              {/* Summary badge */}
              <div className={`rounded-md border px-3 py-2 flex items-center gap-2 text-sm font-medium ${
                trace.conditions_passed && !trace.error
                  ? "border-green-300 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}>
                {trace.conditions_passed && !trace.error ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {trace.conditions_passed && !trace.error
                  ? t("automation.testPanel.resultPassed")
                  : trace.error
                    ? t("automation.testPanel.resultError")
                    : t("automation.testPanel.resultConditionsFailed")}
              </div>

              {/* Conditions */}
              {trace.condition_results.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    {t("automation.testPanel.conditions")}
                  </p>
                  <div className="rounded-md border divide-y">
                    {trace.condition_results.map((r, i) => (
                      <ConditionResultRow key={i} result={r} />
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {trace.action_results.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    {t("automation.testPanel.actions")}
                  </p>
                  <div className="rounded-md border divide-y">
                    {trace.action_results.map((r, i) => (
                      <ActionResultRow key={i} result={r} />
                    ))}
                  </div>
                </div>
              )}

              {/* Backend error */}
              {trace.error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive font-mono break-all">
                  {trace.error}
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canRun}
            className="gap-1.5"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            {mutation.isPending
              ? t("automation.testPanel.running")
              : t("automation.testPanel.run")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
