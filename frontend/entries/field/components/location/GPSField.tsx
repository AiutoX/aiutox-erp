/**
 * GPSField — field-mode replacement for the standard FormRenderer location field.
 *
 * - Auto-captures GPS on mount (10s timeout, explicit accuracy display)
 * - "Re-capture" button (≥64px) for manual re-acquisition
 * - Falls back to manual lat/lng inputs on timeout or permission denied
 * - Always shows accuracy so the technician can decide if it's acceptable
 * - Value shape: { lat: number, lng: number } — same as FormRenderer location
 */

import { useEffect, useState } from "react";
import { useGPS, type GPSErrorKind } from "../../hooks/useGPS";
import { useFieldTranslation } from "../../i18n/useFieldTranslation";
import type { DCFieldDefinition } from "~/features/data_collection/types/data_collection.types";

interface LocationValue {
  lat: number | string;
  lng: number | string;
}

interface GPSFieldProps {
  field: DCFieldDefinition;
  value: unknown;
  onChange: (val: unknown) => void;
  disabled?: boolean;
}

function errorKey(kind: GPSErrorKind): string {
  switch (kind) {
    case "PERMISSION_DENIED":
      return "field.gps.errorPermission";
    case "TIMEOUT":
      return "field.gps.errorTimeout";
    case "NOT_SUPPORTED":
      return "field.gps.errorNotSupported";
    default:
      return "field.gps.errorUnavailable";
  }
}

export function GPSField({
  field,
  value,
  onChange,
  disabled = false,
}: GPSFieldProps) {
  const { t } = useFieldTranslation();
  const { coords, error, isLoading, capture } = useGPS();
  const [showManual, setShowManual] = useState(false);

  const currentVal = value as LocationValue | null | undefined;
  const manualLat = currentVal?.lat ?? "";
  const manualLng = currentVal?.lng ?? "";

  // Auto-capture on mount
  useEffect(() => {
    capture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push coords into form values whenever GPS succeeds
  useEffect(() => {
    if (coords) {
      onChange({ lat: coords.lat, lng: coords.lng });
      setShowManual(false);
    }
  }, [coords, onChange]);

  // Show manual inputs when error occurs (if not already showing coords)
  useEffect(() => {
    if (error && !coords) {
      setShowManual(true);
    }
  }, [error, coords]);

  const label = (
    <label
      className="block text-sm font-medium text-foreground mb-2"
      htmlFor={`${field.id}-lat`}
    >
      {field.label}
      {field.required && <span className="text-destructive ml-1">*</span>}
    </label>
  );

  // ── GPS captured successfully ────────────────────────────────────────────
  if (coords && !showManual) {
    return (
      <div className="space-y-3">
        {label}
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 space-y-1">
          <p className="text-sm font-mono text-foreground">
            {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("field.gps.accuracy", { meters: coords.accuracy })}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={capture}
            disabled={disabled || isLoading}
            className="min-h-[64px] flex-1 rounded-2xl border border-border bg-background text-sm font-medium text-foreground disabled:opacity-40 active:scale-95 transition-transform"
          >
            {isLoading ? t("field.gps.capturing") : t("field.gps.recapture")}
          </button>
          <button
            type="button"
            onClick={() => setShowManual(true)}
            disabled={disabled}
            className="min-h-[64px] px-4 rounded-2xl border border-border bg-background text-sm font-medium text-muted-foreground disabled:opacity-40"
          >
            {t("field.gps.manual")}
          </button>
        </div>
      </div>
    );
  }

  // ── Loading / capturing ──────────────────────────────────────────────────
  if (isLoading && !showManual) {
    return (
      <div className="space-y-3">
        {label}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">
            {t("field.gps.capturing")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="min-h-[64px] w-full rounded-2xl border border-border bg-background text-sm font-medium text-muted-foreground"
        >
          {t("field.gps.skipToManual")}
        </button>
      </div>
    );
  }

  // ── Manual input (fallback or user preference) ───────────────────────────
  return (
    <div className="space-y-3">
      {label}

      {error && (
        <div
          role="alert"
          className="rounded-xl bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-200"
        >
          {t(errorKey(error))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`${field.id}-lat`}
          >
            {t("field.gps.latitude")}
          </label>
          <input
            id={`${field.id}-lat`}
            type="number"
            inputMode="decimal"
            step="any"
            disabled={disabled}
            value={
              typeof manualLat === "number" ? manualLat : String(manualLat)
            }
            onChange={(e) => onChange({ lat: e.target.value, lng: manualLng })}
            placeholder="-90 … 90"
            className="min-h-[56px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>
        <div className="space-y-1">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`${field.id}-lng`}
          >
            {t("field.gps.longitude")}
          </label>
          <input
            id={`${field.id}-lng`}
            type="number"
            inputMode="decimal"
            step="any"
            disabled={disabled}
            value={
              typeof manualLng === "number" ? manualLng : String(manualLng)
            }
            onChange={(e) => onChange({ lat: manualLat, lng: e.target.value })}
            placeholder="-180 … 180"
            className="min-h-[56px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setShowManual(false);
          capture();
        }}
        disabled={disabled || isLoading}
        className="min-h-[64px] w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-40 active:scale-95 transition-transform"
      >
        {isLoading ? t("field.gps.capturing") : t("field.gps.useMyLocation")}
      </button>
    </div>
  );
}
