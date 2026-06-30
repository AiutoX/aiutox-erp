/**
 * Notifications Center page
 * Real-time notification management hub
 */

import { useState, useMemo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useNotificationsWebSocket } from "~/features/notifications/hooks/useNotificationsWebSocket";
import { useNotificationQueue } from "~/features/notifications/hooks/useNotifications";
import { TemplateManager } from "~/features/notifications/components/TemplateManager";
import { NotificationPreferencesPanel } from "~/features/preferences/components/NotificationPreferencesPanel";
import type {
  NotificationQueue,
  NotificationQueueListResponse,
} from "~/features/notifications/types/notifications.types";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: "secondary",
  sent: "default",
  failed: "destructive",
};

const CHANNEL_VARIANT: Record<string, BadgeVariant> = {
  email: "default",
  sms: "secondary",
  "in-app": "outline",
  webhook: "secondary",
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // WebSocket real-time connection
  const {
    isConnected,
    notifications: wsNotifications,
    error: wsError,
    reconnect,
  } = useNotificationsWebSocket({
    enabled: true,
  });

  // Fallback to API for initial load
  const { data: apiNotificationsRaw, isLoading } = useNotificationQueue();
  const apiNotifications = apiNotificationsRaw as
    | NotificationQueueListResponse
    | undefined;

  // Merge WebSocket and API notifications (prefer WebSocket for recent)
  const allNotifications = useMemo(() => {
    const wsIds = new Set(wsNotifications.map((n) => n.id));
    const merged = [
      ...wsNotifications,
      ...(apiNotifications?.data || []).filter((n) => !wsIds.has(n.id)),
    ];
    return merged;
  }, [wsNotifications, apiNotifications]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return allNotifications.filter((notification) => {
      const matchesSearch =
        notification.event_type
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        notification.recipient_id
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesChannel =
        filterChannel === "all" || notification.channel === filterChannel;
      const matchesStatus =
        filterStatus === "all" || notification.status === filterStatus;

      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [allNotifications, searchTerm, filterChannel, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: allNotifications.length,
      pending: allNotifications.filter((n) => n.status === "pending").length,
      sent: allNotifications.filter((n) => n.status === "sent").length,
      failed: allNotifications.filter((n) => n.status === "failed").length,
    };
  }, [allNotifications]);

  return (
    <PageLayout
      title={t("notifications.title")}
      description={t("notifications.description")}
    >
      <div className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg border">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-primary" : "bg-destructive"
              }`}
            />
            <span className="text-sm font-medium">
              {isConnected
                ? t("notifications.status.connected")
                : t("notifications.status.disconnected")}
            </span>
          </div>
          {!isConnected && (
            <Button size="sm" variant="outline" onClick={reconnect}>
              {t("notifications.action.reconnect")}
            </Button>
          )}
          {wsError && (
            <span className="text-sm text-destructive">{wsError.message}</span>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {t("notifications.stats.total")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {t("notifications.stats.pending")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {stats.pending}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {t("notifications.stats.sent")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {t("notifications.stats.failed")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats.failed}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="queue" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="queue">
              {t("notifications.tabs.queue")}
            </TabsTrigger>
            <TabsTrigger value="templates">
              {t("notifications.tabs.templates")}
            </TabsTrigger>
            <TabsTrigger value="preferences">
              {t("notifications.tabs.preferences")}
            </TabsTrigger>
          </TabsList>

          {/* Queue Tab */}
          <TabsContent value="queue" className="space-y-4 mt-6">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder={t("notifications.filter.search")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={filterChannel} onValueChange={setFilterChannel}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("notifications.filter.allChannels")}
                  </SelectItem>
                  <SelectItem value="email">
                    {t("notifications.channel.email")}
                  </SelectItem>
                  <SelectItem value="sms">
                    {t("notifications.channel.sms")}
                  </SelectItem>
                  <SelectItem value="in-app">
                    {t("notifications.channel.inApp")}
                  </SelectItem>
                  <SelectItem value="webhook">
                    {t("notifications.channel.webhook")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("notifications.filter.allStatus")}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t("notifications.status.pending")}
                  </SelectItem>
                  <SelectItem value="sent">
                    {t("notifications.status.sent")}
                  </SelectItem>
                  <SelectItem value="failed">
                    {t("notifications.status.failed")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notifications List */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("notifications.state.loading")}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("notifications.state.empty")}
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <TemplateManager />
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="mt-6">
            <NotificationPreferencesPanel />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}

interface NotificationItemProps {
  notification: NotificationQueue;
}

function NotificationItem({ notification }: NotificationItemProps) {
  const { t } = useTranslation();
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={CHANNEL_VARIANT[notification.channel] ?? "outline"}
              >
                {notification.channel}
              </Badge>
              <Badge variant={STATUS_VARIANT[notification.status] ?? "outline"}>
                {notification.status}
              </Badge>
            </div>

            <div>
              <p className="font-medium">{notification.event_type}</p>
              <p className="text-sm text-muted-foreground">
                {t("notifications.field.recipient")}:{" "}
                {notification.recipient_id}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              {t("notifications.field.created")}:{" "}
              {formatDate(notification.created_at)}
            </p>

            {notification.error_message && (
              <p className="text-sm text-destructive mt-2">
                {t("notifications.field.error")}: {notification.error_message}
              </p>
            )}
          </div>

          {notification.sent_at && (
            <div className="text-right text-xs text-muted-foreground">
              <p>{t("notifications.field.sent")}</p>
              <p>{formatDate(notification.sent_at)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
