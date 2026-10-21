import apiClient from "~/lib/api/client";
import type { SSEChatEvent } from "../types/chat.types";

export function useChatStream(onEvent: (event: SSEChatEvent) => void) {
  return async function streamChat(body: object): Promise<void> {
    const baseURL = apiClient.defaults.baseURL || "http://localhost:8000/api/v1";
    const token = localStorage.getItem("auth_token");
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(`${baseURL}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw Object.assign(new Error("Chat request failed"), {
        status: response.status,
        data: errorBody,
      });
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (line) {
            try {
              onEvent(JSON.parse(line) as SSEChatEvent);
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };
}
