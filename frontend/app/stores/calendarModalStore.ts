import { create } from "zustand";

interface CalendarModalState {
  isOpen: boolean;
  from: string | null;
  open: (from: string) => void;
  close: (options?: { updateHistory?: boolean }) => void;
}

export const useCalendarModalStore = create<CalendarModalState>((set, get) => ({
  isOpen: false,
  from: null,
  open: (from) => {
    if (typeof window !== "undefined") {
      window.history.pushState({ calendarModal: true, from }, "", "/calendar");
    }
    set({ isOpen: true, from });
  },
  close: (options) => {
    const from = get().from || "/";
    if (typeof window !== "undefined" && options?.updateHistory !== false) {
      window.history.replaceState({}, "", from);
    }
    set({ isOpen: false, from: null });
  },
}));
