import { useState, useRef, type KeyboardEvent } from "react";
import { Send, MessageCircle, Bot, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useTranslation } from "~/lib/i18n/useTranslation";

type ChatInputMode = "ask" | "agent";

interface ChatInputProps {
  onSend: (text: string) => void;
  onAgentRun?: (goal: string) => Promise<void>;
  disabled?: boolean;
  agentRunning?: boolean;
}

export function ChatInput({
  onSend,
  onAgentRun,
  disabled = false,
  agentRunning = false,
}: ChatInputProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<ChatInputMode>("ask");

  const handleSend = () => {
    const value = textareaRef.current?.value.trim();
    if (!value || disabled) return;

    if (mode === "agent" && onAgentRun) {
      onAgentRun(value).then(() => setMode("ask")).catch(() => {});
    } else {
      onSend(value);
    }

    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="sticky bottom-0 border-t bg-background">
      {onAgentRun && (
        <div className="px-3 pt-2">
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as ChatInputMode)}
          >
            <TabsList className="h-7">
              <TabsTrigger value="ask" className="h-5 gap-1 px-2 text-xs">
                <MessageCircle className="h-3 w-3" />
                {t("ai.chat.mode_ask")}
              </TabsTrigger>
              <TabsTrigger value="agent" className="h-5 gap-1 px-2 text-xs">
                <Bot className="h-3 w-3" />
                {t("ai.chat.mode_agent")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="p-3 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          placeholder={
            mode === "agent"
              ? t("ai.chat.placeholder_agent")
              : t("ai.chat.placeholder")
          }
          disabled={disabled}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          aria-label={
            mode === "agent"
              ? t("ai.chat.placeholder_agent")
              : t("ai.chat.placeholder")
          }
          data-testid="chat-input"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled}
          aria-label={t("ai.chat.send")}
          data-testid="chat-send-button"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {agentRunning && (
        <div className="px-3 pb-2 text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t("ai.chat.agent_running")}
        </div>
      )}
    </div>
  );
}
