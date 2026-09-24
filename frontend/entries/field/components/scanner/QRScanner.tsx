/**
 * QRScanner — fullscreen modal camera overlay for QR/Barcode scanning.
 *
 * - Activates camera on mount (rear camera preferred)
 * - Displays live video preview with animated scan-line guide
 * - Calls onScan(value) and closes automatically on successful decode
 * - Cancel button stops the camera and closes the modal
 * - Error state shown if permission denied or camera unavailable
 */

import { useEffect } from "react";
import { useQRScan } from "../../hooks/useQRScan";
import { useFieldTranslation } from "../../i18n/useFieldTranslation";

interface QRScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const { t } = useFieldTranslation();

  const handleScan = (value: string) => {
    onScan(value);
    onClose();
  };

  const { isScanning, error, videoRef, start, stop } = useQRScan({
    onScan: handleScan,
  });

  useEffect(() => {
    void start();
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCancel() {
    stop();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("field.scanner.modalTitle")}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      {/* Video preview */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
          aria-label={t("field.scanner.videoLabel")}
        />

        {/* Scan guide overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {/* Dimmed surround */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Transparent scan window */}
          <div className="relative h-56 w-56 rounded-2xl ring-2 ring-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
            {/* Corner accents */}
            <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-2xl border-l-4 border-t-4 border-white" />
            <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-2xl border-r-4 border-t-4 border-white" />
            <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-2xl border-b-4 border-l-4 border-white" />
            <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-2xl border-b-4 border-r-4 border-white" />

            {/* Animated scan line */}
            {isScanning && (
              <span className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_6px_2px_rgba(239,68,68,0.8)] animate-[scan-line_2s_ease-in-out_infinite]" />
            )}
          </div>
        </div>

        {/* Status / error message */}
        <div className="absolute bottom-4 left-4 right-4">
          {error ? (
            <div
              role="alert"
              className="rounded-xl bg-destructive/90 px-4 py-3 text-center text-sm font-medium text-white"
            >
              {error.includes("permission") || error.includes("denied")
                ? t("field.scanner.permissionDenied")
                : t("field.scanner.errorGeneric")}
            </div>
          ) : !isScanning ? (
            <div className="rounded-xl bg-black/60 px-4 py-3 text-center text-sm text-white/80">
              {t("field.scanner.starting")}
            </div>
          ) : (
            <div className="rounded-xl bg-black/60 px-4 py-3 text-center text-sm text-white/80">
              {t("field.scanner.hint")}
            </div>
          )}
        </div>
      </div>

      {/* Cancel button */}
      <div className="shrink-0 bg-black p-4">
        <button
          type="button"
          onClick={handleCancel}
          className="min-h-[64px] w-full rounded-2xl bg-white/10 text-base font-semibold text-white active:bg-white/20 transition-colors"
        >
          {t("field.scanner.cancel")}
        </button>
      </div>

      {/* Scan-line animation keyframes */}
      <style>{`
        @keyframes scan-line {
          0%   { top: 8px; }
          50%  { top: calc(100% - 8px); }
          100% { top: 8px; }
        }
      `}</style>
    </div>
  );
}
