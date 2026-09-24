/**
 * PIN authentication utilities for AiutoX Field App.
 *
 * Security model:
 *  - PIN is hashed with SHA-256 via Web Crypto API — never stored in plain text.
 *  - Hash is stored in localStorage keyed by userId.
 *  - Lockout: 3 consecutive failures → 30s lockout. State persisted in localStorage.
 */

const PIN_STORAGE_PREFIX = "field_pin_";
const LOCKOUT_STORAGE_PREFIX = "field_pin_lockout_";
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 30_000; // 30 seconds

interface LockoutState {
  attempts: number;
  lockedUntil: number | null; // timestamp ms
}

// ─── Hashing ─────────────────────────────────────────────────────────────────

/**
 * Hash a PIN string using SHA-256 via Web Crypto API.
 * Returns a hex string.
 */
export async function hashPIN(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Storage ─────────────────────────────────────────────────────────────────

/** Persist PIN hash for a given userId. */
export function storePIN(userId: string, hash: string): void {
  localStorage.setItem(`${PIN_STORAGE_PREFIX}${userId}`, hash);
  // Clear lockout state when a new PIN is configured
  clearLockout(userId);
}

/** Check if a PIN has been configured for this userId. */
export function hasPINConfigured(userId: string): boolean {
  return localStorage.getItem(`${PIN_STORAGE_PREFIX}${userId}`) !== null;
}

/** Remove PIN hash and lockout state for a userId (logout / reset). */
export function clearPIN(userId: string): void {
  localStorage.removeItem(`${PIN_STORAGE_PREFIX}${userId}`);
  clearLockout(userId);
}

// ─── Verification ────────────────────────────────────────────────────────────

/**
 * Verify a PIN for the given userId.
 * Tracks failed attempts and applies lockout after MAX_ATTEMPTS failures.
 * Returns true on success and resets the lockout counter.
 * Returns false on failure and increments the lockout counter.
 */
export async function verifyPIN(userId: string, pin: string): Promise<boolean> {
  const storedHash = localStorage.getItem(`${PIN_STORAGE_PREFIX}${userId}`);
  if (!storedHash) return false;

  const inputHash = await hashPIN(pin);
  const isCorrect = inputHash === storedHash;

  if (isCorrect) {
    clearLockout(userId);
    return true;
  }

  // Incorrect — increment attempt counter
  const state = getLockoutState(userId);
  const newAttempts = state.attempts + 1;

  if (newAttempts >= MAX_ATTEMPTS) {
    setLockoutState(userId, {
      attempts: newAttempts,
      lockedUntil: Date.now() + LOCKOUT_DURATION_MS,
    });
  } else {
    setLockoutState(userId, { attempts: newAttempts, lockedUntil: null });
  }

  return false;
}

// ─── Lockout ─────────────────────────────────────────────────────────────────

export interface LockoutStatus {
  locked: boolean;
  remainingMs: number;
  attempts: number;
}

/** Returns current lockout status for a userId. */
export function getLockout(userId: string): LockoutStatus {
  const state = getLockoutState(userId);

  if (state.lockedUntil !== null) {
    const remainingMs = state.lockedUntil - Date.now();
    if (remainingMs > 0) {
      return { locked: true, remainingMs, attempts: state.attempts };
    }
    // Lockout expired — reset
    clearLockout(userId);
  }

  return { locked: false, remainingMs: 0, attempts: state.attempts };
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function getLockoutState(userId: string): LockoutState {
  const raw = localStorage.getItem(`${LOCKOUT_STORAGE_PREFIX}${userId}`);
  if (!raw) return { attempts: 0, lockedUntil: null };
  try {
    return JSON.parse(raw) as LockoutState;
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

function setLockoutState(userId: string, state: LockoutState): void {
  localStorage.setItem(
    `${LOCKOUT_STORAGE_PREFIX}${userId}`,
    JSON.stringify(state)
  );
}

function clearLockout(userId: string): void {
  localStorage.removeItem(`${LOCKOUT_STORAGE_PREFIX}${userId}`);
}
