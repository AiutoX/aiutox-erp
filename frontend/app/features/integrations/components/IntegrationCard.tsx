/**
 * Integration Card Component
 * Displays a single integration with status and actions
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  DownloadIcon,
  UploadIcon,
  PlugIcon,
  ShieldIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useIntegrationHealth,
  useIntegrationLogs,
  useIntegrationEvents,
} from "~/features/integrations/hooks/useIntegrations";
import type {
  Integration,
  IntegrationEvent,
  IntegrationEventListResponse,
} from "~/features/integrations/types/integrations.types";

interface IntegrationCardProps {
  integration: Integration;
  onAction?: (integrationId: string, action: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function IntegrationCard({
  integration,
  onAction,
  showActions = true,
  compact = false,
}: IntegrationCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: healthResponse } = useIntegrationHealth(integration.id);
  const { data: logsResponse } = useIntegrationLogs(integration.id);
  const { data: eventsResponse } = useIntegrationEvents(integration.id) as {
    data: IntegrationEventListResponse | undefined;
  };

  const health = healthResponse?.data;
  const logs = logsResponse?.data || [];
  const events = eventsResponse?.data || [];

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (status: string): string => {
    switch (status) {
      case "active":
        return "bg-green-500 text-white";
      case "inactive":
        return "bg-gray-500 text-white";
      case "error":
        return "bg-red-500 text-white";
      case "pending":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case "stripe":
        return "bg-purple-100 text-purple-800";
      case "twilio":
        return "bg-blue-100 text-blue-800";
      case "google-calendar":
        return "bg-orange-100 text-orange-800";
      case "slack":
        return "bg-pink-100 text-pink-800";
      case "zapier":
        return "bg-green-100 text-green-800";
      case "webhook":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case "stripe":
        return "💳";
      case "twilio":
        return "📱";
      case "google-calendar":
        return "📅";
      case "slack":
        return "💬";
      case "zapier":
        return "⚡";
      case "webhook":
        return "🔗";
      default:
        return "🔌";
    }
  };

  const getHealthColor = (status: string): string => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleAction = (action: string) => {
    if (onAction) {
      onAction(integration.id, action);
    }
  };

  if (compact) {
    return (
      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-lg mr-2">
              {getTypeIcon(integration.type)}
            </span>
            <span className="font-medium text-gray-900">
              {integration.name}
            </span>
          </div>
          <Badge className={getStatusBadge(integration.status)}>
            {integration.status}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <span className="text-2xl mr-2">
                {getTypeIcon(integration.type)}
              </span>
              <CardTitle className="text-lg">{integration.name}</CardTitle>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={getTypeColor(integration.type)}>
                {integration.type}
              </Badge>
              <Badge className={getStatusBadge(integration.status)}>
                {integration.status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? "Hide Details" : "Show Details"}
            </Button>

            {showActions && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "Collapse" : "Expand"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="font-medium text-gray-900">
                {integration.type}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span
                className={`font-medium ${getStatusColor(integration.status)}`}
              >
                {integration.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Sync:</span>
              <span className="font-medium text-gray-900">
                {integration.last_sync_at
                  ? new Date(integration.last_sync_at).toLocaleString()
                  : "Never synced"}
              </span>
            </div>
          </div>

          {integration.error_message && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <HugeiconsIcon
                  icon={DownloadIcon}
                  size={16}
                  className="text-red-500"
                />
                <span className="font-medium text-red-800">Error Message</span>
              </div>
              <p className="text-sm text-red-700">
                {integration.error_message}
              </p>
            </div>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <>
            <Separator />

            {/* Health Status */}
            {health && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Health Status</h4>
                  <div className="flex items-center gap-2">
                    <Badge className={getHealthColor(health.status)}>
                      {health.status}
                    </Badge>
                    {health.uptime_percentage && (
                      <span className="text-sm text-gray-600">
                        Uptime: {health.uptime_percentage}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Last Check:</span>
                    <span>
                      {health.last_check
                        ? new Date(health.last_check).toLocaleString()
                        : "Never checked"}
                    </span>
                  </div>
                  {health.response_time_ms && (
                    <div className="flex justify-between">
                      <span>Response Time:</span>
                      <span>{health.response_time_ms}ms</span>
                    </div>
                  )}
                  {health.error_rate && (
                    <div className="flex justify-between">
                      <span>Error Rate:</span>
                      <span>{health.error_rate}%</span>
                    </div>
                  )}
                </div>

                {health.details && Object.keys(health.details).length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium text-gray-900">Details:</span>
                    <pre className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-300 overflow-x-auto">
                      {JSON.stringify(health.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Recent Logs */}
            {logs.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Recent Logs</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `/integrations/${integration.id}/logs`,
                        "_blank"
                      )
                    }
                  >
                    View All Logs
                  </Button>
                </div>

                <div className="space-y-2">
                  {logs.slice(0, 3).map((log) => (
                    <div
                      key={log.id}
                      className="border-l-4 border-gray-200 pl-4 py-2"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            log.level === "error"
                              ? "bg-red-500"
                              : log.level === "warn"
                                ? "bg-yellow-500"
                                : log.level === "info"
                                  ? "bg-blue-500"
                                  : "bg-gray-500"
                          }`}
                        />
                        <div>
                          <span className="font-medium text-gray-900">
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-600 ml-2">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700">{log.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Events */}
            {events.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Recent Events</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `/integrations/${integration.id}/events`,
                        "_blank"
                      )
                    }
                  >
                    View All Events
                  </Button>
                </div>

                <div className="space-y-2">
                  {events.slice(0, 3).map((event: IntegrationEvent) => (
                    <div
                      key={event.id}
                      className="border-l-4 border-gray-200 pl-4 py-2"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            event.processed ? "bg-green-500" : "bg-gray-500"
                          }`}
                        />
                        <div>
                          <span className="font-medium text-gray-900">
                            {event.event_type}
                          </span>
                          <span className="text-sm text-gray-600 ml-2">
                            {new Date(event.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700">
                        {event.data
                          ? JSON.stringify(event.data, null, 2)
                          : "No data"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        {showActions && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("view")}
              >
                <HugeiconsIcon icon={DownloadIcon} size={16} className="mr-2" />
                View Details
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("edit")}
              >
                <HugeiconsIcon icon={UploadIcon} size={16} className="mr-2" />
                Edit
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("config")}
              >
                <HugeiconsIcon icon={ShieldIcon} size={16} className="mr-2" />
                Configure
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("test")}
              >
                <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
                Test Connection
              </Button>

              {integration.status === "inactive" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction("activate")}
                  className="text-green-600 hover:text-green-700"
                >
                  <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
                  Activate
                </Button>
              )}

              {integration.status === "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction("deactivate")}
                  className="text-yellow-600 hover:text-yellow-700"
                >
                  <HugeiconsIcon icon={UploadIcon} size={16} className="mr-2" />
                  Deactivate
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("delete")}
                className="text-red-600 hover:text-red-700"
              >
                <HugeiconsIcon icon={DownloadIcon} size={16} className="mr-2" />
                Delete
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
