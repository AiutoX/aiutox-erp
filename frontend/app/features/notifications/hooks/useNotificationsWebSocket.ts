/**
 * Real-time notifications hook — Server-Sent Events (SSE) client.
 *
 * NOTE: file/export name kept as "WebSocket" for backward compatibility with
 * existing imports (routes/notifications.tsx), but this connects via SSE —
 * a raw browser WebSocket can never complete its handshake against an SSE
 * endpoint. Uses fetch()+ReadableStream instead of EventSource because
 * EventSource cannot set the Authorization header this API requires.
 *
 * Targets the Redis-driven push endpoint (GET /sse/notifications), backed by
 * SSEConnectionManager.send_to_user(), which NotificationService.send() calls
 * on every successful send — real push, not DB polling. See EH-014.
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { NotificationQueue } from "../types/notifications.types";

interface UseNotificationsWebSocketOptions {
  enabled?: boolean;
  onNotification?: (notification: NotificationQueue) => void;
  onError?: (error: Error) => void;
}

interface UseNotificationsWebSocketResult {
  isConnected: boolean;
  notifications: NotificationQueue[];
  error: Error | null;
  reconnect: () => void;
  disconnect: () => void;
  clearNotifications: () => void;
}

export function useNotificationsWebSocket({
  enabled = true,
  onNotification,
  onError,
}: UseNotificationsWebSocketOptions = {}): UseNotificationsWebSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationQueue[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isAbortedRef = useRef(false);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!enabled) return;

    const token = localStorage.getItem("auth_token");
    if (!token) {
      const authError = new Error("No authentication token found");
      setError(authError);
      onError?.(authError);
      return;
    }

    abortControllerRef.current?.abort();
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    isAbortedRef.current = false;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const API_BASE_URL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
    const url = `${API_BASE_URL}/sse/notifications`;

    const fetchStream = async () => {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          const httpError = new Error(`HTTP error! status: ${response.status}`);
          (httpError as Error & { status?: number }).status = response.status;
          throw httpError;
        }

        setIsConnected(true);
        setError(null);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) {
          throw new Error("No reader available");
        }

        let buffer = "";

        while (true) {
          if (isAbortedRef.current) break;

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const rawEvent of events) {
            let eventType = "message";
            let dataStr: string | null = null;

            for (const line of rawEvent.split("\n")) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith("data: ")) {
                dataStr = line.slice(6);
              }
            }

            if (dataStr === null) continue; // heartbeat comment or empty frame
            if (eventType === "connected" || eventType === "heartbeat") continue;

            try {
              const data = JSON.parse(dataStr);

              if (data.error) {
                const streamError = new Error(
                  data.error.message || "Stream error"
                );
                setError(streamError);
                onError?.(streamError);
                continue;
              }

              const notification = data as NotificationQueue;
              setNotifications((prev) => [notification, ...prev].slice(0, 50));
              onNotification?.(notification);

              void queryClient.invalidateQueries({
                queryKey: ["notifications", "queue"],
              });
            } catch (err) {
              console.error("Failed to parse notification:", err);
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        const streamError =
          err instanceof Error ? err : new Error("Connection error");
        console.error("Notifications SSE connection error:", streamError);
        setIsConnected(false);
        setError(streamError);
        onError?.(streamError);

        // 401/403 mean the user isn't authenticated or lacks notifications.view —
        // retrying on a fixed timer would never succeed and would poll forever
        // for as long as the tab stays open. Leave reconnection to the manual
        // `reconnect()` call (e.g. after a permission change or re-login).
        const status = (streamError as Error & { status?: number }).status;
        const isPermanentAuthError = status === 401 || status === 403;

        if (enabled && !isAbortedRef.current && !isPermanentAuthError) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            if (enabled && !isAbortedRef.current) connect();
          }, 5000);
        }
      }
    };

    void fetchStream();
  }, [enabled, onNotification, onError, queryClient]);

  const disconnect = useCallback(() => {
    isAbortedRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    isConnected,
    notifications,
    error,
    reconnect,
    disconnect,
    clearNotifications,
  };
}
