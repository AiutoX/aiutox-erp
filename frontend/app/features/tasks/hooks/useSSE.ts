import { useEffect, useState } from "react";
import { useAuthStore } from "~/stores/authStore";

export interface SSEEvent {
  type: string;
  data: unknown;
  timestamp?: string;
}

export function useSSE(onEvent?: (event: SSEEvent) => void) {
  const token = useAuthStore((state) => state.token);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const apiBaseUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
    const url = `${apiBaseUrl}/sse/notifications`;
    const es = new EventSource(url, {
      withCredentials: true,
    });

    es.onopen = () => {
      console.log("SSE connection established");
      setConnected(true);
      setError(null);
    };

    es.onerror = (err) => {
      console.error("SSE connection error:", err);
      setConnected(false);
      setError("Connection error");
    };

    // Handle connected event
    es.addEventListener("connected", (e) => {
      const data = JSON.parse(e.data);
      console.log("SSE connected:", data);
    });

    // Handle heartbeat
    es.addEventListener("heartbeat", (e) => {
      const data = JSON.parse(e.data);
      console.log("SSE heartbeat:", data.timestamp);
    });

    // Handle task.assigned
    es.addEventListener("task.assigned", (e) => {
      const data = JSON.parse(e.data);
      onEvent?.({ type: "task.assigned", data });
    });

    // Handle task.comment.mention
    es.addEventListener("task.comment.mention", (e) => {
      const data = JSON.parse(e.data);
      onEvent?.({ type: "task.comment.mention", data });
    });

    // Handle task.status_changed
    es.addEventListener("task.status_changed", (e) => {
      const data = JSON.parse(e.data);
      onEvent?.({ type: "task.status_changed", data });
    });

    // Handle task.due_soon
    es.addEventListener("task.due_soon", (e) => {
      const data = JSON.parse(e.data);
      onEvent?.({ type: "task.due_soon", data });
    });

    return () => {
      es.close();
      setConnected(false);
    };
  }, [token, onEvent]);

  return { connected, error };
}
