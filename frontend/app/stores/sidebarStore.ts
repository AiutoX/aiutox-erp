import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  toggleCollapse: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isSidebarOpen: false,
      isSidebarCollapsed: false,
      setIsSidebarOpen: (open) => set({ isSidebarOpen: open }),
      setIsSidebarCollapsed: (collapsed) =>
        set({ isSidebarCollapsed: collapsed }),
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      toggleCollapse: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    }),
    {
      name: "sidebar-storage",
      // Solo persistir isSidebarCollapsed, no isSidebarOpen (depende del viewport)
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
    }
  )
);
