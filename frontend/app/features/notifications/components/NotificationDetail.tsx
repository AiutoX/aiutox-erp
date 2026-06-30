/**
 * Notification Detail Component
 * Displays detailed information about a single notification
 */

import { useParams, useNavigate } from "react-router-dom";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  ArrowLeftIcon,
  DownloadIcon,
  RefreshIcon,
  DeleteIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { NotificationQueue } from "~/features/notifications/types/notifications.types";

export function NotificationDetail() {
  const params = useParams();
  const id = params.id as string;
  const navigate = useNavigate();
  // const { data: notificationResponse, isLoading, error } = useNotification(id);
  const isLoading = false;
  const error = null;
  const notification = {
    id,
    event_type: "Test",
    recipient_id: "test@test.com",
    channel: "email",
    status: "pending",
    created_at: new Date().toISOString(),
  } as unknown as NotificationQueue;

  const getStatusBadge = (status: string): string => {
    switch (status) {
      case "pending":
        return "bg-yellow-500 text-white";
      case "sent":
        return "bg-green-500 text-white";
      case "failed":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getChannelColor = (channel: string): string => {
    switch (channel) {
      case "email":
        return "bg-blue-100 text-blue-800";
      case "sms":
        return "bg-purple-100 text-purple-800";
      case "webhook":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleCopyData = () => {
    if (notification?.data) {
      navigator.clipboard.writeText(JSON.stringify(notification.data, null, 2));
    }
  };

  const handleRetry = async () => {
    // This would be implemented with the retry hook
    console.log("Retry notification:", notification?.id);
  };

  const handleResend = async () => {
    // This would be implemented with the send hook
    console.log("Resend notification:", notification?.id);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this notification?")) {
      // This would be implemented with the delete hook
      console.log("Delete notification:", notification?.id);
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Notification Detail" loading>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-20 bg-gray-200 rounded mb-4" />
        </div>
      </PageLayout>
    );
  }

  if (error || !notification) {
    return (
      <PageLayout
        title="Notification Detail"
        error={error || "Notification not found"}
      >
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Notification not found</p>
          <Button onClick={() => void navigate("/notifications/queue")}>
            Back to Queue
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`Notification: ${notification.event_type}`}
      breadcrumb={[
        { label: "Notifications", href: "/notifications/queue" },
        { label: notification.event_type },
      ]}
    >
      <div className="space-y-6">
        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => void navigate("/notifications/queue")}
          >
            <HugeiconsIcon icon={ArrowLeftIcon} size={16} className="mr-2" />
            Back to Queue
          </Button>

          {notification.status === "failed" && (
            <Button onClick={() => void handleRetry()}>
              <HugeiconsIcon icon={DownloadIcon} size={16} className="mr-2" />
              Retry
            </Button>
          )}

          {notification.status === "failed" && (
            <Button onClick={() => void handleResend()}>
              <HugeiconsIcon icon={RefreshIcon} size={16} className="mr-2" />
              Resend
            </Button>
          )}

          <Button variant="outline" onClick={() => void handleDelete()}>
            <HugeiconsIcon icon={DeleteIcon} size={16} className="mr-2" />
            Delete
          </Button>
        </div>

        {/* Main Information */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Event Type
                </label>
                <div className="text-lg font-semibold text-gray-900">
                  {notification.event_type}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Recipient
                </label>
                <div className="text-lg font-semibold text-gray-900">
                  {notification.recipient_id}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Channel
                </label>
                <div className="flex items-center gap-2">
                  <Badge className={getChannelColor(notification.channel)}>
                    {notification.channel}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusBadge(notification.status)}>
                    {notification.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Template
                </label>
                <div className="text-lg font-semibold text-gray-900">
                  {notification.template_id || "No template"}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Created
                </label>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={DownloadIcon}
                    size={16}
                    className="text-gray-400"
                  />
                  <span>
                    {new Date(notification.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Sent
                </label>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={RefreshIcon}
                    size={16}
                    className="text-gray-400"
                  />
                  <span>
                    {notification.sent_at
                      ? new Date(notification.sent_at).toLocaleString()
                      : "Not sent yet"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Data */}
        {notification.data && Object.keys(notification.data).length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notification Data</CardTitle>
                <Button variant="outline" size="sm" onClick={handleCopyData}>
                  <HugeiconsIcon
                    icon={DownloadIcon}
                    size={16}
                    className="mr-2"
                  />
                  Copy JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto text-sm">
                {JSON.stringify(notification.data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Error Information */}
        {notification.error_message && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Error Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HugeiconsIcon
                    icon={DeleteIcon}
                    size={16}
                    className="text-red-500"
                  />
                  <span className="font-medium text-red-800">
                    Error Message
                  </span>
                </div>
                <p className="text-red-700 whitespace-pre-wrap">
                  {notification.error_message}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Notification ID:
                </span>
                <span className="text-sm text-gray-900 font-mono">
                  {notification.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Tenant ID:
                </span>
                <span className="text-sm text-gray-900 font-mono">
                  {notification.tenant_id}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
