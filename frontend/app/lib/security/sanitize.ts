/**
 * Input sanitization utilities
 *
 * Provides functions to sanitize user inputs and prevent XSS attacks
 * Following OWASP guidelines for input validation
 */

/**
 * Sanitize a string by removing potentially dangerous characters
 *
 * Security: Prevents XSS attacks by removing script tags, event handlers,
 * and dangerous protocols. This is a basic sanitizer - for production HTML
 * content, use a library like DOMPurify.
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove null bytes and control characters
  // eslint-disable-next-line no-control-regex
  let sanitized = input.replace(/[\0\u0008\u0009\u001a\n\r]/g, "");

  // Remove script tags and their content (case-insensitive, multiline)
  sanitized = sanitized.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );

  // Remove iframe tags (potential XSS vector)
  sanitized = sanitized.replace(
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    ""
  );

  // Remove event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, "");

  // Remove javascript: protocol (case-insensitive)
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove data: URLs that could be used for XSS
  sanitized = sanitized.replace(/data:text\/html/gi, "");
  sanitized = sanitized.replace(/data:image\/svg\+xml/gi, "");

  // Remove vbscript: protocol
  sanitized = sanitized.replace(/vbscript:/gi, "");

  // Remove expression() in CSS (IE-specific XSS vector)
  sanitized = sanitized.replace(/expression\s*\(/gi, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize an email address
 *
 * @param email - Email to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== "string") {
    return "";
  }

  // Basic email validation pattern (RFC 5322 simplified)
  const emailPattern =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // Remove dangerous characters but keep valid email format
  let sanitized = email.trim().toLowerCase();

  // Remove null bytes, control characters, and potentially dangerous sequences
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\0\u0008\u0009\u001a\n\r"'\\%<>]/g, "");

  // Additional check: prevent script injection attempts
  if (/<script|javascript:|data:/i.test(sanitized)) {
    return "";
  }

  // Validate email format
  if (!emailPattern.test(sanitized)) {
    return "";
  }

  // Length check (RFC 5321: max 320 characters)
  if (sanitized.length > 320) {
    return "";
  }

  return sanitized;
}

/**
 * Sanitize a URL
 *
 * @param url - URL to sanitize
 * @param allowedProtocols - Array of allowed protocols (default: ['http', 'https'])
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ["http", "https"]
): string {
  if (typeof url !== "string") {
    return "";
  }

  let sanitized = url.trim();

  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/^(javascript|data|vbscript):/i, "");

  // Check if URL starts with allowed protocol
  const hasAllowedProtocol = allowedProtocols.some((protocol) =>
    sanitized.toLowerCase().startsWith(`${protocol}:`)
  );

  if (
    !hasAllowedProtocol &&
    !sanitized.startsWith("/") &&
    !sanitized.startsWith("#")
  ) {
    // If no protocol and not relative, prepend https://
    sanitized = `https://${sanitized}`;
  }

  try {
    // Validate URL
    const urlObj = new URL(sanitized);

    // Check protocol is allowed
    const protocol = urlObj.protocol.replace(":", "");
    if (!allowedProtocols.includes(protocol)) {
      return "";
    }

    // Additional security: prevent javascript: and data: in href attributes
    // This is already handled above, but double-check
    if (
      protocol === "javascript" ||
      protocol === "data" ||
      protocol === "vbscript"
    ) {
      return "";
    }

    return sanitized;
  } catch {
    // If URL parsing fails, return empty string
    return "";
  }
}

/**
 * Sanitize HTML content (basic)
 *
 * WARNING: This is a basic sanitizer. For production HTML content that will
 * be rendered, use a library like DOMPurify for comprehensive protection.
 *
 * This function provides basic protection but may not catch all XSS vectors.
 *
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== "string") {
    return "";
  }

  // Remove script tags and their content
  let sanitized = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );

  // Remove iframe tags
  sanitized = sanitized.replace(
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    ""
  );

  // Remove object and embed tags (potential XSS vectors)
  sanitized = sanitized.replace(
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    ""
  );
  sanitized = sanitized.replace(
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    ""
  );

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, "");

  // Remove javascript: in attributes
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove data: URLs that could execute code
  sanitized = sanitized.replace(/data:text\/html/gi, "");
  sanitized = sanitized.replace(/data:image\/svg\+xml/gi, "");

  // Remove vbscript:
  sanitized = sanitized.replace(/vbscript:/gi, "");

  return sanitized;
}

/**
 * Sanitize a phone number
 *
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number (only digits, +, -, spaces, parentheses)
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== "string") {
    return "";
  }

  // Remove null bytes and control characters
  // eslint-disable-next-line no-control-regex
  let sanitized = phone.replace(/[\0\u0008\u0009\u001a\n\r]/g, "");

  // Keep only digits, +, -, spaces, and parentheses
  sanitized = sanitized.replace(/[^\d+\-()\s]/g, "").trim();

  // Length check (E.164 max length is 15 digits, but allow formatting)
  if (sanitized.length > 30) {
    return sanitized.substring(0, 30);
  }

  return sanitized;
}

/**
 * Sanitize a number input
 *
 * Security: Validates number range and prevents NaN/Infinity values
 *
 * @param input - Number string to sanitize
 * @param min - Minimum value (optional)
 * @param max - Maximum value (optional)
 * @returns Sanitized number or NaN if invalid
 */
export function sanitizeNumber(
  input: string | number,
  min?: number,
  max?: number
): number {
  const num = typeof input === "string" ? parseFloat(input) : input;

  // Check for NaN and Infinity
  if (isNaN(num) || !isFinite(num)) {
    return NaN;
  }

  // Validate range
  if (min !== undefined && num < min) {
    return NaN;
  }

  if (max !== undefined && num > max) {
    return NaN;
  }

  return num;
}

/**
 * Sanitize an object recursively
 *
 * @param obj - Object to sanitize
 * @param deep - Whether to sanitize nested objects (default: true)
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  deep: boolean = true
): T {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (typeof item === "string") {
        return sanitizeString(item);
      } else if (deep && typeof item === "object" && item !== null) {
        return sanitizeObject(item as Record<string, unknown>, deep);
      }
      return item;
    }) as unknown as T;
  }

  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      const value = sanitized[key];

      if (typeof value === "string") {
        // Sanitize string values
        (sanitized as Record<string, unknown>)[key] = sanitizeString(value);
      } else if (deep && typeof value === "object" && value !== null) {
        // Recursively sanitize nested objects
        (sanitized as Record<string, unknown>)[key] = sanitizeObject(
          value as Record<string, unknown>,
          deep
        );
      }
    }
  }

  return sanitized;
}
