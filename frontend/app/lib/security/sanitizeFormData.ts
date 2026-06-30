/**
 * Form data sanitization utilities
 *
 * Reusable functions for sanitizing form data before submission
 */

import { sanitizeString, sanitizeEmail, sanitizeUrl } from "./sanitize";
import type { UserCreate, UserUpdate } from "~/features/users/types/user.types";

/**
 * Sanitize user form data
 */
export function sanitizeUserFormData(
  data: Partial<UserCreate | UserUpdate>
): Partial<UserCreate | UserUpdate> {
  const sanitized: Partial<UserCreate | UserUpdate> = {
    ...data,
  };

  // Only include fields that are not null/undefined/empty
  // Remove empty strings and convert them to null for optional fields
  if (data.email) {
    sanitized.email = sanitizeEmail(data.email);
  }
  if (data.first_name) {
    sanitized.first_name = sanitizeString(data.first_name);
  } else if (data.first_name === "") {
    sanitized.first_name = null;
  }
  if (data.last_name) {
    sanitized.last_name = sanitizeString(data.last_name);
  } else if (data.last_name === "") {
    sanitized.last_name = null;
  }
  if (data.middle_name) {
    sanitized.middle_name = sanitizeString(data.middle_name);
  } else if (data.middle_name === "") {
    sanitized.middle_name = null;
  }
  if (data.job_title) {
    sanitized.job_title = sanitizeString(data.job_title);
  } else if (data.job_title === "") {
    sanitized.job_title = null;
  }
  if (data.department) {
    sanitized.department = sanitizeString(data.department);
  } else if (data.department === "") {
    sanitized.department = null;
  }
  if (data.avatar_url) {
    sanitized.avatar_url = sanitizeUrl(data.avatar_url);
  } else if (data.avatar_url === "") {
    sanitized.avatar_url = null;
  }
  if (data.bio) {
    sanitized.bio = sanitizeString(data.bio);
  } else if (data.bio === "") {
    sanitized.bio = null;
  }
  if (data.notes) {
    sanitized.notes = sanitizeString(data.notes);
  } else if (data.notes === "") {
    sanitized.notes = null;
  }

  // Handle nationality - if empty string, set to null
  if (data.nationality === "") {
    sanitized.nationality = null;
  }

  // Remove undefined values to avoid sending them
  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key as keyof typeof sanitized] === undefined) {
      delete sanitized[key as keyof typeof sanitized];
    }
  });

  return sanitized;
}
