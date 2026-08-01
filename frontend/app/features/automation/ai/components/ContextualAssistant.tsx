import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useChat } from "../hooks/useChat";
import { useStartAgentRun } from "../../hooks/useAutomation";
import type { ERPContext } from "../types/chat.types";

interface ContextualAssistantProps {
  context: ERPContext;
  autoQuery?: string;
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContextualAssistant({
  context,
  autoQuery,
  className,
  open,
  onOpenChange,
}: ContextualAssistantProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoQueryFired = useRef(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  const { messages, isStreaming, sendMessage } = useChat(context);
  const agentRunMutation = useStartAgentRun();

  const handleAgentRun = async (goal: string) => {
    setAgentError(null);
    try {
      await agentRunMutation.mutateAsync({ goal });
    } catch (err) {
      setAgentError(t("ai.chat.agent_error"));
      throw err;
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && autoQuery && messages.length === 0 && !autoQueryFired.current) {
      autoQueryFired.current = true;
      sendMessage(autoQuery);
    }
  }, [open, autoQuery, messages.length, sendMessage]);

  if (!open) return null;

  return (
    <div
      className={`border rounded-lg overflow-hidden flex flex-col bg-background${className ? ` ${className}` : ""}`}
      data-testid="contextual-assistant"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <span className="text-sm font-medium">{t("ai.contextual.title")}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onOpenChange(false)}
          aria-label={t("ai.contextual.collapse")}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-80"
      >
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onRetry={
              msg.status === "error" ? () => sendMessage(msg.content) : undefined
            }
          />
        ))}
      </div>

      {agentError && (
        <Alert variant="destructive" className="mx-3 mb-2">
          <AlertDescription>{agentError}</AlertDescription>
        </Alert>
      )}

      <ChatInput
        onSend={sendMessage}
        onAgentRun={handleAgentRun}
        disabled={isStreaming}
        agentRunning={agentRunMutation.isPending}
      />
    </div>
  );
}
