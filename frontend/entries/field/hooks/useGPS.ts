/**
 * useGPS — GPS location capture with explicit timeout and error classification.
 *
 * - Uses navigator.geolocation.getCurrentPosition with 10s timeout
 * - maximumAge: 60s (accept a cached position up to 1 minute old in field conditions)
 * - Classifies GeolocationPositionError codes into meaningful messages
 * - `capture()` can be called repeatedly to re-acquire position
 */

import { useState, useCallback } from "react";

export type GPSErrorKind =
  | "PERMISSION_DENIED"
  | "POSITION_UNAVAILABLE"
  | "TIMEOUT"
  | "NOT_SUPPORTED";

export interface GPSCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface UseGPSReturn {
  coords: GPSCoords | null;
  error: GPSErrorKind | null;
  isLoading: boolean;
  capture: () => void;
  clear: () => void;
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
};

export function useGPS(): UseGPSReturn {
  const [coords, setCoords] = useState<GPSCoords | null>(null);
  const [error, setError] = useState<GPSErrorKind | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const capture = useCallback(() => {
    if (!navigator.geolocation) {
      setError("NOT_SUPPORTED");
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        });
        setIsLoading(false);
      },
      (err) => {
        // Use numeric codes (1, 2, 3) — GeolocationPositionError global
        // is not available in all environments (e.g. jsdom test runner).
        let kind: GPSErrorKind = "POSITION_UNAVAILABLE";
        if (err.code === 1) {
          kind = "PERMISSION_DENIED";
        } else if (err.code === 3) {
          kind = "TIMEOUT";
        }
        setError(kind);
        setIsLoading(false);
      },
      GEO_OPTIONS
    );
  }, []);

  const clear = useCallback(() => {
    setCoords(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { coords, error, isLoading, capture, clear };
}
