import { useEffect, useRef, useState, useCallback } from "react";
import type { NotificationQueue } from "~/lib/api/notifications.api";

interface UseNotificationStreamOptions {
  enabled?: boolean;
  onNotification?: (notification: NotificationQueue) => void;
}

interface StreamController {
  close: () => void;
}

/**
 * Hook to manage Server-Sent Events (SSE) stream for notifications
 */
export function useNotificationStream(
  options: UseNotificationStreamOptions = {}
) {
  const { enabled = true, onNotification } = options;
  const [notifications, setNotifications] = useState<NotificationQueue[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const streamControllerRef = useRef<StreamController | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isAbortedRef = useRef(false);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Get auth token
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setError(new Error("No authentication token found"));
      return;
    }

    // Close existing connection if any
    if (streamControllerRef.current) {
      streamControllerRef.current.close();
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    isAbortedRef.current = false;

    const API_BASE_URL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
    const url = `${API_BASE_URL}/notifications/stream`;

    // Use fetch with ReadableStream to support custom headers
    // EventSource doesn't support custom headers, so we'll use fetch instead
    const abortController = new AbortController();

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
          throw new Error(`HTTP error! status: ${response.status}`);
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

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr);

                // Check if it's an error
                if (data.error) {
                  setError(new Error(data.error.message || "Stream error"));
                  continue;
                }

                // Parse notification
                const notification: NotificationQueue = {
                  id: data.id,
                  tenant_id: data.tenant_id,
                  recipient_id: data.recipient_id,
                  event_type: data.event_type,
                  channel: data.channel,
                  template_id: data.template_id,
                  data: data.data,
                  status: data.status,
                  sent_at: data.sent_at,
                  error_message: data.error_message,
                  created_at: data.created_at,
                };

                // Update last ID
                lastIdRef.current = notification.id;

                // Add to notifications list
                setNotifications((prev) => [notification, ...prev]);

                // Call callback if provided
                if (onNotification) {
                  onNotification(notification);
                }
              } catch (err) {
                console.error("Error parsing notification:", err);
                setError(
                  err instanceof Error
                    ? err
                    : new Error("Failed to parse notification")
                );
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Expected abort, do nothing
          return;
        }
        console.error("SSE connection error:", err);
        setIsConnected(false);
        setError(err instanceof Error ? err : new Error("Connection error"));

        // Attempt to reconnect after a delay (only if still enabled and not aborted)
        if (enabled && !isAbortedRef.current) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            if (enabled && !isAbortedRef.current) {
              connect();
            }
          }, 5000);
        }
      }
    };

    fetchStream();

    // Store abort controller for cleanup
    const cleanup = () => {
      isAbortedRef.current = true;
      abortController.abort();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    // Store cleanup function
    streamControllerRef.current = { close: cleanup };
  }, [enabled, onNotification]);

  const disconnect = useCallback(() => {
    if (streamControllerRef.current) {
      streamControllerRef.current.close();
      streamControllerRef.current = null;
      setIsConnected(false);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    isAbortedRef.current = true;
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
  }, [enabled, connect, disconnect]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    lastIdRef.current = null;
  }, []);

  const unreadCount = notifications.filter((n) => n.status === "sent").length;

  return {
    notifications,
    isConnected,
    error,
    unreadCount,
    clearNotifications,
    reconnect: connect,
    disconnect,
  };
}
