import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Textarea } from "~/components/ui/textarea";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useConfirmAgentRun, useRejectAgentRun } from "../hooks/useAutomation";

interface AgentConfirmationCardProps {
  runId: string;
  stepIndex: number;
  capability: string;
  params: Record<string, unknown>;
  onConfirmed: () => void;
  onRejected: () => void;
}

export function AgentConfirmationCard({
  runId,
  stepIndex,
  capability,
  params,
  onConfirmed,
  onRejected,
}: AgentConfirmationCardProps) {
  const { t } = useTranslation();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  const confirmMutation = useConfirmAgentRun();
  const rejectMutation = useRejectAgentRun();

  const isPending = confirmMutation.isPending || rejectMutation.isPending;

  const handleConfirm = () => {
    setError(null);
    confirmMutation.mutate(runId, {
      onSuccess: () => onConfirmed(),
      onError: (err) => setError(err instanceof Error ? err.message : t("automation.agent.errorConfirm")),
    });
  };

  const handleReject = () => {
    if (!feedback.trim()) return;
    setError(null);
    rejectMutation.mutate(
      { runId, feedback: feedback.trim() },
      {
        onSuccess: () => onRejected(),
        onError: (err) => setError(err instanceof Error ? err.message : t("automation.agent.errorReject")),
      }
    );
  };

  return (
    <Card className="border-l-4 border-l-amber-500 bg-card" data-testid="agent-confirmation-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {t("automation.agent.confirmStep")}
          <Badge variant="outline" className="text-xs font-normal">
            #{stepIndex}
          </Badge>
          <Badge variant="secondary">
            <code className="text-xs">{capability}</code>
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-2">
        <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto max-h-48 whitespace-pre-wrap break-words">
          {JSON.stringify(params, null, 2)}
        </pre>

        {showRejectForm && (
          <div className="mt-3 space-y-2">
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t("automation.agent.feedbackPlaceholder")}
              className="text-sm min-h-[60px]"
              disabled={isPending}
              data-testid="reject-feedback-input"
            />
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        {!showRejectForm ? (
          <>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isPending}
              data-testid="confirm-agent-btn"
            >
              {confirmMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              {t("automation.agent.confirmAction")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowRejectForm(true)}
              disabled={isPending}
              data-testid="reject-agent-btn"
            >
              <X className="h-3 w-3 mr-1" />
              {t("automation.agent.rejectAction")}
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              disabled={isPending || !feedback.trim()}
              data-testid="submit-reject-btn"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <X className="h-3 w-3 mr-1" />
              )}
              {t("automation.agent.rejectAction")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowRejectForm(false);
                setFeedback("");
              }}
              disabled={isPending}
            >
              {t("common.cancel")}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
