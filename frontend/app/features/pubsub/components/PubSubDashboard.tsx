/**
 * PubSub Dashboard component
 * Main dashboard for PubSub monitoring and management
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { DataTable, type DataTableColumn } from "~/components/common/DataTable";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { EmptyState } from "~/components/common/EmptyState";
import { LoadingState } from "~/components/common/LoadingState";
import { ErrorState } from "~/components/common/ErrorState";
import {
  usePubSubStats,
  usePubSubHealth,
  usePubSubMetrics,
  usePubSubStreams,
  useDeletePubSubStream,
  useClearPubSubStream,
  useTrimPubSubStream,
  useResetPubSubStats,
} from "../hooks/usePubSub";
import type { PubSubStream } from "../types/pubsub.types";

interface PubSubDashboardProps {
  onStreamView?: (stream: PubSubStream) => void;
}

export function PubSubDashboard({ onStreamView }: PubSubDashboardProps) {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState("overview");

  // Queries
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = usePubSubStats();
  const { data: health, isLoading: healthLoading } = usePubSubHealth();
  const { data: metrics, isLoading: metricsLoading } = usePubSubMetrics();
  const {
    data: streams,
    isLoading: streamsLoading,
    error: streamsError,
    refetch: refetchStreams,
  } = usePubSubStreams();

  const deleteStreamMutation = useDeletePubSubStream();
  const clearStreamMutation = useClearPubSubStream();
  const trimStreamMutation = useTrimPubSubStream();
  const resetStatsMutation = useResetPubSubStats();

  const handleDeleteStream = async (streamName: string) => {
    try {
      await deleteStreamMutation.mutateAsync(streamName);
      refetchStreams();
    } catch (error) {
      console.error("Failed to delete stream:", error);
    }
  };

  const handleClearStream = async (streamName: string) => {
    try {
      await clearStreamMutation.mutateAsync(streamName);
      refetchStreams();
    } catch (error) {
      console.error("Failed to clear stream:", error);
    }
  };

  const handleTrimStream = async (streamName: string) => {
    try {
      await trimStreamMutation.mutateAsync({
        name: streamName,
        strategy: "maxlen",
        threshold: 1000,
      });
      refetchStreams();
    } catch (error) {
      console.error("Failed to trim stream:", error);
    }
  };

  const handleResetStats = async () => {
    try {
      await resetStatsMutation.mutateAsync();
    } catch (error) {
      console.error("Failed to reset stats:", error);
    }
  };

  // Overview stats
  const renderOverview = () => {
    if (statsLoading || healthLoading || metricsLoading) {
      return <LoadingState />;
    }

    if (statsError || streamsError) {
      return <ErrorState message={t("pubsub.error.loading")} />;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("pubsub.stats.totalStreams")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.data?.total_streams || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("pubsub.stats.totalGroups")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.data?.total_groups || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("pubsub.stats.totalPending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.data?.total_pending || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("pubsub.health.status")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                health?.data?.status === "healthy"
                  ? "default"
                  : health?.data?.status === "degraded"
                    ? "secondary"
                    : "destructive"
              }
            >
              {health?.data?.status || "unknown"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("pubsub.metrics.messagesPerSecond")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.data?.messages_per_second || 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {t("pubsub.metrics.totalProcessed")}:{" "}
              {metrics?.data?.messages_processed_total || 0}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Streams table
  const renderStreams = () => {
    if (streamsLoading) {
      return <LoadingState />;
    }

    if (streamsError) {
      return <ErrorState message={t("pubsub.error.loading")} />;
    }

    const streamsList = streams?.data || [];

    if (streamsList.length === 0) {
      return (
        <EmptyState
          title={t("pubsub.streams.empty.title")}
          description={t("pubsub.streams.empty.description")}
        />
      );
    }

    const columns = [
      {
        key: "name",
        header: t("pubsub.streams.table.name"),
        cell: (stream: PubSubStream) => (
          <div>
            <div className="font-medium">{stream.name}</div>
            <div className="text-sm text-gray-500">
              {stream.length} messages
            </div>
          </div>
        ),
      },
      {
        key: "groups",
        header: t("pubsub.streams.table.groups"),
        cell: (stream: PubSubStream) => (
          <Badge variant="secondary">{stream.groups}</Badge>
        ),
      },
      {
        key: "pending",
        header: t("pubsub.streams.table.pending"),
        cell: (stream: PubSubStream) => (
          <Badge variant={stream.pending > 0 ? "destructive" : "secondary"}>
            {stream.pending}
          </Badge>
        ),
      },
      {
        key: "last_read",
        header: t("pubsub.streams.table.lastRead"),
        cell: (stream: PubSubStream) => (
          <div className="text-sm">
            {stream.last_read
              ? new Date(stream.last_read).toLocaleString()
              : "-"}
          </div>
        ),
      },
      {
        key: "actions",
        header: t("pubsub.streams.table.actions"),
        cell: (stream: PubSubStream) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStreamView?.(stream)}
            >
              {t("common.view")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTrimStream(stream.name)}
              disabled={trimStreamMutation.isPending}
            >
              {t("pubsub.streams.trim")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleClearStream(stream.name)}
              disabled={clearStreamMutation.isPending}
              className="text-orange-600 hover:text-orange-700"
            >
              {t("pubsub.streams.clear")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteStream(stream.name)}
              disabled={deleteStreamMutation.isPending}
              className="text-red-600 hover:text-red-700"
            >
              {t("common.delete")}
            </Button>
          </div>
        ),
      },
    ] as DataTableColumn<PubSubStream>[];

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("pubsub.streams.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable data={streamsList} columns={columns} />
        </CardContent>
      </Card>
    );
  };

  // Redis info
  const renderRedisInfo = () => {
    if (statsLoading) {
      return <LoadingState />;
    }

    if (statsError) {
      return <ErrorState message={t("pubsub.error.loading")} />;
    }

    const redisInfo = stats?.data?.redis_info;

    if (!redisInfo) {
      return (
        <EmptyState
          title={t("pubsub.redis.empty.title")}
          description={t("pubsub.redis.empty.description")}
        />
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("pubsub.redis.info")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">{t("pubsub.redis.version")}</h4>
                <p className="text-sm text-gray-600">{redisInfo.version}</p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.redis.usedMemory")}</h4>
                <p className="text-sm text-gray-600">{redisInfo.used_memory}</p>
              </div>
              <div>
                <h4 className="font-medium">
                  {t("pubsub.redis.connectedClients")}
                </h4>
                <p className="text-sm text-gray-600">
                  {redisInfo.connected_clients}
                </p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.redis.uptime")}</h4>
                <p className="text-sm text-gray-600">
                  {Math.floor(redisInfo.uptime_in_seconds / 3600)}h{" "}
                  {Math.floor((redisInfo.uptime_in_seconds % 3600) / 60)}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("pubsub.actions.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleResetStats}
                disabled={resetStatsMutation.isPending}
              >
                {t("pubsub.actions.resetStats")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("pubsub.title")}</h1>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            {t("pubsub.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="streams">{t("pubsub.tabs.streams")}</TabsTrigger>
          <TabsTrigger value="redis">{t("pubsub.tabs.redis")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="streams" className="space-y-6">
          {renderStreams()}
        </TabsContent>

        <TabsContent value="redis" className="space-y-6">
          {renderRedisInfo()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
