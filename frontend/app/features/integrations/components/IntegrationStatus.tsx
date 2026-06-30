/**
 * Integration Status Component
 * Displays integration health status and monitoring
 */

import { useState } from "react";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  DownloadIcon,
  PlugIcon,
  UploadIcon,
  ShieldIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useIntegrationHealth } from "~/features/integrations/hooks/useIntegrations";
import type { IntegrationType } from "~/features/integrations/types/integrations.types";

interface IntegrationStatusProps {
  integrationId: string;
  integrationName: string;
  integrationType: IntegrationType;
}

export function IntegrationStatus({
  integrationId,
  integrationName,
  integrationType: _integrationType,
}: IntegrationStatusProps) {
  const [timeRange, setTimeRange] = useState("24h");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const {
    data: healthResponse,
    isLoading,
    error,
    refetch,
  } = useIntegrationHealth(integrationId);

  const health = healthResponse?.data;
  const [historicalData] = useState<
    Array<{ timestamp: string; response_time_ms: number }>
  >([]);
  const latestResponseTime = historicalData.at(-1)?.response_time_ms;
  const firstResponseTime = historicalData[0]?.response_time_ms;

  const handleRefresh = () => {
    void refetch();
  };

  const getStatusColor = (status: string): string => {
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

  const getStatusBadge = (status: string): string => {
    switch (status) {
      case "healthy":
        return "bg-green-500 text-white";
      case "warning":
        return "bg-yellow-500 text-white";
      case "error":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return DownloadIcon;
      case "down":
        return UploadIcon;
      default:
        return PlugIcon;
    }
  };

  const formatResponseTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 1000000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 1000000).toFixed(2)}s`;
  };

  const formatUptime = (percentage: number): string => {
    return `${percentage.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <PageLayout title={`${integrationName} Status`} loading>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-20 bg-gray-200 rounded mb-4" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title={`${integrationName} Status`} error={error}>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Error loading health status</p>
          <Button onClick={handleRefresh}>Retry</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`${integrationName} Status`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {integrationName} Health Status
            </h3>
            <Badge className={getStatusBadge(health?.status || "unknown")}>
              {health?.status || "Unknown"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "text-blue-600" : "text-gray-600"}
            >
              {autoRefresh ? "Stop Auto Refresh" : "Start Auto Refresh"}
            </Button>

            <Button onClick={handleRefresh}>
              <HugeiconsIcon icon={DownloadIcon} size={16} className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div
                  className={`w-16 h-16 mx-auto rounded-full ${getStatusColor(health?.status || "unknown")}`}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    {health?.status === "healthy" && (
                      <HugeiconsIcon
                        icon={PlugIcon}
                        size={32}
                        className="text-white"
                      />
                    )}
                    {health?.status === "warning" && (
                      <HugeiconsIcon
                        icon={ShieldIcon}
                        size={32}
                        className="text-white"
                      />
                    )}
                    {health?.status === "error" && (
                      <HugeiconsIcon
                        icon={UploadIcon}
                        size={32}
                        className="text-white"
                      />
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-lg font-semibold text-gray-900">
                    {health?.status === "healthy"
                      ? "Healthy"
                      : health?.status === "warning"
                        ? "Warning"
                        : health?.status === "error"
                          ? "Error"
                          : "Unknown"}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-sm text-gray-600">Last Check</div>
                  <div className="text-sm font-medium text-gray-900">
                    {health?.last_check
                      ? new Date(health.last_check).toLocaleString()
                      : "Never checked"}
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="text-center">
                <div className="text-sm text-gray-600">Response Time</div>
                <div className="text-lg font-semibold text-gray-900">
                  {health?.response_time_ms
                    ? formatResponseTime(health.response_time_ms)
                    : "N/A"}
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm text-gray-600">Uptime</div>
                <div className="text-lg font-semibold text-gray-900">
                  {health?.uptime_percentage
                    ? formatUptime(health.uptime_percentage)
                    : "N/A"}
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm text-gray-600">Error Rate</div>
                <div className="text-lg font-semibold text-gray-900">
                  {health?.error_rate ? `${health.error_rate}%` : "0%"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        {health?.details && Object.keys(health.details).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Health Details</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded-lg border border-gray-300 overflow-x-auto text-sm">
                {JSON.stringify(health.details, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Historical Data */}
        <Card>
          <CardHeader>
            <CardTitle>Historical Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900">
                  Response Time Trend
                </h4>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800">
                    {latestResponseTime !== undefined &&
                    firstResponseTime !== undefined
                      ? latestResponseTime < firstResponseTime
                        ? "up"
                        : "down"
                      : "stable"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                {historicalData.slice(-5).map((data, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{new Date(data.timestamp).toLocaleString()}</span>
                    <span className="flex items-center gap-2">
                      <span>{formatResponseTime(data.response_time_ms)}</span>
                      {(() => {
                        const previousResponseTime =
                          historicalData[index - 1]?.response_time_ms;
                        if (previousResponseTime === undefined) {
                          return getTrendIcon("stable");
                        }
                        if (previousResponseTime < data.response_time_ms) {
                          return getTrendIcon("up");
                        }
                        if (previousResponseTime > data.response_time_ms) {
                          return getTrendIcon("down");
                        }
                        return getTrendIcon("stable");
                      })()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={handleRefresh}>
                <HugeiconsIcon icon={DownloadIcon} size={16} className="mr-2" />
                Refresh
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  window.open(`/integrations/${integrationId}/logs`, "_blank")
                }
              >
                View Logs
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  window.open(`/integrations/${integrationId}/events`, "_blank")
                }
              >
                View Events
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
