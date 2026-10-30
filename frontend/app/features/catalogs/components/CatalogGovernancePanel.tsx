/**
 * CatalogGovernancePanel -- the "Permisos del catálogo" governance card
 * (ISSUE-032, AC-UI-03/07/08/09).
 *
 * Purely presentational: switches reflect `tenant_can_manage` /
 * `is_extensible`, but are only ever *enabled* from
 * `capabilities.can_govern` (AC-UI-03) -- never from any other field. A
 * locked list additionally force-disables the "add items" switch for
 * everyone, superadmin included (AC-UI-09).
 *
 * Flipping an enabled switch opens `CatalogGovernanceConfirmDialog` with the
 * intended next value (ISSUE-033, AC-UI-10); on confirm the panel runs
 * `useUpdateGovernance` with the flag(s) -- including the RULE-006 companion
 * flag -- the reason and the `updated_at` the list had when the dialog
 * opened (AC-UI-11). The switches stay controlled by the server data, so
 * they only move once the invalidated list refetches (AC-UI-12).
 *
 * `onToggle`, when passed, replaces that built-in confirm flow and receives
 * the field and its intended next value (the ISSUE-032 contract).
 *
 * The card shell uses the same Card primitives as ConfigSection, because
 * ConfigSection's string-only `title` cannot hold the "Plataforma" chip
 * next to the title (AC-UI-08).
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useOwnerModuleName } from "../hooks/useOwnerModuleName";
import { useUpdateGovernance } from "../hooks/useUpdateGovernance";
import type {
  CatalogListAdmin,
  CatalogViewerCapabilities,
} from "../types/catalogsAdmin.types";
import {
  CatalogGovernanceConfirmDialog,
  describeGovernanceChange,
  type GovernanceChange,
} from "./CatalogGovernanceConfirmDialog";

export type GovernanceToggleField = "tenant_can_manage" | "is_extensible";

export interface CatalogGovernancePanelProps {
  list: CatalogListAdmin;
  capabilities: CatalogViewerCapabilities;
  /** Replaces the built-in confirm dialog + mutation when passed. */
  onToggle?: (field: GovernanceToggleField, next: boolean) => void;
}

interface PendingGovernanceChange {
  change: GovernanceChange;
  /** `list.updated_at` when the dialog opened: the optimistic-concurrency token. */
  expectedUpdatedAt: string;
}

const OWNER_TOKEN = "{owner}";

interface GovernanceSwitchRowProps {
  id: string;
  label: string;
  helper: string;
  control: ReactNode;
}

function GovernanceSwitchRow({
  id,
  label,
  helper,
  control,
}: GovernanceSwitchRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </div>
      {control}
    </div>
  );
}

export function CatalogGovernancePanel({
  list,
  capabilities,
  onToggle,
}: CatalogGovernancePanelProps) {
  const { t } = useTranslation();
  const ownerModuleName = useOwnerModuleName();
  const updateGovernance = useUpdateGovernance(list.key);
  const [pending, setPending] = useState<PendingGovernanceChange | null>(null);

  const openConfirm = (field: GovernanceToggleField, next: boolean) => {
    setPending({
      change: {
        field,
        next,
        current: {
          tenant_can_manage: list.tenant_can_manage,
          is_extensible: list.is_extensible,
        },
      },
      expectedUpdatedAt: list.updated_at,
    });
  };
  const handleToggle = onToggle ?? openConfirm;

  const handleConfirm = (reason: string) => {
    if (!pending) return;
    updateGovernance.mutate(
      {
        ...describeGovernanceChange(pending.change).flags,
        change_reason: reason,
        expected_updated_at: pending.expectedUpdatedAt,
      },
      // Success and error alike: the hook has toasted and refetched.
      { onSettled: () => setPending(null) }
    );
  };

  const canGovern = capabilities.can_govern;
  const manageDisabled = !canGovern;
  const extensibleDisabled = !canGovern || list.is_locked;
  // `t()` has no interpolation parameter, so the owner token is replaced here.
  const withOwner = (key: string) =>
    t(key).replace(OWNER_TOKEN, ownerModuleName(list.owner_module));

  const manageLabel = t("catalogs.admin.governance.manageSwitch");
  const extensibleLabel = t("catalogs.admin.governance.extensibleSwitch");

  const extensibleSwitch = (
    <Switch
      id="catalog-governance-extensible"
      checked={list.is_extensible}
      disabled={extensibleDisabled}
      aria-label={extensibleLabel}
      onCheckedChange={(next) => handleToggle("is_extensible", next)}
    />
  );

  // A disabled button receives no pointer events, so the tooltip trigger is
  // a focusable wrapper around the switch rather than the switch itself.
  const extensibleControl =
    list.is_locked && canGovern ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className="inline-flex"
              data-testid="catalog-governance-extensible-lock-trigger"
            >
              {extensibleSwitch}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {withOwner("catalogs.admin.governance.lockedTooltip")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      extensibleSwitch
    );

  return (
    <Card data-testid="catalog-governance-panel">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-xl">
            {t("catalogs.admin.governance.title")}
          </CardTitle>
          {canGovern && (
            <Badge
              variant="secondary"
              data-testid="catalog-governance-platform-chip"
            >
              {t("catalogs.admin.governance.platformChip")}
            </Badge>
          )}
        </div>
        <CardDescription>
          {canGovern
            ? t("catalogs.admin.governance.superadminSubtitle")
            : t("catalogs.admin.governance.tenantHelper")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GovernanceSwitchRow
          id="catalog-governance-manage"
          label={manageLabel}
          helper={t("catalogs.admin.governance.manageHelper")}
          control={
            <Switch
              id="catalog-governance-manage"
              checked={list.tenant_can_manage}
              disabled={manageDisabled}
              aria-label={manageLabel}
              onCheckedChange={(next) =>
                handleToggle("tenant_can_manage", next)
              }
            />
          }
        />
        <GovernanceSwitchRow
          id="catalog-governance-extensible"
          label={extensibleLabel}
          helper={t("catalogs.admin.governance.extensibleHelper")}
          control={extensibleControl}
        />
        {list.is_locked && (
          <p
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            data-testid="catalog-governance-locked-indicator"
          >
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            {withOwner("catalogs.admin.governance.lockedIndicator")}
          </p>
        )}
      </CardContent>
      <CatalogGovernanceConfirmDialog
        change={pending?.change ?? null}
        loading={updateGovernance.isPending}
        onCancel={() => setPending(null)}
        onConfirm={handleConfirm}
      />
    </Card>
  );
}
