/**
 * Encryption Secret Store
 *
 * Manages the encryption secret obtained from the backend.
 * The secret is cached in memory (not localStorage) for security.
 */

import { create } from "zustand";
import { getEncryptionSecret } from "~/lib/api/security.api";

interface EncryptionState {
  secret: string | null;
  expiresAt: number | null; // Timestamp
  isLoading: boolean;
  error: Error | null;
  fetchSecret: () => Promise<string | null>;
  clearSecret: () => void;
  isExpired: () => boolean;
}

/**
 * Default expiration time: 24 hours
 */
const DEFAULT_EXPIRATION_MS = 24 * 60 * 60 * 1000;

export const useEncryptionStore = create<EncryptionState>((set, get) => ({
  secret: null,
  expiresAt: null,
  isLoading: false,
  error: null,

  /**
   * Fetch encryption secret from backend
   *
   * Caches the secret in memory and sets expiration.
   * If secret is already cached and not expired, returns cached value.
   */
  fetchSecret: async () => {
    const state = get();

    // Return cached secret if still valid
    if (state.secret && !state.isExpired()) {
      return state.secret;
    }

    // If already loading, wait a bit and retry
    if (state.isLoading) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return get().fetchSecret();
    }

    set({ isLoading: true, error: null });

    try {
      const response = await getEncryptionSecret();
      const expiresAt = response.expires_at
        ? new Date(response.expires_at).getTime()
        : Date.now() + DEFAULT_EXPIRATION_MS;

      set({
        secret: response.secret,
        expiresAt,
        isLoading: false,
        error: null,
      });

      return response.secret;
    } catch (error) {
      const err =
        error instanceof Error
          ? error
          : new Error("Failed to fetch encryption secret");
      set({
        secret: null,
        expiresAt: null,
        isLoading: false,
        error: err,
      });

      console.error("Failed to fetch encryption secret:", err);
      return null;
    }
  },

  /**
   * Clear cached secret
   */
  clearSecret: () => {
    set({
      secret: null,
      expiresAt: null,
      error: null,
    });
  },

  /**
   * Check if cached secret is expired
   */
  isExpired: () => {
    const { expiresAt } = get();
    if (!expiresAt) return true;
    return Date.now() >= expiresAt;
  },
}));
