import { useParams } from "react-router";
import { PubSubStreamView } from "~/features/pubsub/components/PubSubStreamView";

export default function PubSubStreamRoute() {
  const { streamId } = useParams<{ streamId: string }>();
  return streamId ? <PubSubStreamView streamName={streamId} /> : null;
}
