/**
 * useReturnFocus -- returns keyboard focus to the control that opened a
 * dialog or sheet when it closes (ISSUE-045, AC-UI-28).
 *
 * The catalogs screen opens its overlays (governance confirm dialog, item
 * edit/add dialog, history sheet) as controlled Radix dialogs with no
 * `DialogTrigger`. Radix's modal content focuses `triggerRef` on close and
 * prevents FocusScope's own "return to the previously focused element"
 * fallback, so without a trigger focus lands on `<body>` (verified with
 * @radix-ui/react-dialog 1.1.23 and the catalogs Playwright spec).
 *
 * The hook captures the focused element when the overlay opens and returns
 * an `onCloseAutoFocus` handler that restores it. An overlay opened from a
 * dropdown-menu item is returned to the menu's trigger (the item itself is
 * gone by then): Radix's `DropdownMenuContent` names its trigger through
 * `aria-labelledby`. When the target is no longer in the document the
 * handler does nothing and Radix's default applies.
 *
 * AiutoX ERP Core -- Frankpach
 */

import { useCallback, useLayoutEffect, useRef } from "react";

/** The element focus should return to, given the element focused at open time. */
export function resolveReturnFocusTarget(
  active: Element | null
): HTMLElement | null {
  if (
    !(active instanceof HTMLElement) ||
    active === active.ownerDocument.body
  ) {
    return null;
  }
  const menu = active.closest('[role="menu"]');
  if (!menu) return active;
  const triggerId = menu.getAttribute("aria-labelledby");
  const trigger = triggerId
    ? active.ownerDocument.getElementById(triggerId)
    : null;
  return trigger instanceof HTMLElement ? trigger : null;
}

/**
 * @param open whether the overlay is open; the opener is captured when it
 *   becomes true (on mount for an overlay mounted only while open).
 * @returns the `onCloseAutoFocus` handler for the overlay's Content.
 */
export function useReturnFocus(open: boolean): (event: Event) => void {
  const target = useRef<HTMLElement | null>(null);

  // A layout effect runs before Radix's FocusScope moves focus into the
  // content (a passive effect), so the opener is still the active element.
  useLayoutEffect(() => {
    if (open) {
      target.current = resolveReturnFocusTarget(document.activeElement);
    }
  }, [open]);

  return useCallback((event: Event) => {
    const element = target.current;
    target.current = null;
    if (element && element.isConnected) {
      event.preventDefault();
      element.focus();
    }
  }, []);
}
