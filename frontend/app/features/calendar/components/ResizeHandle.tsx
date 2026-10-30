/**
 * ResizeHandle component
 * Provides draggable handles for resizing calendar events
 */

import { useDraggable } from "@dnd-kit/core";
import { cn } from "~/lib/utils";
import type { CalendarEvent } from "~/features/calendar/types/calendar.types";

interface ResizeHandleProps {
  event: CalendarEvent;
  direction: "left" | "right";
  textColor: string;
}

export function ResizeHandle({
  event,
  direction,
  textColor,
}: ResizeHandleProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `resize-${event.id}-${direction}`,
      data: {
        type: "resize",
        eventId: event.id,
        direction,
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const arrow = direction === "left" ? "◀" : "▶";
  const ariaLabel =
    direction === "left"
      ? "Redimensionar inicio del evento"
      : "Redimensionar fin del evento";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "resize-handle",
        "absolute top-1/2 -translate-y-1/2 z-10",
        "flex items-center justify-center",
        // Desktop: compact 16px, Mobile: 44px touch target
        "w-4 h-4 md:w-4 md:h-4",
        "touch-none cursor-ew-resize",
        "opacity-0 transition-opacity duration-150",
        "group-hover/event:opacity-80",
        "hover:opacity-100",
        "select-none",
        // Mobile: larger touch area via padding
        "before:absolute before:inset-[-14px] before:content-[''] md:before:inset-0",
        isDragging && "opacity-100 cursor-grabbing",
        // Posicionamiento en extremos
        direction === "left" ? "left-0" : "right-0"
      )}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <span className="text-xs leading-none" style={{ color: textColor }}>
        {arrow}
      </span>
    </div>
  );
}
