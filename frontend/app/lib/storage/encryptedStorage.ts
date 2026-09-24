/**
 * Encrypted local storage utilities
 *
 * Provides secure encryption/decryption using Web Crypto API (AES-GCM)
 * for storing sensitive data in localStorage with tenant-specific keys.
 *
 * Security:
 * - Uses AES-GCM encryption (authenticated encryption)
 * - Keys derived from tenant_id + secret
 * - Each user has independent encryption keys
 * - Data expires after 30 days (TTL)
 */

/**
 * Encrypted data structure
 */
interface EncryptedData {
  /** Encrypted data (base64) */
  data: string;
  /** Initialization vector (base64) */
  iv: string;
  /** Timestamp when data was encrypted */
  timestamp: number;
  /** Time to live in milliseconds (default: 30 days) */
  ttl?: number;
}

/**
 * Default TTL: 30 days in milliseconds
 */
const DEFAULT_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Derive encryption key from tenant ID and secret
 * Uses PBKDF2 for key derivation
 */
async function deriveKey(
  tenantId: string,
  secret: string,
  algorithm: string = "AES-GCM"
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`${tenantId}:${secret}`),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  const salt = encoder.encode(`salt-${tenantId}`);
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: algorithm,
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );

  return key;
}

/**
 * Encrypt data using AES-GCM
 */
export async function encrypt(
  data: string,
  tenantId: string,
  secret: string
): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive key
  const key = await deriveKey(tenantId, secret);

  // Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    dataBuffer
  );

  // Convert to base64
  const encryptedArray = Array.from(new Uint8Array(encryptedBuffer));
  const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return {
    data: encryptedBase64,
    iv: ivBase64,
    timestamp: Date.now(),
    ttl: DEFAULT_TTL,
  };
}

/**
 * Decrypt data using AES-GCM
 */
export async function decrypt(
  encryptedData: EncryptedData,
  tenantId: string,
  secret: string
): Promise<string> {
  // Check if data has expired
  if (encryptedData.ttl && encryptedData.timestamp) {
    const age = Date.now() - encryptedData.timestamp;
    if (age > encryptedData.ttl) {
      throw new Error("Encrypted data has expired");
    }
  }

  // Convert from base64
  const encryptedArray = Uint8Array.from(atob(encryptedData.data), (c) =>
    c.charCodeAt(0)
  );
  const iv = Uint8Array.from(atob(encryptedData.iv), (c) => c.charCodeAt(0));

  // Derive key
  const key = await deriveKey(tenantId, secret);

  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedArray
  );

  // Convert to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Set encrypted data in localStorage
 */
export async function setEncrypted(
  key: string,
  data: unknown,
  tenantId: string,
  secret: string
): Promise<void> {
  const dataString = JSON.stringify(data);
  const encrypted = await encrypt(dataString, tenantId, secret);
  const storageKey = `encrypted:${key}`;
  localStorage.setItem(storageKey, JSON.stringify(encrypted));
}

/**
 * Get and decrypt data from localStorage
 */
export async function getEncrypted<T>(
  key: string,
  tenantId: string,
  secret: string
): Promise<T | null> {
  const storageKey = `encrypted:${key}`;
  const stored = localStorage.getItem(storageKey);

  if (!stored) {
    return null;
  }

  try {
    const encryptedData: EncryptedData = JSON.parse(stored);
    const decrypted = await decrypt(encryptedData, tenantId, secret);
    return JSON.parse(decrypted) as T;
  } catch (error) {
    // If decryption fails (e.g., expired, wrong key), remove the data
    localStorage.removeItem(storageKey);
    console.warn(`Failed to decrypt data for key ${key}:`, error);
    return null;
  }
}

/**
 * Remove encrypted data from localStorage
 */
export function removeEncrypted(key: string): void {
  const storageKey = `encrypted:${key}`;
  localStorage.removeItem(storageKey);
}

/**
 * Clear all expired encrypted data
 *
 * Scans localStorage for encrypted data and removes expired entries
 */
export async function clearExpiredEncrypted(
  _tenantId: string,
  _secret: string
): Promise<number> {
  let clearedCount = 0;
  const keys: string[] = [];

  // Collect all encrypted keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("encrypted:")) {
      keys.push(key);
    }
  }

  // Check and remove expired entries
  for (const key of keys) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const encryptedData: EncryptedData = JSON.parse(stored);
        if (encryptedData.ttl && encryptedData.timestamp) {
          const age = Date.now() - encryptedData.timestamp;
          if (age > encryptedData.ttl) {
            localStorage.removeItem(key);
            clearedCount++;
          }
        }
      }
    } catch (error) {
      // If parsing fails, remove the entry
      localStorage.removeItem(key);
      clearedCount++;
    }
  }

  return clearedCount;
}

/**
 * Cache user data with encryption
 *
 * @param userId - User ID
 * @param data - Data to cache
 * @param tenantId - Tenant ID
 * @param secret - Secret for encryption
 */
export async function cacheUserData(
  userId: string,
  data: unknown,
  tenantId: string,
  secret: string
): Promise<void> {
  const key = `user:${userId}`;
  await setEncrypted(key, data, tenantId, secret);
}

/**
 * Get cached user data
 *
 * @param userId - User ID
 * @param tenantId - Tenant ID
 * @param secret - Secret for decryption
 * @returns Cached data or null if not found/expired
 */
export async function getCachedUserData<T>(
  userId: string,
  tenantId: string,
  secret: string
): Promise<T | null> {
  const key = `user:${userId}`;
  return getEncrypted<T>(key, tenantId, secret);
}
