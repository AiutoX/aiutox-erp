import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "~/hooks/useToast";
import { useTranslation } from "~/lib/i18n/useTranslation";

interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

interface UseSSEOptions {
  url: string;
  enabled?: boolean;
  onEvent?: (event: SSEEvent) => void;
  reconnectInterval?: number;
}

export function useSSE({
  url,
  enabled = true,
  onEvent,
  reconnectInterval = 5000,
}: UseSSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast();
  const { t } = useTranslation();

  const handleNotificationEvent = useCallback(
    (event: SSEEvent) => {
      const { type, data } = event;

      switch (type) {
        case "task.assigned":
          toast.success(
            t("tasks.notifications.assigned"),
            t("tasks.notifications.assignedDescription").replace(
              "{title}",
              String(data.task_title)
            )
          );
          break;

        case "task.status_changed":
          toast.info(
            t("tasks.notifications.statusChanged"),
            t("tasks.notifications.statusChangedDescription")
              .replace("{title}", String(data.task_title))
              .replace("{status}", String(data.new_status))
          );
          break;

        case "task.due_soon": {
          const windowVal = String(data.window || "soon");
          const windowKey = `tasks.notifications.windows.${windowVal}`;
          const windowText = t(windowKey);

          toast.warning(
            t("tasks.notifications.dueSoon"),
            t("tasks.notifications.dueSoonDescription")
              .replace("{title}", String(data.task_title))
              .replace("{window}", windowText)
          );
          break;
        }

        case "task.overdue":
          toast.error(
            t("tasks.notifications.overdue"),
            t("tasks.notifications.overdueDescription").replace(
              "{title}",
              String(data.task_title)
            )
          );
          break;

        case "task.completed":
          toast.success(
            t("tasks.notifications.completed"),
            t("tasks.notifications.completedDescription").replace(
              "{title}",
              String(data.task_title)
            )
          );
          break;

        default:
          break;
      }
    },
    [t, toast]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const connect = () => {
      try {
        const eventSource = new EventSource(url, {
          withCredentials: true,
        });

        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
          console.log("[useSSE] Connected to SSE stream:", url);
        };

        eventSource.onerror = (err) => {
          console.error("[useSSE] SSE error:", err);
          setIsConnected(false);
          setError(new Error("SSE connection error"));

          eventSource.close();

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("[useSSE] Reconnecting...");
            connect();
          }, reconnectInterval);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const sseEvent: SSEEvent = {
              type: data.type || "message",
              data: data,
            };

            if (onEvent) {
              onEvent(sseEvent);
            }

            handleNotificationEvent(sseEvent);
          } catch (err) {
            console.error("[useSSE] Failed to parse SSE message:", err);
          }
        };

        eventSourceRef.current = eventSource;
      } catch (err) {
        console.error("[useSSE] Failed to create EventSource:", err);
        setError(err as Error);
      }
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [url, enabled, onEvent, reconnectInterval, handleNotificationEvent]);

  return {
    isConnected,
    error,
  };
}
