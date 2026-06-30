import { useParams } from "react-router";
import { PageLayout } from "~/components/layout/PageLayout";

export default function PubSubGroupRoute() {
  const { groupId } = useParams<{ groupId: string }>();

  return (
    <PageLayout
      title="PubSub Group"
      breadcrumb={[
        { label: "PubSub", href: "/pubsub" },
        { label: groupId || "" },
      ]}
    >
      <div className="text-sm text-muted-foreground">{groupId}</div>
    </PageLayout>
  );
}
