/**
 * useQRScan — manages the QR/Barcode scanner lifecycle.
 *
 * - Requests camera permission and starts a MediaStream on `start()`
 * - Continuously captures frames via requestAnimationFrame + OffscreenCanvas
 * - Calls `onScan(value)` when a barcode is decoded
 * - Releases the MediaStream on `stop()` or when the component unmounts
 * - `isScanning` is true while the camera is active
 * - `error` contains the last error message (permission denied, not supported, etc.)
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { decodeBarcode } from "../lib/zxing";

export interface UseQRScanOptions {
  onScan: (value: string) => void;
}

export interface UseQRScanReturn {
  isScanning: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start: () => Promise<void>;
  stop: () => void;
}

export function useQRScan({ onScan }: UseQRScanOptions): UseQRScanReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stop = useCallback(() => {
    activeRef.current = false;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  }, []);

  const scanLoop = useCallback(() => {
    if (!activeRef.current) return;

    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);

    decodeBarcode(imageData)
      .then((text) => {
        if (text && activeRef.current) {
          try {
            navigator.vibrate?.(200);
          } catch {
            // vibration not supported — ignore
          }
          onScan(text);
          stop();
        } else if (activeRef.current) {
          rafRef.current = requestAnimationFrame(scanLoop);
        }
      })
      .catch(() => {
        if (activeRef.current) {
          rafRef.current = requestAnimationFrame(scanLoop);
        }
      });
  }, [onScan, stop]);

  const start = useCallback(async () => {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera not supported on this device.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      activeRef.current = true;
      setIsScanning(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => null);
      }

      rafRef.current = requestAnimationFrame(scanLoop);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("Permission") ||
        msg.includes("NotAllowed") ||
        msg.includes("denied")
      ) {
        setError("Camera permission denied.");
      } else {
        setError("Could not start camera.");
      }
      setIsScanning(false);
    }
  }, [scanLoop]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { isScanning, error, videoRef, start, stop };
}
