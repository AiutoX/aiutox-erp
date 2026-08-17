/**
 * ScanButton — camera/barcode icon button appended to text/number inputs.
 *
 * - Only rendered when navigator.mediaDevices.getUserMedia is available
 * - Opens QRScanner modal on click; calls onScan when a code is decoded
 * - min-w-[48px] min-h-[48px] for comfortable touch targets
 */

import { useState } from "react";
import { QRScanner } from "./QRScanner";
import { useFieldTranslation } from "../../i18n/useFieldTranslation";

interface ScanButtonProps {
  onScan: (value: string) => void;
  disabled?: boolean;
}

function hasCameraSupport(): boolean {
  return (
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia
  );
}

export function ScanButton({ onScan, disabled = false }: ScanButtonProps) {
  const { t } = useFieldTranslation();
  const [open, setOpen] = useState(false);

  if (!hasCameraSupport()) return null;

  function handleScan(value: string) {
    onScan(value);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("field.scanner.openButton")}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="shrink-0 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
      >
        {/* Barcode / QR icon (inline SVG — no external icon lib dependency) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <rect x="7" y="7" width="3" height="10" rx="1" />
          <rect x="14" y="7" width="3" height="10" rx="1" />
        </svg>
      </button>

      {open && <QRScanner onScan={handleScan} onClose={() => setOpen(false)} />}
    </>
  );
}
