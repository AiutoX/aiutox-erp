/**
 * Notification Stream Component
 * Real-time notification stream with SSE
 */

import { useState, useEffect, useRef } from "react";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  PlugIcon,
  DownloadIcon,
  UploadIcon,
  ShieldIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { NotificationQueue } from "~/features/notifications/types/notifications.types";

interface NotificationStreamProps {
  autoConnect?: boolean;
}

export function NotificationStream({
  autoConnect = false,
}: NotificationStreamProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [notifications, setNotifications] = useState<NotificationQueue[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("disconnected");
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    pending: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const notificationsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoConnect) {
      handleConnect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  const handleConnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/v1/notifications/stream");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setConnectionStatus("connected");
      console.log("Connected to notification stream");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "notification":
            setNotifications((prev) => [data.payload, ...prev].slice(0, 100)); // Keep last 100
            updateStats(data.payload);
            break;
          case "status":
            setConnectionStatus(data.status);
            break;
          case "error":
            setConnectionStatus("error");
            console.error("Stream error:", data.error);
            break;
        }
      } catch (error) {
        console.error("Error parsing stream data:", error);
      }
    };

    eventSource.onerror = (error) => {
      setIsConnected(false);
      setConnectionStatus("error");
      console.error("Stream connection error:", error);
    };
  };

  const handleDisconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsPaused(false);
    setConnectionStatus("disconnected");
  };

  const handlePause = () => {
    setIsPaused(true);
    setConnectionStatus("paused");
  };

  const handleResume = () => {
    setIsPaused(false);
    setConnectionStatus("connected");
  };

  const handleClear = () => {
    setNotifications([]);
  };

  const updateStats = (notification: NotificationQueue) => {
    setStats((prev) => {
      const newStats = { ...prev };
      newStats.total += 1;

      switch (notification.status) {
        case "sent":
          newStats.success += 1;
          break;
        case "failed":
          newStats.failed += 1;
          break;
        case "pending":
          newStats.pending += 1;
          break;
      }

      return newStats;
    });
  };

  const scrollToBottom = () => {
    if (notificationsEndRef.current) {
      notificationsEndRef.current.scrollTop =
        notificationsEndRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [notifications]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800";
      case "disconnected":
        return "bg-gray-100 text-gray-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getNotificationStatusColor = (status: string): string => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <PageLayout title="Notification Stream">
      <div className="space-y-6">
        {/* Connection Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Stream Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge className={getStatusColor(connectionStatus)}>
                  {connectionStatus}
                </Badge>

                {isConnected && (
                  <span className="text-sm text-gray-600">
                    {isPaused ? "(Paused)" : "(Active)"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isConnected && (
                  <Button onClick={handleConnect}>
                    <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
                    Connect
                  </Button>
                )}

                {isConnected && !isPaused && (
                  <Button onClick={handlePause}>
                    <HugeiconsIcon
                      icon={UploadIcon}
                      size={16}
                      className="mr-2"
                    />
                    Pause
                  </Button>
                )}

                {isConnected && isPaused && (
                  <Button onClick={handleResume}>
                    <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
                    Resume
                  </Button>
                )}

                {isConnected && (
                  <Button variant="outline" onClick={handleDisconnect}>
                    <HugeiconsIcon
                      icon={DownloadIcon}
                      size={16}
                      className="mr-2"
                    />
                    Disconnect
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Stream Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {stats.total}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.success}
                </div>
                <div className="text-sm text-gray-600">Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.failed}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.pending}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stream Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Live Stream</CardTitle>
              <div className="flex items-center gap-2">
                <Button onClick={handleClear} variant="outline" size="sm">
                  Clear
                </Button>
                <Button onClick={scrollToBottom} variant="outline" size="sm">
                  <HugeiconsIcon
                    icon={DownloadIcon}
                    size={16}
                    className="mr-2"
                  />
                  Scroll to Bottom
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={notificationsEndRef}
              className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              {notifications.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <HugeiconsIcon
                    icon={ShieldIcon}
                    size={48}
                    className="mx-auto mb-4 text-gray-300"
                  />
                  <p>No notifications in stream</p>
                  <p className="text-sm text-gray-400">
                    {isConnected
                      ? "Waiting for notifications..."
                      : "Connect to start streaming"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification, index) => (
                    <div
                      key={`${notification.id}-${index}`}
                      className="border-l-4 border-gray-300 pl-4"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {notification.event_type}
                            </span>
                            <Badge
                              className={getNotificationStatusColor(
                                notification.status
                              )}
                            >
                              {notification.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            {notification.recipient_id} • {notification.channel}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(
                            notification.created_at
                          ).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Connection Info */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Status:</span>
                <Badge className={getStatusColor(connectionStatus)}>
                  {connectionStatus}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">
                  Connection URL:
                </span>
                <span className="font-mono text-gray-600">
                  /api/v1/notifications/stream
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Protocol:</span>
                <span className="text-gray-600">Server-Sent Events (SSE)</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">
                  Auto-reconnect:
                </span>
                <span className="text-gray-600">No</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
