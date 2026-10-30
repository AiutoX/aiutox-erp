import { useEffect, useRef, useState } from "react";
import { History, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ExampleChips } from "./ExampleChips";
import { ConversationHistoryList } from "./ConversationHistoryList";
import { AgentConfirmationCard } from "../../components/AgentConfirmationCard";
import { useChat } from "../hooks/useChat";
import { useConversations } from "../hooks/useConversations";
import { useStartAgentRun } from "../../hooks/useAutomation";
import type { ERPContext } from "../types/chat.types";

interface EmbeddedAssistantProps {
  open: boolean;
  onClose: () => void;
  context: ERPContext;
}

export function EmbeddedAssistant({
  open,
  onClose,
  context,
}: EmbeddedAssistantProps) {
  const { t } = useTranslation();
  const [showHistory, setShowHistory] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { invalidate } = useConversations();
  const agentRunMutation = useStartAgentRun();

  const {
    messages,
    isStreaming,
    hitlRequest,
    sendMessage,
    startNewConversation,
    loadConversation,
    clearHitlRequest,
    appendStatusMessage,
  } = useChat(context);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text: string) => {
    setShowHistory(false);
    sendMessage(text);
  };

  const handleAgentRun = async (goal: string) => {
    if (agentRunMutation.isPending) return;
    setAgentError(null);
    try {
      await agentRunMutation.mutateAsync({ goal });
    } catch (err) {
      setAgentError(t("ai.chat.agent_error"));
      throw err;
    }
  };

  const handleSelectConversation = (id: string) => {
    loadConversation(id);
    setShowHistory(false);
  };

  const handleNewConversation = () => {
    startNewConversation();
    setShowHistory(false);
    invalidate();
  };

  const isEmpty = messages.length === 0 && !showHistory;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} modal={false}>
      <SheetContent
        side="right"
        className="w-full h-full lg:w-[420px] lg:h-auto overflow-hidden flex flex-col p-0 [&>button.absolute]:hidden"
        data-testid="embedded-assistant"
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0">
          <SheetTitle className="text-sm font-medium">
            {t("ai.chat.empty_state")}
          </SheetTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowHistory((v) => !v)}
              aria-label={t("ai.chat.history")}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              aria-label={t("ai.chat.close")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {showHistory ? (
            <ConversationHistoryList
              onSelect={handleSelectConversation}
              onNew={handleNewConversation}
            />
          ) : (
            <div className="flex flex-col h-full">
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-3 py-4 space-y-4 bg-muted/30"
              >
                {isEmpty && <ExampleChips onSelect={handleSend} />}
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onRetry={
                      msg.status === "error"
                        ? () => sendMessage(msg.content)
                        : undefined
                    }
                  />
                ))}
                {hitlRequest && (
                  <AgentConfirmationCard
                    runId={hitlRequest.runId}
                    stepIndex={hitlRequest.stepIndex}
                    capability={hitlRequest.capability}
                    params={hitlRequest.params}
                    onConfirmed={() => {
                      clearHitlRequest();
                      appendStatusMessage(t("automation.agent.resuming"));
                    }}
                    onRejected={() => {
                      clearHitlRequest();
                      appendStatusMessage(t("automation.agent.replanning"));
                    }}
                  />
                )}
              </div>

              {agentError && (
                <Alert variant="destructive" className="mx-3 mb-2">
                  <AlertDescription>{agentError}</AlertDescription>
                </Alert>
              )}

              <ChatInput
                onSend={handleSend}
                onAgentRun={handleAgentRun}
                disabled={isStreaming}
                agentRunning={agentRunMutation.isPending}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
