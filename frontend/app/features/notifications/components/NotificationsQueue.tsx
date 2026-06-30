/**
 * Notifications Queue Component
 * Displays notification queue entries
 */

import { useState } from "react";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  SearchIcon,
  DownloadIcon,
  UploadIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useNotificationQueue,
  useSendNotification,
} from "~/features/notifications/hooks/useNotifications";
import type {
  NotificationQueue,
  NotificationSendRequest,
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
  webhook: "outline",
  push: "outline",
};

export function NotificationsQueue() {
  const { t } = useTranslation();
  const sendNotification = useSendNotification();
  const {
    data: queueResponse,
    isLoading,
    error,
    refetch,
  } = useNotificationQueue() as {
    data: { data: NotificationQueue[] } | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };

  const queue: NotificationQueue[] = queueResponse?.data || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<string>("");

  const filteredQueue = queue.filter((item) => {
    const matchesSearch =
      item.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.recipient_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || item.status === statusFilter;
    const matchesChannel = !channelFilter || item.channel === channelFilter;
    return matchesSearch && matchesStatus && matchesChannel;
  });

  const handleResend = async (item: NotificationQueue) => {
    try {
      const resendData: NotificationSendRequest = {
        event_type: item.event_type,
        recipient_id: item.recipient_id,
        channels: [item.channel],
        data: item.data || {},
      };

      await sendNotification.mutateAsync(resendData);
      refetch();
    } catch (error) {
      console.error("Error resending notification:", error);
    }
  };

  if (isLoading) {
    return (
      <PageLayout title={t("notifications.tabs.queue")} loading>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4" />
          <div className="h-4 bg-muted rounded w-1/2 mb-2" />
          <div className="h-20 bg-muted rounded mb-4" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout
        title={t("notifications.tabs.queue")}
        error={error ?? undefined}
      >
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {t("notifications.queue.loadError")}
          </p>
          <Button onClick={() => refetch()}>
            {t("notifications.action.retry")}
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t("notifications.tabs.queue")}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <HugeiconsIcon
                icon={SearchIcon}
                size={16}
                className="absolute left-3 top-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder={t("notifications.filter.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 border rounded-lg focus:ring-2"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg focus:ring-2"
            >
              <option value="">{t("notifications.filter.allStatus")}</option>
              <option value="pending">
                {t("notifications.status.pending")}
              </option>
              <option value="sent">{t("notifications.status.sent")}</option>
              <option value="failed">{t("notifications.status.failed")}</option>
            </select>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="border rounded-lg focus:ring-2"
            >
              <option value="">{t("notifications.filter.allChannels")}</option>
              <option value="email">{t("notifications.channel.email")}</option>
              <option value="sms">{t("notifications.channel.sms")}</option>
              <option value="webhook">
                {t("notifications.channel.webhook")}
              </option>
            </select>
          </div>

          <Button onClick={() => refetch()}>
            <HugeiconsIcon icon={DownloadIcon} size={16} className="mr-2" />
            {t("notifications.common.refresh")}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("notifications.stats.total")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {queue.length}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("notifications.queue.totalDesc")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("notifications.stats.pending")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {queue.filter((q) => q.status === "pending").length}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("notifications.queue.pendingDesc")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("notifications.stats.sent")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {queue.filter((q) => q.status === "sent").length}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("notifications.queue.sentDesc")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("notifications.stats.failed")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                {queue.filter((q) => q.status === "failed").length}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("notifications.queue.failedDesc")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Queue List */}
        <Card>
          <CardHeader>
            <CardTitle>{t("notifications.tabs.queue")}</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredQueue.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {t("notifications.state.empty")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || statusFilter || channelFilter
                    ? t("notifications.state.noResults")
                    : t("notifications.state.empty")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQueue.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <Badge
                            variant={STATUS_VARIANT[item.status] ?? "outline"}
                          >
                            {t(`notifications.status.${item.status}`) ||
                              item.status}
                          </Badge>
                          <Badge
                            variant={CHANNEL_VARIANT[item.channel] ?? "outline"}
                          >
                            {t(`notifications.channel.${item.channel}`) ||
                              item.channel}
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <div className="font-medium text-foreground">
                            {t("notifications.field.event")}: {item.event_type}
                          </div>
                          <div>
                            {t("notifications.field.recipient")}:{" "}
                            {item.recipient_id}
                          </div>
                          <div>
                            {t("notifications.field.template")}:{" "}
                            {item.template_id ||
                              t("notifications.queue.noTemplate")}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `/notifications/queue/${item.id}`,
                              "_blank"
                            )
                          }
                        >
                          <HugeiconsIcon
                            icon={DownloadIcon}
                            size={16}
                            className="mr-2"
                          />
                          {t("notifications.queue.view")}
                        </Button>

                        {item.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResend(item)}
                          >
                            <HugeiconsIcon
                              icon={RefreshIcon}
                              size={16}
                              className="mr-2"
                            />
                            {t("notifications.queue.resend")}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <label className="font-medium text-foreground">
                          {t("notifications.field.created")}
                        </label>
                        <div className="flex items-center gap-2">
                          <HugeiconsIcon
                            icon={DownloadIcon}
                            size={16}
                            className="text-muted-foreground"
                          />
                          <span>
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="font-medium text-foreground">
                          {t("notifications.field.sent")}
                        </label>
                        <div className="flex items-center gap-2">
                          <HugeiconsIcon
                            icon={RefreshIcon}
                            size={16}
                            className="text-muted-foreground"
                          />
                          <span>
                            {item.sent_at
                              ? new Date(item.sent_at).toLocaleString()
                              : t("notifications.queue.notSentYet")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Error Message */}
                    {item.error_message && (
                      <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <HugeiconsIcon
                            icon={UploadIcon}
                            size={16}
                            className="text-destructive"
                          />
                          <span className="font-medium text-destructive">
                            {t("notifications.queue.errorMessage")}
                          </span>
                        </div>
                        <p className="text-sm text-destructive/80">
                          {item.error_message}
                        </p>
                      </div>
                    )}

                    {/* Data Preview */}
                    {item.data && Object.keys(item.data).length > 0 && (
                      <div className="mt-4 p-3 bg-muted border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <HugeiconsIcon
                            icon={DownloadIcon}
                            size={16}
                            className="text-muted-foreground"
                          />
                          <span className="font-medium text-foreground">
                            {t("notifications.queue.dataPreview")}
                          </span>
                        </div>
                        <pre className="text-sm text-muted-foreground bg-background p-2 rounded border overflow-x-auto">
                          {JSON.stringify(item.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
