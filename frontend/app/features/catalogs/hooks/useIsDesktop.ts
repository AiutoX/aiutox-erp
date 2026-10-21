/**
 * Tracks the admin screen's master-detail breakpoint (Tailwind `lg`,
 * >=1024px), AC-UI-27. SSR-safe: reports `false` until mounted in a browser.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useEffect, useState } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";

function matchesDesktop(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia(DESKTOP_QUERY).matches;
}

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(matchesDesktop);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const media = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event: MediaQueryListEvent) =>
      setIsDesktop(event.matches);
    setIsDesktop(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
