/**
 * useTouchGestures hook
 * Detects touch gestures: tap, drag, and long press on calendar events.
 * Uses requestAnimationFrame for smooth 60fps updates during drag.
 */

import { useCallback, useRef } from "react";

type GestureType = "tap" | "drag" | "longpress" | "none";

interface TouchGestureState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  gesture: GestureType;
  longPressTimer: ReturnType<typeof setTimeout> | null;
}

interface UseTouchGesturesOptions {
  /** Minimum distance in px to classify as drag (default: 10) */
  dragThreshold?: number;
  /** Duration in ms for long press detection (default: 500) */
  longPressDuration?: number;
  /** Throttle interval in ms for drag updates (default: 16 ≈ 60fps) */
  throttleMs?: number;
  /** Called on tap (short touch without movement) */
  onTap?: (x: number, y: number) => void;
  /** Called on long press */
  onLongPress?: (x: number, y: number) => void;
  /** Called on drag start */
  onDragStart?: (x: number, y: number) => void;
  /** Called on each throttled drag move */
  onDragMove?: (deltaX: number, deltaY: number) => void;
  /** Called when drag ends */
  onDragEnd?: (deltaX: number, deltaY: number) => void;
}

/**
 * Hook that provides unified touch gesture detection for calendar interactions.
 * Distinguishes between tap (click), long press (context menu), and drag (move/resize).
 */
export function useTouchGestures({
  dragThreshold = 10,
  longPressDuration = 500,
  throttleMs = 16,
  onTap,
  onLongPress,
  onDragStart,
  onDragMove,
  onDragEnd,
}: UseTouchGesturesOptions = {}) {
  const stateRef = useRef<TouchGestureState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    gesture: "none",
    longPressTimer: null,
  });

  const lastMoveRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    const state = stateRef.current;
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      clearTimers();

      const state = stateRef.current;
      state.startX = touch.clientX;
      state.startY = touch.clientY;
      state.currentX = touch.clientX;
      state.currentY = touch.clientY;
      state.startTime = Date.now();
      state.gesture = "none";

      // Start long press timer
      state.longPressTimer = setTimeout(() => {
        if (state.gesture === "none") {
          state.gesture = "longpress";
          onLongPress?.(state.startX, state.startY);
        }
      }, longPressDuration);
    },
    [clearTimers, longPressDuration, onLongPress]
  );

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

      // If moved beyond threshold, it's a drag — cancel long press
      if (state.gesture === "none" && distance >= dragThreshold) {
        clearTimers();
        state.gesture = "drag";
        onDragStart?.(state.startX, state.startY);
      }

      if (state.gesture !== "drag") return;

      // Prevent scroll while dragging
      e.preventDefault();

      // Throttle move updates
      const now = Date.now();
      if (now - lastMoveRef.current < throttleMs) return;
      lastMoveRef.current = now;

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        onDragMove?.(deltaX, deltaY);
        rafRef.current = null;
      });
    },
    [dragThreshold, throttleMs, clearTimers, onDragStart, onDragMove]
  );

  const handleTouchEnd = useCallback(() => {
    const state = stateRef.current;
    clearTimers();

    const deltaX = state.currentX - state.startX;
    const deltaY = state.currentY - state.startY;

    if (state.gesture === "drag") {
      onDragEnd?.(deltaX, deltaY);
    } else if (state.gesture === "none") {
      // Short touch without movement = tap
      const elapsed = Date.now() - state.startTime;
      if (elapsed < longPressDuration) {
        onTap?.(state.startX, state.startY);
      }
    }
    // longpress already fired in the timer callback

    state.gesture = "none";
  }, [clearTimers, onDragEnd, onTap, longPressDuration]);

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
  };
}
