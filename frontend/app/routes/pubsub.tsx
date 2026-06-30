/**
 * PubSub page
 * Main page for PubSub monitoring and management
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
// import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { PubSubDashboard } from "~/features/pubsub/components/PubSubDashboard";
import { PubSubStreamView } from "~/features/pubsub/components/PubSubStreamView";
import { PubSubGroupView } from "~/features/pubsub/components/PubSubGroupView";
import { usePubSubStreams } from "~/features/pubsub/hooks/usePubSub";
import type { PubSubStream } from "~/features/pubsub/types/pubsub.types";

export default function PubSubPage() {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{
    streamName: string;
    groupName: string;
  } | null>(null);

  // Queries
  const { data: _streams, isLoading: _streamsLoading } = usePubSubStreams();

  const handleStreamView = (stream: PubSubStream) => {
    setSelectedStream(stream.name);
    setCurrentView("stream");
  };

  const handleGroupView = (streamName: string, groupName: string) => {
    setSelectedStream(streamName);
    setSelectedGroup({ streamName, groupName });
    setCurrentView("group");
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedStream(null);
    setSelectedGroup(null);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case "dashboard":
        return <PubSubDashboard onStreamView={handleStreamView} />;

      case "stream":
        return selectedStream ? (
          <PubSubStreamView
            streamName={selectedStream}
            onBack={handleBackToDashboard}
            onGroupView={handleGroupView}
          />
        ) : null;

      case "group":
        return selectedStream && selectedGroup ? (
          <PubSubGroupView
            streamName={selectedStream}
            groupName={selectedGroup.groupName}
            onBack={() => {
              setSelectedGroup(null);
              setCurrentView("stream");
            }}
            onConsumerView={(streamName, groupName, consumerName) => {
              // Could open consumer detail view in the future
              console.warn(
                "View consumer:",
                streamName,
                groupName,
                consumerName
              );
            }}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <PageLayout title={t("pubsub.title")} description={t("pubsub.description")}>
      <div className="space-y-6">
        {/* Navigation tabs */}
        <Tabs value={currentView} onValueChange={setCurrentView}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">
              {t("pubsub.tabs.dashboard")}
            </TabsTrigger>
            <TabsTrigger value="stream">{t("pubsub.tabs.streams")}</TabsTrigger>
            <TabsTrigger value="group">{t("pubsub.tabs.groups")}</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {renderCurrentView()}
          </TabsContent>

          <TabsContent value="stream" className="space-y-6">
            {renderCurrentView()}
          </TabsContent>

          <TabsContent value="group" className="space-y-6">
            {renderCurrentView()}
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
