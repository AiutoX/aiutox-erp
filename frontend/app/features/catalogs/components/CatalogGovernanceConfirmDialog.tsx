/**
 * CatalogGovernanceConfirmDialog -- the superadmin confirm step for a
 * governance switch flip (ISSUE-033, AC-UI-10).
 *
 * Built on the same `AlertDialog*` primitives as `ConfirmDialog`
 * (components/common/ConfirmDialog.tsx) rather than on `ConfirmDialog`
 * itself: its `description` is a plain string, which cannot carry the
 * effect box, the conditional narrowing / RULE-006 lines and the reason
 * textarea. The confirm control is a plain `Button` instead of
 * `AlertDialogAction`, because Radix's Action closes the dialog on click and
 * this dialog must stay open (and disabled) while the mutation is in flight.
 *
 * Purely presentational: it receives the intended change and reports the
 * typed reason through `onConfirm`; `CatalogGovernancePanel` owns the
 * mutation. `describeGovernanceChange` is the single source of the RULE-006
 * companion flag, used both for the preview lines here and for the request
 * payload in the panel, so the dialog never under-promises what the server
 * will do (AC-API-21).
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { GovernanceFlagsInput } from "../api/catalogGovernance";
import { useReturnFocus } from "../hooks/useReturnFocus";
import type { GovernanceToggleField } from "./CatalogGovernancePanel";

/** Backend `CatalogGovernanceIn.change_reason` bounds. */
export const GOVERNANCE_REASON_MIN_LENGTH = 10;
export const GOVERNANCE_REASON_MAX_LENGTH = 500;

/** A switch flip awaiting confirmation, with the flags as currently loaded. */
export interface GovernanceChange {
  field: GovernanceToggleField;
  next: boolean;
  current: { tenant_can_manage: boolean; is_extensible: boolean };
}

export interface GovernanceChangeDescription {
  /** The flags to send, including the RULE-006 companion flag when it applies. */
  flags: GovernanceFlagsInput;
  /** A true -> false flip: tenant changes are kept but stop applying. */
  isNarrowing: boolean;
  /** Opening `is_extensible` on a closed list also opens `tenant_can_manage`. */
  turnsManageOn: boolean;
  /** Closing `tenant_can_manage` on an extensible list also closes `is_extensible`. */
  turnsExtensibleOff: boolean;
}

export function describeGovernanceChange(
  change: GovernanceChange
): GovernanceChangeDescription {
  const { field, next, current } = change;
  const turnsManageOn =
    field === "is_extensible" && next && !current.tenant_can_manage;
  const turnsExtensibleOff =
    field === "tenant_can_manage" && !next && current.is_extensible;

  const flags: GovernanceFlagsInput = { [field]: next };
  if (turnsManageOn) flags.tenant_can_manage = true;
  if (turnsExtensibleOff) flags.is_extensible = false;

  return {
    flags,
    isNarrowing: !next,
    turnsManageOn,
    turnsExtensibleOff,
  };
}

const SWITCH_LABEL_KEYS: Record<GovernanceToggleField, string> = {
  tenant_can_manage: "catalogs.admin.governance.manageSwitch",
  is_extensible: "catalogs.admin.governance.extensibleSwitch",
};

export interface CatalogGovernanceConfirmDialogProps {
  /** The pending change; the dialog is open while it is non-null. */
  change: GovernanceChange | null;
  /** True while the mutation is in flight: both buttons are disabled. */
  loading?: boolean;
  onCancel: () => void;
  /** Receives the trimmed reason (at least 10 characters). */
  onConfirm: (reason: string) => void;
}

export function CatalogGovernanceConfirmDialog({
  change,
  loading = false,
  onCancel,
  onConfirm,
}: CatalogGovernanceConfirmDialogProps) {
  const { t } = useTranslation();
  const reasonId = useId();
  const hintId = useId();
  const [reason, setReason] = useState("");

  // Every newly opened change starts with an empty reason.
  useEffect(() => {
    if (change) setReason("");
  }, [change]);

  // No AlertDialogTrigger: return focus to the flipped switch (AC-UI-28).
  const returnFocus = useReturnFocus(change !== null);

  const trimmedReason = reason.trim();
  const canConfirm =
    !loading && trimmedReason.length >= GOVERNANCE_REASON_MIN_LENGTH;
  const description = change ? describeGovernanceChange(change) : null;

  const handleOpenChange = (open: boolean) => {
    if (!open && !loading) onCancel();
  };

  return (
    <AlertDialog open={change !== null} onOpenChange={handleOpenChange}>
      {change && description && (
        <AlertDialogContent
          data-testid="catalog-governance-confirm-dialog"
          onCloseAutoFocus={returnFocus}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("catalogs.admin.governance.confirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div
                  className="space-y-1 rounded-md border border-border bg-muted p-3"
                  data-testid="catalog-governance-confirm-effect"
                >
                  <p className="font-medium text-foreground">
                    {t(SWITCH_LABEL_KEYS[change.field])}
                  </p>
                  {/* The description's muted tone on the box's muted fill is
                      below 4.5:1 (axe color-contrast, AC-UI-28). */}
                  <p
                    className="text-foreground"
                    data-testid="catalog-governance-confirm-effect-text"
                  >
                    {t("catalogs.admin.governance.confirmEffect")}
                  </p>
                </div>
                {description.isNarrowing && (
                  <p>{t("catalogs.admin.governance.confirmNarrowing")}</p>
                )}
                {description.turnsManageOn && (
                  <p>{t("catalogs.admin.governance.confirmRule006")}</p>
                )}
                {description.turnsExtensibleOff && (
                  <p>
                    {t("catalogs.admin.governance.confirmRule006Narrowing")}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor={reasonId}>
              {t("catalogs.admin.governance.reasonLabel")}
            </Label>
            <Textarea
              id={reasonId}
              value={reason}
              maxLength={GOVERNANCE_REASON_MAX_LENGTH}
              aria-describedby={hintId}
              disabled={loading}
              onChange={(event) => setReason(event.target.value)}
            />
            <div className="flex justify-between gap-2 text-xs text-muted-foreground">
              <span id={hintId}>
                {t("catalogs.admin.governance.reasonHint")}
              </span>
              <span data-testid="catalog-governance-reason-counter">
                {`${reason.length}/${GOVERNANCE_REASON_MAX_LENGTH}`}
              </span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              {t("catalogs.admin.governance.cancelButton")}
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={!canConfirm}
              onClick={() => onConfirm(trimmedReason)}
            >
              {loading && (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {t("catalogs.admin.governance.confirmButton")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
