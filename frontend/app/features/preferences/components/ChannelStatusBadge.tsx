/**
 * ChannelStatusBadge — shows connected / not configured for a notification channel
 */

import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { NotificationChannel } from "../types/preferences.types";

interface ChannelStatusBadgeProps {
  channel: NotificationChannel;
  connected: boolean;
  className?: string;
}

export function ChannelStatusBadge({
  channel,
  connected,
  className,
}: ChannelStatusBadgeProps) {
  const { t } = useTranslation();

  const label = connected
    ? t(`preferences.channelStatus.${channel}Connected`) ||
      t("preferences.channelStatus.connected")
    : t(`preferences.channelStatus.${channel}Disconnected`) ||
      t("preferences.channelStatus.disconnected");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        connected
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
        className
      )}
    >
      {connected ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}
