/**
 * WebSocket hook for real-time notifications
 * Manages WebSocket connection and notification stream
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
}

export function useNotificationsWebSocket({
  enabled = true,
  onNotification,
  onError,
}: UseNotificationsWebSocketOptions = {}): UseNotificationsWebSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationQueue[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const queryClient = useQueryClient();

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}/api/v1/notifications/stream`;
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const ws = new WebSocket(getWebSocketUrl());

      ws.onopen = () => {
        console.log("✅ Notifications WebSocket connected");
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Request initial notifications
        ws.send(JSON.stringify({ action: "subscribe" }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "notification") {
            const notification: NotificationQueue = data.notification;
            setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50
            onNotification?.(notification);

            // Invalidate notifications list query
            void queryClient.invalidateQueries({
              queryKey: ["notifications", "queue"],
            });
          } else if (data.type === "error") {
            console.error("Notification stream error:", data.error);
            setError(new Error(data.error || "Unknown error"));
            onError?.(new Error(data.error));
          }
        } catch (err) {
          console.error("Failed to parse notification:", err);
        }
      };

      ws.onerror = (event) => {
        const wsError = new Error(`WebSocket error: ${event.type}`);
        setError(wsError);
        onError?.(wsError);
        console.error("Notifications WebSocket error:", wsError);
      };

      ws.onclose = () => {
        console.log("📴 Notifications WebSocket disconnected");
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection with exponential backoff
        if (enabled && reconnectAttemptsRef.current < 10) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            console.log(
              `🔄 Reconnecting to notifications... (attempt ${reconnectAttemptsRef.current})`
            );
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      const wsError = err instanceof Error ? err : new Error(String(err));
      setError(wsError);
      onError?.(wsError);
      console.error("Failed to establish WebSocket connection:", wsError);
    }
  }, [enabled, getWebSocketUrl, onNotification, onError, queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, disconnect]);

  // Initial connection
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    notifications,
    error,
    reconnect,
    disconnect,
  };
}
