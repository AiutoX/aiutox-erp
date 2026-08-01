/**
 * Rate limiting utilities for frontend
 *
 * Client-side rate limiting to prevent abuse
 * Note: This is a basic implementation. Real rate limiting should be done on the backend.
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RequestRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RequestRecord>();

/**
 * Clear rate limit store (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Check if a request should be rate limited
 *
 * @param key - Unique key for the rate limit (e.g., 'login', 'api-call')
 * @param config - Rate limit configuration
 * @returns true if request should be allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // If no record or window expired, create new record
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return true;
  }

  // Check if limit exceeded
  if (record.count >= config.maxRequests) {
    return false;
  }

  // Increment count
  record.count++;
  rateLimitStore.set(key, record);

  return true;
}

/**
 * Get remaining requests for a rate limit key
 *
 * @param key - Rate limit key
 * @param config - Rate limit configuration
 * @returns Number of remaining requests
 */
export function getRemainingRequests(
  key: string,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): number {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    return config.maxRequests;
  }

  return Math.max(0, config.maxRequests - record.count);
}

/**
 * Reset rate limit for a key
 *
 * @param key - Rate limit key to reset
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
  // Verify deletion
  if (rateLimitStore.has(key)) {
    console.warn(`[RateLimit] Failed to reset rate limit for key: ${key}`);
  }
}

/**
 * Rate limit decorator for async functions
 *
 * @param key - Rate limit key
 * @param config - Rate limit configuration
 * @param fn - Function to rate limit
 * @returns Wrapped function with rate limiting
 */
export function withRateLimit<
  T extends (...args: unknown[]) => Promise<unknown>,
>(key: string, config: RateLimitConfig, fn: T): T {
  return (async (...args: Parameters<T>) => {
    if (!checkRateLimit(key, config)) {
      const record = rateLimitStore.get(key);
      const resetAt = record?.resetAt || Date.now() + config.windowMs;
      const secondsRemaining = Math.ceil((resetAt - Date.now()) / 1000);
      throw new Error(
        `Rate limit exceeded. Please try again in ${secondsRemaining} seconds.`
      );
    }

    try {
      return await fn(...args);
    } catch (error) {
      // On error, don't count towards rate limit
      const record = rateLimitStore.get(key);
      if (record && record.count > 0) {
        record.count--;
        rateLimitStore.set(key, record);
      }
      throw error;
    }
  }) as T;
}
