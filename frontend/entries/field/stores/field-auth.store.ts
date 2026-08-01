/**
 * Zustand store for AiutoX Field App authentication state.
 *
 * Tracks:
 *  - Whether the current device session has been verified via PIN
 *  - The userId and tenantId from the backing ERP JWT
 *  - Session expiry (based on token exp)
 *
 * This store does NOT manage JWT tokens — that is the responsibility of
 * the shared `useAuthStore` from ~/stores/authStore.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface FieldAuthState {
  /** True once the user has entered the correct PIN for this session. */
  pinVerified: boolean;
  /** ERP user id (from JWT). */
  userId: string | null;
  /** ERP tenant id (from JWT). */
  tenantId: string | null;
  /** Session expiry timestamp (ms). Derived from JWT exp. */
  sessionExpiry: number | null;

  setPinVerified: (
    userId: string,
    tenantId: string,
    sessionExpiry: number
  ) => void;
  clearSession: () => void;
}

export const useFieldAuthStore = create<FieldAuthState>()(
  persist(
    (set) => ({
      pinVerified: false,
      userId: null,
      tenantId: null,
      sessionExpiry: null,

      setPinVerified: (userId, tenantId, sessionExpiry) =>
        set({ pinVerified: true, userId, tenantId, sessionExpiry }),

      clearSession: () =>
        set({
          pinVerified: false,
          userId: null,
          tenantId: null,
          sessionExpiry: null,
        }),
    }),
    {
      name: "field-auth-storage",
      // Only persist userId/tenantId/expiry — not pinVerified (re-verify each app open)
      partialize: (state) => ({
        userId: state.userId,
        tenantId: state.tenantId,
        sessionExpiry: state.sessionExpiry,
        // pinVerified intentionally NOT persisted: must re-verify PIN each app restart
        pinVerified: false,
      }),
    }
  )
);
