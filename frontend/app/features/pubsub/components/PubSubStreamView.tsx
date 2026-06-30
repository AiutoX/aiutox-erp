/**
 * PubSub Stream View component
 * Detailed view of a single PubSub stream
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
  usePubSubStream,
  usePubSubGroups,
  useDeletePubSubGroup,
  useClearPubSubStream,
  useTrimPubSubStream,
} from "../hooks/usePubSub";
import type { PubSubGroup, PubSubStreamEntry } from "../types/pubsub.types";

interface PubSubStreamViewProps {
  streamName: string;
  onBack?: () => void;
  onGroupView?: (streamName: string, groupName: string) => void;
}

export function PubSubStreamView({
  streamName,
  onBack,
  onGroupView,
}: PubSubStreamViewProps) {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState("overview");

  // Queries
  const {
    data: stream,
    isLoading: streamLoading,
    error: streamError,
    refetch: refetchStream,
  } = usePubSubStream(streamName);
  const {
    data: groups,
    isLoading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = usePubSubGroups(streamName);

  const deleteGroupMutation = useDeletePubSubGroup();
  const clearStreamMutation = useClearPubSubStream();
  const trimStreamMutation = useTrimPubSubStream();

  const handleDeleteGroup = async (groupName: string) => {
    try {
      await deleteGroupMutation.mutateAsync({
        streamName,
        groupName,
      });
      refetchGroups();
    } catch (error) {
      console.error("Failed to delete group:", error);
    }
  };

  const handleClearStream = async () => {
    try {
      await clearStreamMutation.mutateAsync(streamName);
      refetchStream();
      refetchGroups();
    } catch (error) {
      console.error("Failed to clear stream:", error);
    }
  };

  const handleTrimStream = async () => {
    try {
      await trimStreamMutation.mutateAsync({
        name: streamName,
        strategy: "maxlen",
        threshold: 1000,
      });
      refetchStream();
    } catch (error) {
      console.error("Failed to trim stream:", error);
    }
  };

  // Overview tab
  const renderOverview = () => {
    if (streamLoading) {
      return <LoadingState />;
    }

    if (streamError) {
      return <ErrorState message={t("pubsub.error.loading")} />;
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("pubsub.stream.overview")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <h4 className="font-medium">{t("pubsub.stream.name")}</h4>
                <p className="text-sm text-gray-600">{stream?.data?.name}</p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.stream.length")}</h4>
                <p className="text-sm text-gray-600">{stream?.data?.length}</p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.stream.groups")}</h4>
                <p className="text-sm text-gray-600">{stream?.data?.groups}</p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.stream.pending")}</h4>
                <p className="text-sm text-gray-600">{stream?.data?.pending}</p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.stream.firstEntry")}</h4>
                <p className="text-sm text-gray-600">
                  {stream?.data?.first_entry_id || "-"}
                </p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.stream.lastEntry")}</h4>
                <p className="text-sm text-gray-600">
                  {stream?.data?.last_entry_id || "-"}
                </p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.stream.lastRead")}</h4>
                <p className="text-sm text-gray-600">
                  {stream?.data?.last_read
                    ? new Date(stream.data.last_read).toLocaleString()
                    : "-"}
                </p>
              </div>
              <div>
                <h4 className="font-medium">{t("pubsub.stream.createdAt")}</h4>
                <p className="text-sm text-gray-600">
                  {stream?.data?.created_at
                    ? new Date(stream.data.created_at).toLocaleString()
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("pubsub.stream.actions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleClearStream}
                disabled={clearStreamMutation.isPending}
              >
                {t("pubsub.stream.clear")}
              </Button>
              <Button
                variant="outline"
                onClick={handleTrimStream}
                disabled={trimStreamMutation.isPending}
              >
                {t("pubsub.stream.trim")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Groups tab
  const renderGroups = () => {
    if (groupsLoading) {
      return <LoadingState />;
    }

    if (groupsError) {
      return <ErrorState message={t("pubsub.error.loading")} />;
    }

    const groupsList = groups?.data || [];

    if (groupsList.length === 0) {
      return (
        <EmptyState
          title={t("pubsub.groups.empty.title")}
          description={t("pubsub.groups.empty.description")}
        />
      );
    }

    const columns = [
      {
        key: "name",
        header: t("pubsub.groups.table.name"),
        cell: (group: PubSubGroup) => (
          <div>
            <div className="font-medium">{group.name}</div>
            <div className="text-sm text-gray-500">
              {group.consumers} consumers
            </div>
          </div>
        ),
      },
      {
        key: "pending",
        header: t("pubsub.groups.table.pending"),
        cell: (group: PubSubGroup) => (
          <Badge variant={group.pending > 0 ? "destructive" : "secondary"}>
            {group.pending}
          </Badge>
        ),
      },
      {
        key: "last_delivered",
        header: t("pubsub.groups.table.lastDelivered"),
        cell: (group: PubSubGroup) => (
          <div className="text-sm">
            {group.last_delivered_id
              ? group.last_delivered_id.substring(0, 8) + "..."
              : "-"}
          </div>
        ),
      },
      {
        key: "created_at",
        header: t("pubsub.groups.table.createdAt"),
        cell: (group: PubSubGroup) => (
          <div className="text-sm">
            {group.created_at
              ? new Date(group.created_at).toLocaleString()
              : "-"}
          </div>
        ),
      },
      {
        key: "actions",
        header: t("pubsub.groups.table.actions"),
        cell: (group: PubSubGroup) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onGroupView?.(streamName, group.name)}
            >
              {t("common.view")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteGroup(group.name)}
              disabled={deleteGroupMutation.isPending}
              className="text-red-600 hover:text-red-700"
            >
              {t("common.delete")}
            </Button>
          </div>
        ),
      },
    ] as DataTableColumn<PubSubGroup>[];

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("pubsub.groups.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable data={groupsList} columns={columns} />
        </CardContent>
      </Card>
    );
  };

  // Messages tab
  const renderMessages = () => {
    if (streamLoading) {
      return <LoadingState />;
    }

    if (streamError) {
      return <ErrorState message={t("pubsub.error.loading")} />;
    }

    const streamEntries = stream?.data?.entries || [];

    if (streamEntries.length === 0) {
      return (
        <EmptyState
          title={t("pubsub.messages.empty.title")}
          description={t("pubsub.messages.empty.description")}
        />
      );
    }

    const columns = [
      {
        key: "id",
        header: t("pubsub.messages.table.id"),
        cell: (entry: PubSubStreamEntry) => (
          <div className="font-mono text-sm">{entry.id.substring(0, 8)}...</div>
        ),
      },
      {
        key: "data",
        header: t("pubsub.messages.table.data"),
        cell: (entry: PubSubStreamEntry) => (
          <div className="text-sm">
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-w-xs">
              {JSON.stringify(entry.data, null, 2)}
            </pre>
          </div>
        ),
      },
      {
        key: "timestamp",
        header: t("pubsub.messages.table.timestamp"),
        cell: (entry: PubSubStreamEntry) => (
          <div className="text-sm">
            {new Date(entry.timestamp).toLocaleString()}
          </div>
        ),
      },
      {
        key: "sequence",
        header: t("pubsub.messages.table.sequence"),
        cell: (entry: PubSubStreamEntry) => (
          <div className="text-sm">{entry.sequence}</div>
        ),
      },
    ] as DataTableColumn<PubSubStreamEntry>[];

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("pubsub.messages.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable data={streamEntries} columns={columns} />
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">{t("pubsub.stream.title")}</h1>
          <Badge variant="outline">{streamName}</Badge>
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
            {t("pubsub.stream.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="groups">
            {t("pubsub.stream.tabs.groups")}
          </TabsTrigger>
          <TabsTrigger value="messages">
            {t("pubsub.stream.tabs.messages")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          {renderGroups()}
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          {renderMessages()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
