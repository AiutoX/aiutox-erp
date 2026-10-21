/**
 * useEventQuickEdit hook
 * Manages popover state and quick edit logic for calendar events.
 * Handles open/close, form state, save mutation, and transition to full edit.
 */

import { useState, useCallback } from "react";
import { useUpdateEvent } from "~/features/calendar/hooks/useCalendar";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { showToast } from "~/components/common/Toast";
import type {
  CalendarEvent,
  EventUpdate,
} from "~/features/calendar/types/calendar.types";

interface QuickEditState {
  isOpen: boolean;
  event: CalendarEvent | null;
  anchorRect: DOMRect | null;
}

interface QuickEditFormData {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
}

export function useEventQuickEdit() {
  const { t } = useTranslation();
  const updateEvent = useUpdateEvent();

  const [state, setState] = useState<QuickEditState>({
    isOpen: false,
    event: null,
    anchorRect: null,
  });

  const open = useCallback((event: CalendarEvent, anchorRect?: DOMRect) => {
    setState({
      isOpen: true,
      event,
      anchorRect: anchorRect || null,
    });
  }, []);

  const close = useCallback(() => {
    setState({
      isOpen: false,
      event: null,
      anchorRect: null,
    });
  }, []);

  const save = useCallback(
    (formData: QuickEditFormData) => {
      if (!state.event) return;

      const payload: EventUpdate = {};

      if (formData.title !== state.event.title) {
        payload.title = formData.title;
      }
      if (formData.description !== (state.event.description || "")) {
        payload.description = formData.description;
      }
      if (formData.start_time !== state.event.start_time) {
        payload.start_time = formData.start_time;
      }
      if (formData.end_time !== state.event.end_time) {
        payload.end_time = formData.end_time;
      }

      // Only send if there are actual changes
      if (Object.keys(payload).length === 0) {
        close();
        return;
      }

      updateEvent.mutate(
        { id: state.event.id, payload },
        {
          onSuccess: () => {
            showToast(t("calendar.quickEdit.saved"), "success");
            close();
          },
          onError: () => {
            showToast(t("calendar.quickEdit.error"), "error");
          },
        }
      );
    },
    [state.event, updateEvent, close, t]
  );

  return {
    isOpen: state.isOpen,
    event: state.event,
    anchorRect: state.anchorRect,
    isSaving: updateEvent.isPending,
    open,
    close,
    save,
  };
}
