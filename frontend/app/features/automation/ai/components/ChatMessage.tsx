import { AlertCircle, Bot, RefreshCw, User } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { CapabilityResultCard } from "./CapabilityResultCard";
import type { ChatMessageData } from "../types/chat.types";
import { cn } from "~/lib/utils";

interface ChatMessageProps {
  message: ChatMessageData;
  onRetry?: () => void;
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const { t } = useTranslation();
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isStreaming = message.status === "streaming" && !message.content;

  if (isSystem) {
    return (
      <div className="flex justify-center px-4 py-1" data-testid="chat-message-system">
        <span className="text-xs text-muted-foreground italic">{message.content}</span>
      </div>
    );
  }

  return (
    <div
      className={cn("flex gap-2 w-full", isUser ? "flex-row-reverse" : "flex-row")}
      data-testid={`chat-message-${message.role}`}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start", "max-w-[80%]")}>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card border border-border text-foreground rounded-tl-sm"
          )}
        >
          {isStreaming && (
            <div className="space-y-2 py-1">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          )}

          {message.content && (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          )}

          {message.capabilityResult && (
            <CapabilityResultCard result={message.capabilityResult} />
          )}

          {message.status === "error" && (
            <div className="mt-2 flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>{message.error ?? t("ai.chat.error.generic")}</span>
              {onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-0 px-1 text-xs"
                  onClick={onRetry}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {t("ai.chat.error.retry")}
                </Button>
              )}
            </div>
          )}
        </div>

        {message.timestamp && (
          <span className="text-[10px] text-muted-foreground px-1">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}
