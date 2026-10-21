import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ERPContext, ChatMessageData, SSEChatEvent, CapabilityResult } from "../types/chat.types";
import type { HitlRequest } from "../../types/automation.types";
import { useChatStream } from "./useChatStream";
import { chatApi } from "../api/chat.api";

function parseCapabilityResult(result: unknown): CapabilityResult | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const variant = r.sections ? "briefing" : r.metrics ? "summary" : "list";
  return {
    title: (r.title as string) ?? "",
    variant,
    items: r.items as CapabilityResult["items"],
    metrics: r.metrics as CapabilityResult["metrics"],
    sections: r.sections as CapabilityResult["sections"],
  };
}

export function useChat(erpContext: ERPContext) {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hitlRequest, setHitlRequest] = useState<HitlRequest | null>(null);

  const streamChat = useChatStream((event: SSEChatEvent) => {
    if (event.type === "text_delta") {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant") return prev;
        return [
          ...prev.slice(0, -1),
          { ...last, content: last.content + event.delta, status: "streaming" as const },
        ];
      });
    } else if (event.type === "tool_result") {
      const capResult = parseCapabilityResult(event.result);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant") return prev;
        return [
          ...prev.slice(0, -1),
          { ...last, capabilityResult: capResult },
        ];
      });
    } else if (event.type === "message_end") {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last) return prev;
        return [...prev.slice(0, -1), { ...last, status: "done" as const }];
      });
      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
    } else if (event.type === "hitl_required") {
      setHitlRequest({
        runId: event.run_id,
        stepIndex: event.step_index,
        capability: event.capability,
        params: event.params,
      });
    } else if (event.type === "error") {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last) return prev;
        return [
          ...prev.slice(0, -1),
          { ...last, status: "error" as const, error: event.message },
        ];
      });
      setIsStreaming(false);
    }
  });

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const now = new Date().toISOString();
      const userMsg: ChatMessageData = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        status: "done",
        timestamp: now,
      };
      const assistantMsg: ChatMessageData = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        status: "streaming",
        timestamp: now,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        await streamChat({
          message: text,
          conversation_id: conversationId,
          erp_context: erpContext,
        });
      } catch (err: unknown) {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (!last) return prev;
          const errMsg =
            err instanceof Error ? err.message : "Something went wrong";
          return [
            ...prev.slice(0, -1),
            { ...last, status: "error" as const, error: errMsg },
          ];
        });
        setIsStreaming(false);
      }
    },
    [conversationId, erpContext, isStreaming, streamChat]
  );

  const clearHitlRequest = useCallback(() => {
    setHitlRequest(null);
  }, []);

  const appendStatusMessage = useCallback((text: string) => {
    const statusMsg: ChatMessageData = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: text,
      status: "done",
    };
    setMessages((prev) => [...prev, statusMsg]);
  }, []);

  const startNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setConversationId(id);
    setMessages([]);
    try {
      const apiMessages = await chatApi.listMessages(id);
      const mapped: ChatMessageData[] = apiMessages.map((m) => ({
        id: m.id,
        role: m.role === "tool" ? "assistant" as const : m.role as ChatMessageData["role"],
        content: m.content,
        status: "done" as const,
        timestamp: m.created_at,
      }));
      setMessages(mapped);
    } catch {
      setMessages([]);
    }
  }, []);

  return {
    messages,
    isStreaming,
    conversationId,
    hitlRequest,
    sendMessage,
    startNewConversation,
    loadConversation,
    clearHitlRequest,
    appendStatusMessage,
  };
}
