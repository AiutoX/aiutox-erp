/**
 * PubSub Group View component
 * Detailed view of a single PubSub consumer group
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
  usePubSubGroup,
  usePubSubConsumers,
  usePubSubPending,
  useAcknowledgePubSubMessages,
  useClaimPubSubMessages,
  useDeletePubSubConsumer,
} from "../hooks/usePubSub";
import type { PubSubConsumer, PubSubGroupEntry } from "../types/pubsub.types";

interface PubSubGroupViewProps {
  streamName: string;
  groupName: string;
  onBack?: () => void;
  onConsumerView?: (
    streamName: string,
    groupName: string,
    consumerName: string
  ) => void;
}

export function PubSubGroupView({
  streamName,
  groupName,
  onBack,
  onConsumerView,
}: PubSubGroupViewProps) {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedConsumer, setSelectedConsumer] = useState<string | null>(null);

  // Queries
  const {
    data: group,
    isLoading: groupLoading,
    error: groupError,
    refetch: refetchGroup,
  } = usePubSubGroup(streamName, groupName);
  const {
    data: consumers,
    isLoading: consumersLoading,
    error: consumersError,
    refetch: refetchConsumers,
  } = usePubSubConsumers(streamName, groupName);
  const {
    data: pending,
    isLoading: pendingLoading,
    error: pendingError,
    refetch: refetchPending,
  } = usePubSubPending(streamName, groupName);

  const acknowledgeMessagesMutation = useAcknowledgePubSubMessages();
  const claimMessagesMutation = useClaimPubSubMessages();
  const deleteConsumerMutation = useDeletePubSubConsumer();

  const handleAcknowledgeMessages = async (messageIds: string[]) => {
    try {
      await acknowledgeMessagesMutation.mutateAsync({
        stream_name: streamName,
        group_name: groupName,
        message_ids: messageIds,
      });
      refetchPending();
      refetchGroup();
    } catch (error) {
      console.error("Failed to acknowledge messages:", error);
    }
  };

  const handleClaimMessages = async (
    consumerName: string,
    messageIds: string[]
  ) => {
    try {
      await claimMessagesMutation.mutateAsync({
        stream_name: streamName,
        group_name: groupName,
        consumer_name: consumerName,
        min_idle_time: 30000, // 30 seconds
        message_ids: messageIds,
      });
      refetchPending();
      refetchConsumers();
    } catch (error) {
      console.error("Failed to claim messages:", error);
    }
  };

  const handleDeleteConsumer = async (consumerName: string) => {
    try {
      await deleteConsumerMutation.mutateAsync({
        streamName,
        groupName,
        consumerName,
      });
      refetchConsumers();
    } catch (error) {
      console.error("Failed to delete consumer:", error);
    }
  };

  // Overview tab
  const renderOverview = () => {
    if (groupLoading) {
      return <LoadingState />;
    }

    if (groupError) {
      return <ErrorState message={t("pubsub.error.loading")} />;
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("pubsub.group.overview")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <h4 className="font-medium">{t("pubsub.group.name")}</h4>
                <p className="text-sm text-gray-600">{group?.data?.name}</p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.group.stream")}</h4>
                <p className="text-sm text-gray-600">
                  {group?.data?.stream_name}
                </p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.group.consumers")}</h4>
                <p className="text-sm text-gray-600">
                  {group?.data?.consumers}
                </p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.group.pending")}</h4>
                <p className="text-sm text-gray-600">{group?.data?.pending}</p>
              </div>
              <div>
                <h4 className="font-medium">
                  {t("pubsub.group.lastDelivered")}
                </h4>
                <p className="text-sm text-gray-600">
                  {group?.data?.last_delivered_id
                    ? group.data.last_delivered_id.substring(0, 8) + "..."
                    : "-"}
                </p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.group.createdAt")}</h4>
                <p className="text-sm text-gray-600">
                  {group?.data?.created_at
                    ? new Date(group.data.created_at).toLocaleString()
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Consumers tab
  const renderConsumers = () => {
    if (consumersLoading) {
      return <LoadingState />;
    }

    if (consumersError) {
      return <ErrorState message={t("pubsub.error.loading")} />;
    }

    const consumersList = consumers?.data || [];

    if (consumersList.length === 0) {
      return (
        <EmptyState
          title={t("pubsub.consumers.empty.title")}
          description={t("pubsub.consumers.empty.description")}
        />
      );
    }

    const columns = [
      {
        key: "name",
        header: t("pubsub.consumers.table.name"),
        cell: (consumer: PubSubConsumer) => (
          <div>
            <div className="font-medium">{consumer.name}</div>
            <div className="text-sm text-gray-500">
              {consumer.active
                ? t("pubsub.consumer.active")
                : t("pubsub.consumer.inactive")}
            </div>
          </div>
        ),
      },
      {
        key: "pending",
        header: t("pubsub.consumers.table.pending"),
        cell: (consumer: PubSubConsumer) => (
          <Badge variant={consumer.pending > 0 ? "destructive" : "secondary"}>
            {consumer.pending}
          </Badge>
        ),
      },
      {
        key: "idle_time",
        header: t("pubsub.consumers.table.idleTime"),
        cell: (consumer: PubSubConsumer) => (
          <div className="text-sm">
            {Math.floor(consumer.idle_time / 1000)}s
          </div>
        ),
      },
      {
        key: "last_seen",
        header: t("pubsub.consumers.table.lastSeen"),
        cell: (consumer: PubSubConsumer) => (
          <div className="text-sm">
            {consumer.last_seen
              ? new Date(consumer.last_seen).toLocaleString()
              : "-"}
          </div>
        ),
      },
      {
        key: "actions",
        header: t("pubsub.consumers.table.actions"),
        cell: (consumer: PubSubConsumer) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedConsumer(consumer.name);
                onConsumerView?.(streamName, groupName, consumer.name);
              }}
            >
              {t("common.view")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteConsumer(consumer.name)}
              disabled={deleteConsumerMutation.isPending}
              className="text-red-600 hover:text-red-700"
            >
              {t("common.delete")}
            </Button>
          </div>
        ),
      },
    ] as DataTableColumn<PubSubConsumer>[];

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("pubsub.consumers.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable data={consumersList} columns={columns} />
        </CardContent>
      </Card>
    );
  };

  // Pending messages tab
  const renderPending = () => {
    if (pendingLoading) {
      return <LoadingState />;
    }

    if (pendingError) {
      return <ErrorState message={t("pubsub.error.loading")} />;
    }

    const pendingMessages = pending?.data || [];

    if (pendingMessages.length === 0) {
      return (
        <EmptyState
          title={t("pubsub.pending.empty.title")}
          description={t("pubsub.pending.empty.description")}
        />
      );
    }

    const columns = [
      {
        key: "id",
        header: t("pubsub.pending.table.id"),
        cell: (entry: PubSubGroupEntry) => (
          <div className="font-mono text-sm">{entry.id.substring(0, 8)}...</div>
        ),
      },
      {
        key: "consumer_name",
        header: t("pubsub.pending.table.consumer"),
        cell: (entry: PubSubGroupEntry) => (
          <div className="text-sm">{entry.consumer_name || "-"}</div>
        ),
      },
      {
        key: "delivery_count",
        header: t("pubsub.pending.table.deliveryCount"),
        cell: (entry: PubSubGroupEntry) => (
          <Badge
            variant={entry.delivery_count > 3 ? "destructive" : "secondary"}
          >
            {entry.delivery_count}
          </Badge>
        ),
      },
      {
        key: "last_delivered",
        header: t("pubsub.pending.table.lastDelivered"),
        cell: (entry: PubSubGroupEntry) => (
          <div className="text-sm">
            {entry.last_delivered
              ? new Date(entry.last_delivered).toLocaleString()
              : "-"}
          </div>
        ),
      },
      {
        key: "data",
        header: t("pubsub.pending.table.data"),
        cell: (entry: PubSubGroupEntry) => (
          <div className="text-sm">
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-w-xs">
              {JSON.stringify(entry.data, null, 2)}
            </pre>
          </div>
        ),
      },
      {
        key: "timestamp",
        header: t("pubsub.pending.table.timestamp"),
        cell: (entry: PubSubGroupEntry) => (
          <div className="text-sm">
            {new Date(entry.timestamp).toLocaleString()}
          </div>
        ),
      },
      {
        key: "actions",
        header: t("pubsub.pending.table.actions"),
        cell: (entry: PubSubGroupEntry) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAcknowledgeMessages([entry.id])}
              disabled={acknowledgeMessagesMutation.isPending}
            >
              {t("pubsub.pending.acknowledge")}
            </Button>
            {selectedConsumer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleClaimMessages(selectedConsumer, [entry.id])
                }
                disabled={claimMessagesMutation.isPending}
              >
                {t("pubsub.pending.claim")}
              </Button>
            )}
          </div>
        ),
      },
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("pubsub.pending.title")}</CardTitle>
          <div className="flex items-center space-x-2">
            <select
              value={selectedConsumer || ""}
              onChange={(e) => setSelectedConsumer(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="">{t("pubsub.pending.selectConsumer")}</option>
              {consumers?.data?.map((consumer) => (
                <option key={consumer.name} value={consumer.name}>
                  {consumer.name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable data={pendingMessages} columns={columns} />
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">{t("pubsub.group.title")}</h1>
          <Badge variant="outline">{streamName}</Badge>
          <Badge variant="outline">{groupName}</Badge>
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            {t("common.back")}
          </Button>
        )}
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            {t("pubsub.group.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="consumers">
            {t("pubsub.group.tabs.consumers")}
          </TabsTrigger>
          <TabsTrigger value="pending">
            {t("pubsub.group.tabs.pending")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="consumers" className="space-y-6">
          {renderConsumers()}
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          {renderPending()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
