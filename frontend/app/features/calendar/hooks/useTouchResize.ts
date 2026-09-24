/**
 * useTouchResize hook
 * Provides throttled touch event handling for mobile calendar resize operations.
 * Uses requestAnimationFrame for smooth visual updates on touch devices.
 */

import { useCallback, useRef } from "react";

interface TouchResizeState {
  startY: number;
  startX: number;
  currentY: number;
  currentX: number;
  isResizing: boolean;
}

interface UseTouchResizeOptions {
  /** Throttle interval in ms (default: 16ms ≈ 60fps) */
  throttleMs?: number;
  /** Minimum drag distance in px to trigger resize (default: 10) */
  minDragDistance?: number;
  /** Called on each throttled touch move with delta values */
  onTouchMove?: (deltaX: number, deltaY: number) => void;
  /** Called when touch resize starts */
  onTouchStart?: () => void;
  /** Called when touch resize ends with final delta values */
  onTouchEnd?: (deltaX: number, deltaY: number) => void;
}

/**
 * Hook that provides throttled touch handlers for resize operations on mobile.
 * - Throttles touchmove events using requestAnimationFrame
 * - Tracks drag distance to prevent accidental resizes
 * - Provides delta values for resize calculations
 */
export function useTouchResize({
  throttleMs = 16,
  minDragDistance = 10,
  onTouchMove,
  onTouchStart,
  onTouchEnd,
}: UseTouchResizeOptions = {}) {
  const stateRef = useRef<TouchResizeState>({
    startY: 0,
    startX: 0,
    currentY: 0,
    currentX: 0,
    isResizing: false,
  });

  const lastCallRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    stateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isResizing: false,
    };
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      const state = stateRef.current;
      state.currentX = touch.clientX;
      state.currentY = touch.clientY;

      const deltaX = state.currentX - state.startX;
      const deltaY = state.currentY - state.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Activate resize only after minimum drag distance
      if (!state.isResizing && distance >= minDragDistance) {
        state.isResizing = true;
        onTouchStart?.();
      }

      if (!state.isResizing) return;

      // Prevent scroll while resizing
      e.preventDefault();

      // Throttle updates
      const now = Date.now();
      if (now - lastCallRef.current < throttleMs) return;
      lastCallRef.current = now;

      // Use rAF for smooth visual updates
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        onTouchMove?.(deltaX, deltaY);
        rafRef.current = null;
      });
    },
    [throttleMs, minDragDistance, onTouchMove, onTouchStart]
  );

  const handleTouchEnd = useCallback(() => {
    const state = stateRef.current;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (state.isResizing) {
      const deltaX = state.currentX - state.startX;
      const deltaY = state.currentY - state.startY;
      onTouchEnd?.(deltaX, deltaY);
    }

    stateRef.current = {
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isResizing: false,
    };
  }, [onTouchEnd]);

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
    isResizing: stateRef.current.isResizing,
  };
}
