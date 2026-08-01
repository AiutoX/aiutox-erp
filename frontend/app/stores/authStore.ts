import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../features/users/types/user.types";
import { scheduleProactiveRefresh, refreshAccessToken as standaloneRefreshAccessToken } from "../lib/api/client";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean; // Track if Zustand persist has hydrated
  setAuth: (user: User, token: string, refreshToken: string) => void;
  setRefreshToken: (refreshToken: string) => void;
  updateUser: (userData: Partial<User>) => void;
  refreshAccessToken: () => Promise<string | null>;
  clearAuth: () => void;
  _syncFromLocalStorage: () => boolean; // Internal method for syncing from localStorage
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false, // Track hydration state
      setAuth: (user, token, refreshToken) => {
        // Store access token in localStorage
        localStorage.setItem("auth_token", token);
        if (user?.tenant_id) {
          localStorage.setItem("aiutox:last_tenant_id", user.tenant_id);
        }
        // Refresh token is now stored in httpOnly cookie, not localStorage
        // We keep refreshToken in state for backward compatibility but don't store it
        set({ user, token, refreshToken, isAuthenticated: true });
      },
      // Helper to sync from localStorage (used when localStorage changes externally)
      _syncFromLocalStorage: () => {
        if (typeof window === "undefined") return false;

        const token = localStorage.getItem("auth_token");
        const refreshToken = localStorage.getItem("refresh_token");
        const storedState = localStorage.getItem("auth-storage");

        if (token && storedState) {
          try {
            const parsed = JSON.parse(storedState);
            if (parsed.state?.user && parsed.state?.isAuthenticated) {
              set({
                user: parsed.state.user,
                token: token,
                refreshToken: parsed.state.refreshToken || refreshToken || "",
                isAuthenticated: true,
              });
              scheduleProactiveRefresh(token);
              console.warn("[AuthStore] Synced from stored state");
              return true;
            }
          } catch {
            // Ignore parse errors
          }
        }

        // If we have a token but no stored state, set isAuthenticated to true
        // The app will fetch user data when needed
        if (token) {
          const currentState = get();
          set({
            ...currentState,
            token: token,
            refreshToken: refreshToken || currentState.refreshToken,
            isAuthenticated: true,
          });
          scheduleProactiveRefresh(token);
          console.warn("[AuthStore] Token found, setting isAuthenticated=true");
          return true;
        }

        return false;
      },
      setRefreshToken: (refreshToken: string) => {
        // Refresh token is now in cookie, not localStorage
        // Keep in state for backward compatibility
        set({ refreshToken });
      },
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },
      refreshAccessToken: async () => {
        // Use standalone refreshAccessToken (client without interceptors) to avoid infinite loop
        return standaloneRefreshAccessToken();
      },
      clearAuth: () => {
        localStorage.removeItem("auth_token");
        // Refresh token is in httpOnly cookie, cannot be deleted from JS
        // Cookie will be deleted by backend on logout or will expire
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });

        // Limpiar cache del Service Worker
        if (
          typeof navigator !== "undefined" &&
          "serviceWorker" in navigator &&
          navigator.serviceWorker && // ⚠️ CRÍTICO: Verificar que no sea null/undefined
          navigator.serviceWorker.controller
        ) {
          try {
            const messageChannel = new MessageChannel();

            messageChannel.port1.onmessage = (event) => {
              if (event.data.success) {
                console.warn("[Auth] Service Worker cache cleared");
              }
            };

            navigator.serviceWorker.controller.postMessage(
              { type: "CLEAR_AUTH_CACHE" },
              [messageChannel.port2]
            );
          } catch (error) {
            // Silently fail if SW communication fails
            console.warn("[Auth] Failed to clear SW cache:", error);
          }
        }

        // Clear encryption secret on logout
        import("~/stores/encryptionStore")
          .then(({ useEncryptionStore }) => {
            useEncryptionStore.getState().clearSecret();
          })
          .catch(() => {
            // Ignore errors if store not available
          });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      // Sync with localStorage changes from other contexts (e.g., tests)
      onRehydrateStorage: () => {
        return (state) => {
          // Mark as hydrated immediately
          if (typeof window !== "undefined") {
            useAuthStore.setState({ _hasHydrated: true });
          }
          // After rehydration, check if token exists in localStorage but not in state
          if (typeof window !== "undefined") {
            const token = localStorage.getItem("auth_token");
            const refreshToken = localStorage.getItem("refresh_token");

            // If we have tokens in localStorage but state is not authenticated, sync
            if (token && (!state?.token || !state?.isAuthenticated)) {
              // Try to get user data from the stored state
              const storedState = localStorage.getItem("auth-storage");
              if (storedState) {
                try {
                  const parsed = JSON.parse(storedState);
                  if (parsed.state?.user && parsed.state?.isAuthenticated) {
                    // Use stored state if available - update via store method
                    useAuthStore
                      .getState()
                      .setAuth(
                        parsed.state.user,
                        token,
                        parsed.state.refreshToken || refreshToken || ""
                      );
                    scheduleProactiveRefresh(token);
                    console.warn("[AuthStore] Synced from stored state");
                    return;
                  }
                } catch {
                  // Ignore parse errors
                }
              }

              // If we have a token but no user, set isAuthenticated to true
              // The app will fetch user data when needed (e.g., via /auth/me)
              const currentState = useAuthStore.getState();
              useAuthStore.setState({
                ...currentState,
                token: token,
                refreshToken: refreshToken || currentState.refreshToken,
                isAuthenticated: true,
              });
              scheduleProactiveRefresh(token);
              console.warn(
                "[AuthStore] Token found, setting isAuthenticated=true"
              );
            }

            // Set up storage event listener to sync when localStorage changes externally
            const handleStorageChange = (e: StorageEvent) => {
              if (e.key === "auth_token" || e.key === "auth-storage") {
                useAuthStore.getState()._syncFromLocalStorage();
              }
            };

            window.addEventListener("storage", handleStorageChange);

            // Also check periodically for changes (useful for same-tab changes in tests)
            const checkInterval = setInterval(() => {
              const currentToken = localStorage.getItem("auth_token");
              const currentState = useAuthStore.getState();
              if (currentToken && !currentState.isAuthenticated) {
                useAuthStore.getState()._syncFromLocalStorage();
              }
            }, 100);

            // Clean up interval after 5 seconds (should be enough for initial sync)
            setTimeout(() => clearInterval(checkInterval), 5000);
          }
        };
      },
    }
  )
);
