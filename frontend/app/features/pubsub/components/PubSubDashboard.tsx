/**
 * PubSub Dashboard component
 * Single-screen admin view backed by the 5 real endpoints exposed by
 * backend/app/api/v1/pubsub.py: stats, failed events + reprocess, stream
 * info, and pending messages for a consumer group.
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { EmptyState } from "~/components/common/EmptyState";
import { LoadingState } from "~/components/common/LoadingState";
import { ErrorState } from "~/components/common/ErrorState";
import { useHasPermission } from "~/hooks/usePermissions";
import {
  usePubSubStats,
  usePubSubFailedEvents,
  useReprocessPubSubFailedEvent,
  usePubSubStreamInfo,
  usePubSubPending,
} from "../hooks/usePubSub";

export function PubSubDashboard() {
  const { t } = useTranslation();
  const canManage = useHasPermission("pubsub.manage");
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = usePubSubStats();

  const {
    data: failedEvents,
    isLoading: failedLoading,
    error: failedError,
  } = usePubSubFailedEvents();

  const reprocessMutation = useReprocessPubSubFailedEvent();

  const {
    data: streamInfo,
    isLoading: streamInfoLoading,
    error: streamInfoError,
  } = usePubSubStreamInfo(selectedStream ?? "");

  const {
    data: pending,
    isLoading: pendingLoading,
    error: pendingError,
  } = usePubSubPending(selectedStream ?? "", selectedGroup ?? "");

  const handleReprocess = async (messageId: string) => {
    try {
      await reprocessMutation.mutateAsync(messageId);
    } catch (error) {
      console.error("Failed to reprocess event:", error);
    }
  };

  const streamNames = Object.keys(stats?.data?.streams ?? {});

  // Overview tab
  const renderOverview = () => {
    if (statsLoading) {
      return <LoadingState />;
    }

    if (statsError) {
      return <ErrorState message={t("pubsub.error.loading")} />;
    }

    const streams = stats?.data?.streams ?? {};
    const totalPending = stats?.data?.total_pending ?? 0;
    const totalGroups = Object.values(streams).reduce(
      (sum, s) => sum + s.groups.length,
      0
    );

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("pubsub.stats.totalStreams")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(streams).length}
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
            <div className="text-2xl font-bold">{totalGroups}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("pubsub.stats.totalPending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={totalPending > 0 ? "destructive" : "secondary"}>
              {totalPending}
            </Badge>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("pubsub.streams.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(streams).length === 0 ? (
              <EmptyState
                title={t("pubsub.streams.empty.title")}
                description={t("pubsub.streams.empty.description")}
              />
            ) : (
              <div className="space-y-4">
                {Object.entries(streams).map(([name, info]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between border rounded p-3"
                  >
                    <div>
                      <div className="font-medium">{name}</div>
                      <div className="text-sm text-gray-500">
                        {info.length} {t("pubsub.stream.length")} ·{" "}
                        {info.groups.length} {t("pubsub.stream.groups")}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedStream(name);
                        setSelectedTab("streams");
                      }}
                    >
                      {t("common.view")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Failed events tab
  const renderFailedEvents = () => {
    if (failedLoading) {
      return <LoadingState />;
    }

    if (failedError) {
      return <ErrorState message={t("pubsub.error.loading")} />;
    }

    const events = failedEvents?.data ?? [];

    if (events.length === 0) {
      return (
        <EmptyState
          title={t("pubsub.failed.empty.title")}
          description={t("pubsub.failed.empty.description")}
        />
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("pubsub.failed.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.message_id}
                className="flex items-center justify-between border rounded p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm">{event.message_id}</div>
                  <div className="text-sm text-gray-500 truncate">
                    {t("pubsub.failed.originalStream")}:{" "}
                    {String(event.original_stream ?? "-")}
                  </div>
                </div>
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReprocess(event.message_id)}
                    disabled={reprocessMutation.isPending}
                  >
                    {t("pubsub.failed.reprocess")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Stream detail tab (info + a group name entry point for pending messages)
  const renderStreamDetail = () => {
    if (!selectedStream) {
      return (
        <EmptyState
          title={t("pubsub.stream.empty.title")}
          description={t("pubsub.stream.empty.description")}
        />
      );
    }

    if (streamInfoLoading) {
      return <LoadingState />;
    }

    if (streamInfoError) {
      return <ErrorState message={t("pubsub.error.loading")} />;
    }

    const info = streamInfo?.data;
    const groups = info?.groups ?? [];

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("pubsub.stream.title")}: {selectedStream}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium">{t("pubsub.stream.length")}</h4>
                <p className="text-sm text-gray-600">{info?.length ?? 0}</p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.stream.firstEntry")}</h4>
                <p className="text-sm text-gray-600">
                  {info?.first_entry_id || "-"}
                </p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.stream.lastEntry")}</h4>
                <p className="text-sm text-gray-600">
                  {info?.last_entry_id || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("pubsub.groups.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <EmptyState
                title={t("pubsub.groups.empty.title")}
                description={t("pubsub.groups.empty.description")}
              />
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <div
                    key={group.name}
                    className="flex items-center justify-between border rounded p-3"
                  >
                    <div>
                      <div className="font-medium">{group.name}</div>
                      <div className="text-sm text-gray-500">
                        {group.consumers} {t("pubsub.group.consumers")} ·{" "}
                        {group.pending} {t("pubsub.group.pending")}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedGroup(group.name);
                        setSelectedTab("pending");
                      }}
                    >
                      {t("pubsub.pending.title")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Pending messages tab
  const renderPending = () => {
    if (!selectedStream || !selectedGroup) {
      return (
        <EmptyState
          title={t("pubsub.pending.empty.title")}
          description={t("pubsub.pending.empty.description")}
        />
      );
    }

    if (pendingLoading) {
      return <LoadingState />;
    }

    if (pendingError) {
      return <ErrorState message={t("pubsub.error.loading")} />;
    }

    const entries = pending?.data ?? [];

    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {t("pubsub.pending.title")}: {selectedStream} / {selectedGroup}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <EmptyState
              title={t("pubsub.pending.empty.title")}
              description={t("pubsub.pending.empty.description")}
            />
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.message_id}
                  className="flex items-center justify-between border rounded p-3 text-sm"
                >
                  <div className="font-mono">{entry.message_id}</div>
                  <div className="text-gray-500">
                    {t("pubsub.pending.table.consumer")}: {entry.consumer}
                  </div>
                  <Badge
                    variant={entry.times_delivered > 3 ? "destructive" : "secondary"}
                  >
                    {entry.times_delivered}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t("pubsub.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="failed">{t("pubsub.tabs.failed")}</TabsTrigger>
          <TabsTrigger value="streams" disabled={streamNames.length === 0}>
            {t("pubsub.tabs.streams")}
          </TabsTrigger>
          <TabsTrigger value="pending" disabled={!selectedGroup}>
            {t("pubsub.tabs.pending")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="failed" className="space-y-6">
          {renderFailedEvents()}
        </TabsContent>

        <TabsContent value="streams" className="space-y-6">
          {renderStreamDetail()}
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          {renderPending()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
