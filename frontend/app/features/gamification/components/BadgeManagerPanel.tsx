/**
 * BadgeManagerPanel component
 * Connects BadgeList/BadgeBuilder to the gamification badges API via TanStack Query
 */

import { useState } from "react";

import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  useAllBadges,
  useCreateBadge,
  useUpdateBadge,
  useDeactivateBadge,
} from "~/features/gamification/hooks/useGamification";
import { BadgeList } from "~/features/gamification/components/BadgeList";
import { BadgeBuilder } from "~/features/gamification/components/BadgeBuilder";
import type {
  Badge,
  BadgeCreate,
  BadgeUpdate,
} from "~/features/gamification/api/gamification.api";

type View = "list" | "create" | "edit";

export function BadgeManagerPanel() {
  const { t } = useTranslation();
  const [view, setView] = useState<View>("list");
  const [selectedBadge, setSelectedBadge] = useState<Badge | undefined>(
    undefined
  );

  const { data: badges = [], isLoading } = useAllBadges(false);
  const createBadgeMutation = useCreateBadge();
  const updateBadgeMutation = useUpdateBadge();
  const deactivateBadgeMutation = useDeactivateBadge();

  const handleCreate = () => {
    setSelectedBadge(undefined);
    setView("create");
  };

  const handleEdit = (badge: Badge) => {
    setSelectedBadge(badge);
    setView("edit");
  };

  const handleDeactivate = (badge: Badge) => {
    if (window.confirm(t("gamification.badges.confirmDeactivate"))) {
      deactivateBadgeMutation.mutate(badge.id);
    }
  };

  const handleCancel = () => {
    setSelectedBadge(undefined);
    setView("list");
  };

  const handleSubmit = (data: BadgeCreate | BadgeUpdate) => {
    if (selectedBadge) {
      updateBadgeMutation.mutate(
        { badgeId: selectedBadge.id, data },
        { onSuccess: () => setView("list") }
      );
      return;
    }

    createBadgeMutation.mutate(data as BadgeCreate, {
      onSuccess: () => setView("list"),
    });
  };

  if (view === "create" || view === "edit") {
    return (
      <BadgeBuilder
        badge={selectedBadge}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={
          createBadgeMutation.isPending || updateBadgeMutation.isPending
        }
      />
    );
  }

  return (
    <BadgeList
      badges={badges}
      loading={isLoading}
      onCreate={handleCreate}
      onEdit={handleEdit}
      onDeactivate={handleDeactivate}
    />
  );
}
