import { useState, useRef, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlugIcon } from "@hugeicons/core-free-icons";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { useNotificationStream } from "~/hooks/useNotificationStream";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { cn } from "~/lib/utils";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, isConnected, unreadCount, clearNotifications } =
    useNotificationStream({
      enabled: true,
    });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("notifications.justNow");
    if (diffMins < 60) return `${diffMins} ${t("notifications.minutesAgo")}`;
    if (diffHours < 24) return `${diffHours} ${t("notifications.hoursAgo")}`;
    if (diffDays < 7) return `${diffDays} ${t("notifications.daysAgo")}`;
    return date.toLocaleDateString(language === "en" ? "en-US" : "es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getChannelLabel = (channel: string): string => {
    const channelMap: Record<string, string> = {
      email: t("notifications.channels.email"),
      sms: t("notifications.channels.sms"),
      webhook: t("notifications.channels.webhook"),
      "in-app": t("notifications.channels.inApp"),
    };
    return channelMap[channel] || channel;
  };

  const getStatusBadgeVariant = (
    status: string
  ): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "sent":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        className="relative p-2 rounded-md hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
        aria-label={t("notifications.title")}
        onClick={() => setIsOpen(!isOpen)}
      >
        <HugeiconsIcon
          icon={PlugIcon}
          size={20}
          color="hsl(var(--foreground))"
          strokeWidth={1.5}
        />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            variant="destructive"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
        {!isConnected && (
          <span
            className="absolute top-0 right-0 h-2 w-2 bg-[hsl(var(--warning))] rounded-full"
            title={t("notifications.disconnected")}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-popover text-popover-foreground rounded-lg shadow-lg border border-border z-50 max-h-[600px] flex flex-col">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {t("notifications.title")}
                </CardTitle>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearNotifications}
                    className="text-xs"
                  >
                    {t("notifications.markAllRead")}
                  </Button>
                )}
              </div>
              {!isConnected && (
                <CardDescription className="text-[hsl(var(--warning))] text-xs">
                  {t("notifications.disconnected")}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[500px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>{t("notifications.noNotifications")}</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 hover:bg-accent/40 transition-colors cursor-pointer"
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={getStatusBadgeVariant(
                                notification.status
                              )}
                              className="text-xs"
                            >
                              {getChannelLabel(notification.channel)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {notification.event_type}
                          </p>
                          {notification.data && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {JSON.stringify(notification.data)}
                            </p>
                          )}
                          {notification.error_message && (
                            <p className="text-xs text-destructive mt-1">
                              {notification.error_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
