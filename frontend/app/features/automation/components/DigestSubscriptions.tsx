import { useState, useMemo } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  useAvailableDigests,
  useDigestSubscriptions,
  useSubscribeDigest,
  useUnsubscribeDigest,
} from "../hooks/useDigests";
import type {
  AvailableDigest,
  DigestSchedule,
  DigestChannel,
  DigestSubscription,
} from "../types/automation.types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Newspaper, BellOff, CalendarClock } from "lucide-react";
import { useToast } from "~/hooks/useToast";

const SCHEDULES: DigestSchedule[] = ["daily", "weekly", "monthly"];
const CHANNELS: DigestChannel[] = ["embedded_chat", "telegram"];

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function computeNextDelivery(schedule: DigestSchedule): string {
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(9, 0, 0, 0);

  if (schedule === "daily") {
    if (now >= target) target.setUTCDate(target.getUTCDate() + 1);
  } else if (schedule === "weekly") {
    const day = target.getUTCDay();
    const daysUntilMonday = day === 0 ? 1 : day === 1 && now < target ? 0 : 8 - day;
    target.setUTCDate(target.getUTCDate() + daysUntilMonday);
  } else {
    target.setUTCMonth(target.getUTCMonth() + 1, 1);
  }

  return formatDateTime(target.toISOString());
}

// ---------------------------------------------------------------------------
// Subscribe Dialog
// ---------------------------------------------------------------------------

interface SubscribeDialogProps {
  open: boolean;
  digest: AvailableDigest | null;
  onClose: () => void;
}

function SubscribeDialog({ open, digest, onClose }: SubscribeDialogProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const subscribeMutation = useSubscribeDigest();

  const [schedule, setSchedule] = useState<DigestSchedule>("daily");
  const [channels, setChannels] = useState<DigestChannel[]>(["embedded_chat"]);

  const toggleChannel = (ch: DigestChannel) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleSubmit = () => {
    if (!digest || channels.length === 0) return;

    subscribeMutation.mutate(
      { digest_name: digest.qualified_name, schedule, channels },
      {
        onSuccess: () => {
          toast.success("automation.digests.subscribe.success");
          onClose();
          setSchedule("daily");
          setChannels(["embedded_chat"]);
        },
        onError: () => {
          toast.error("automation.digests.subscribe.error");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("automation.digests.subscribe.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {digest && (
            <p className="text-sm text-muted-foreground">
              {digest.description}
            </p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("automation.digests.subscribe.scheduleLabel")}
            </label>
            <Select
              value={schedule}
              onValueChange={(v) => setSchedule(v as DigestSchedule)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`automation.digests.schedule.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("automation.digests.subscribe.channelsLabel")}
            </label>
            <div className="space-y-2">
              {CHANNELS.map((ch) => (
                <div key={ch} className="flex items-center space-x-2">
                  <Checkbox
                    id={`ch-${ch}`}
                    checked={channels.includes(ch)}
                    onCheckedChange={() => toggleChannel(ch)}
                  />
                  <label htmlFor={`ch-${ch}`} className="text-sm">
                    {t(`automation.digests.channel.${ch}`)}
                  </label>
                </div>
              ))}
            </div>
            {channels.length === 0 && (
              <p className="text-sm text-destructive">
                {t("automation.digests.subscribe.selectChannel")}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <span>
              {t("automation.digests.subscribe.nextDeliveryPreview").replace(
                "{{date}}",
                computeNextDelivery(schedule)
              )}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={subscribeMutation.isPending || channels.length === 0}
          >
            {subscribeMutation.isPending
              ? t("automation.digests.subscribe.subscribing")
              : t("automation.digests.subscribe.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Available Digests Section
// ---------------------------------------------------------------------------

interface AvailableDigestsSectionProps {
  digests: AvailableDigest[];
  subscriptions: DigestSubscription[];
  isLoading: boolean;
  onSubscribe: (digest: AvailableDigest) => void;
}

function AvailableDigestsSection({
  digests,
  subscriptions,
  isLoading,
  onSubscribe,
}: AvailableDigestsSectionProps) {
  const { t } = useTranslation();

  const subscribedNames = useMemo(
    () => new Set(subscriptions.filter((s) => s.is_active).map((s) => s.digest_name)),
    [subscriptions]
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (digests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <Newspaper className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t("automation.digests.available.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {digests.map((digest) => {
        const isSubscribed = subscribedNames.has(digest.qualified_name);
        return (
          <Card key={digest.qualified_name}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">
                  {digest.qualified_name.split(".").pop()?.replace(/_/g, " ") ??
                    digest.qualified_name}
                </CardTitle>
                <Newspaper className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pb-2">
              <p className="text-sm text-muted-foreground">
                {digest.description}
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">{digest.module_name}</Badge>
                {digest.permission_required && (
                  <Badge variant="outline">
                    {digest.permission_required}
                  </Badge>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                size="sm"
                disabled={isSubscribed}
                onClick={() => onSubscribe(digest)}
              >
                {isSubscribed
                  ? t("automation.digests.available.subscribed")
                  : t("automation.digests.available.subscribe")}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subscriptions Table Section
// ---------------------------------------------------------------------------

interface SubscriptionsTableProps {
  subscriptions: DigestSubscription[];
  isLoading: boolean;
  onUnsubscribe: (sub: DigestSubscription) => void;
}

function SubscriptionsTable({
  subscriptions,
  isLoading,
  onUnsubscribe,
}: SubscriptionsTableProps) {
  const { t } = useTranslation();

  const active = useMemo(
    () => subscriptions.filter((s) => s.is_active),
    [subscriptions]
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <BellOff className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t("automation.digests.subscriptions.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("automation.digests.subscriptions.digest")}</TableHead>
            <TableHead>{t("automation.digests.subscriptions.schedule")}</TableHead>
            <TableHead>{t("automation.digests.subscriptions.channels")}</TableHead>
            <TableHead>{t("automation.digests.subscriptions.nextDelivery")}</TableHead>
            <TableHead className="w-[100px]">
              {t("automation.digests.subscriptions.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {active.map((sub) => (
            <TableRow key={sub.id}>
              <TableCell className="font-medium">{sub.digest_name}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {t(`automation.digests.schedule.${sub.schedule}`)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {sub.channels.map((ch) => (
                    <Badge key={ch} variant="outline">
                      {t(`automation.digests.channel.${ch}`)}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                {sub.next_fire_at
                  ? formatDateTime(sub.next_fire_at)
                  : t("automation.digests.nextDelivery.notScheduled")}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUnsubscribe(sub)}
                >
                  <BellOff className="mr-1 h-4 w-4" />
                  {t("automation.digests.subscriptions.unsubscribe")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function DigestSubscriptions() {
  const { t } = useTranslation();
  const toast = useToast();

  const {
    data: digests = [],
    isLoading: digestsLoading,
  } = useAvailableDigests();
  const {
    data: subscriptions = [],
    isLoading: subsLoading,
  } = useDigestSubscriptions();

  const unsubscribeMutation = useUnsubscribeDigest();

  const [subscribeTarget, setSubscribeTarget] =
    useState<AvailableDigest | null>(null);
  const [unsubscribeTarget, setUnsubscribeTarget] =
    useState<DigestSubscription | null>(null);

  const handleUnsubscribeConfirm = () => {
    if (!unsubscribeTarget) return;

    unsubscribeMutation.mutate(unsubscribeTarget.id, {
      onSuccess: () => {
        toast.success("automation.digests.unsubscribe.success");
        setUnsubscribeTarget(null);
      },
      onError: () => {
        toast.error("automation.digests.unsubscribe.error");
      },
    });
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold">
          {t("automation.digests.available.title")}
        </h2>
        <AvailableDigestsSection
          digests={digests}
          subscriptions={subscriptions}
          isLoading={digestsLoading}
          onSubscribe={setSubscribeTarget}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          {t("automation.digests.subscriptions.title")}
        </h2>
        <SubscriptionsTable
          subscriptions={subscriptions}
          isLoading={subsLoading}
          onUnsubscribe={setUnsubscribeTarget}
        />
      </section>

      <SubscribeDialog
        open={subscribeTarget !== null}
        digest={subscribeTarget}
        onClose={() => setSubscribeTarget(null)}
      />

      <ConfirmDialog
        open={unsubscribeTarget !== null}
        onClose={() => setUnsubscribeTarget(null)}
        onConfirm={handleUnsubscribeConfirm}
        title={t("automation.digests.unsubscribe.title")}
        description={t("automation.digests.unsubscribe.confirm")}
        confirmText={t("automation.digests.unsubscribe.confirmButton")}
        variant="destructive"
        loading={unsubscribeMutation.isPending}
      />
    </div>
  );
}
