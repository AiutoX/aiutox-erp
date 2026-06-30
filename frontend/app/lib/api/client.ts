import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import type { RefreshTokenResponse } from "./types/auth.types";
import { useAuthStore } from "../../stores/authStore";

const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1";

const validateApiBaseUrl = (rawValue: string | undefined): string => {
  const providedValue = rawValue?.trim() || DEFAULT_API_BASE_URL;
  const normalizedValue = providedValue.replace(/\/+$/, "");

  if (!/^https?:\/\//.test(normalizedValue)) {
    throw new Error(
      `[apiClient] Invalid VITE_API_BASE_URL: "${providedValue}". Expected a full URL ending with "/api/v1" (e.g. "${DEFAULT_API_BASE_URL}").`
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedValue);
  } catch {
    throw new Error(
      `[apiClient] Invalid VITE_API_BASE_URL: "${providedValue}". Expected a valid URL ending with "/api/v1" (e.g. "${DEFAULT_API_BASE_URL}").`
    );
  }

  if (parsedUrl.pathname !== "/api/v1") {
    throw new Error(
      `[apiClient] Invalid VITE_API_BASE_URL: "${providedValue}". Expected pathname "/api/v1" exactly.`
    );
  }

  return normalizedValue;
};

const API_BASE_URL = validateApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
const SHOULD_LOG_API_DEBUG = import.meta.env.DEV && !import.meta.env.VITEST;

/**
 * Convert relative file URLs to absolute URLs
 * @param url - The URL to convert (can be relative or absolute)
 * @returns Absolute URL
 */
export const getAbsoluteUrl = (
  url: string | null | undefined
): string | null => {
  if (!url) return null;
  // If already absolute (starts with http:// or https://), return as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // Otherwise, prepend API_BASE_URL
  return `${API_BASE_URL}${url}`;
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL, // API_BASE_URL must include the full /api/v1 prefix
  headers: {
    "Content-Type": "application/json; charset=utf-8",
  },
  timeout: 30000,
  withCredentials: true, // Important: send cookies with requests
});

// Queue for pending requests during token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

// Proactive refresh timeout
let proactiveRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

/**
 * Schedule proactive token refresh 5 minutes before expiration
 * Exported for use after login
 */
export const scheduleProactiveRefresh = (token: string) => {
  // Clear any existing timeout
  if (proactiveRefreshTimeout) {
    clearTimeout(proactiveRefreshTimeout);
    proactiveRefreshTimeout = null;
  }

  // Validate token format before attempting to decode
  if (!token || typeof token !== "string") {
    console.debug(
      "[apiClient] Invalid token format, skipping proactive refresh"
    );
    return;
  }

  // Check if token has JWT format (3 parts separated by dots)
  const parts = token.split(".");
  if (parts.length !== 3) {
    console.debug(
      "[apiClient] Token is not a valid JWT format, skipping proactive refresh"
    );
    return;
  }

  try {
    // Decode JWT to get expiration time
    const payload = JSON.parse(atob(parts[1] || ""));

    // Validate that payload has expiration time
    if (!payload.exp || typeof payload.exp !== "number") {
      console.debug(
        "[apiClient] Token payload missing expiration time, skipping proactive refresh"
      );
      return;
    }

    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expirationTime - now;

    // Schedule refresh before expiration (margin configurable via VITE_TOKEN_REFRESH_MARGIN_MINUTES)
    const REFRESH_MARGIN_MS =
      (Number(import.meta.env.VITE_TOKEN_REFRESH_MARGIN_MINUTES) || 2) *
      60 *
      1000;
    const refreshTime = timeUntilExpiry - REFRESH_MARGIN_MS;

    if (refreshTime > 0) {
      proactiveRefreshTimeout = setTimeout(() => {
        console.debug("[apiClient] Proactive token refresh triggered");
        refreshAccessToken()
          .then((newToken) => {
            if (newToken) {
              // Schedule next proactive refresh with new token
              scheduleProactiveRefresh(newToken);
            }
          })
          .catch((error) => {
            console.error("[apiClient] Proactive refresh failed:", error);
          });
      }, refreshTime);

      console.debug(
        `[apiClient] Proactive refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`
      );
    } else {
      // Token expires too soon — refresh immediately instead of silently skipping
      console.debug("[apiClient] Token expires soon, refreshing immediately");
      refreshAccessToken()
        .then((newToken) => {
          if (newToken) scheduleProactiveRefresh(newToken);
        })
        .catch((error) => {
          console.error("[apiClient] Immediate refresh failed:", error);
        });
    }
  } catch (error) {
    // Silently handle decode errors (invalid token format, etc.)
    // Log error for debugging (tests may check for this)
    if (SHOULD_LOG_API_DEBUG) {
      console.error("[apiClient] Error scheduling proactive refresh:", error);
    }
  }
};

/**
 * Helper function to get cookie value by name
 */
const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
};

/**
 * Refresh access token using refresh token
 * Reads refresh token from cookie first, falls back to localStorage for compatibility
 * Updates both localStorage (for access token) and authStore for consistency
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  // Try to get refresh token from cookie first (non-HttpOnly cookies only)
  let refreshToken = getCookie("refresh_token");

  // Fallback to localStorage for backward compatibility
  if (!refreshToken) {
    refreshToken = localStorage.getItem("refresh_token");
  }

  try {
    // Create a new axios instance without interceptors to avoid infinite loop
    const refreshClient = axios.create({
      baseURL: API_BASE_URL, // API_BASE_URL must include the full /api/v1 prefix
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      timeout: 30000,
      withCredentials: true, // Important: send cookies with request
    });

    // Send refresh token in body as fallback (cookie will be used if available)
    const response = await refreshClient.post<
      { data?: RefreshTokenResponse } & RefreshTokenResponse
    >("/auth/refresh", refreshToken ? { refresh_token: refreshToken } : {});

    const accessToken =
      response.data?.data?.access_token ?? response.data?.access_token ?? null;

    if (!accessToken) {
      throw new Error("Refresh token response missing access token");
    }

    // Update localStorage for access token only
    localStorage.setItem("auth_token", accessToken);

    // Update authStore for consistency
    // Note: refresh token is now in cookie, not localStorage
    useAuthStore.setState({ token: accessToken });

    // Schedule proactive refresh for new token
    scheduleProactiveRefresh(accessToken);

    return accessToken;
  } catch (error) {
    // Refresh token expired or invalid
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");

    // Clear authStore
    const authStore = useAuthStore.getState();
    if (authStore && typeof authStore.clearAuth === "function") {
      authStore.clearAuth();
    }

    return null;
  }
};

// Request interceptor for auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (SHOULD_LOG_API_DEBUG) {
      console.debug(
        "[apiClient] Request",
        config.method?.toUpperCase(),
        config.url
      );

      if (config.method?.toLowerCase() === "delete") {
        console.debug("[apiClient] DELETE request details", {
          url: config.url,
          baseURL: apiClient.defaults.baseURL,
          fullURL: `${apiClient.defaults.baseURL || ""}${config.url || ""}`,
          method: config.method,
        });
      }
    }

    const token = localStorage.getItem("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Only show warning in development, not in tests or production
      // Some endpoints may not require auth (e.g., public endpoints)
      // The encryption-secret endpoint requires auth but will fail gracefully if not available
      if (import.meta.env.DEV && !import.meta.env.VITEST) {
        console.warn(
          "[apiClient] No auth token found in localStorage for request:",
          config.url
        );
      }
    }

    // For FormData requests, remove Content-Type header so axios will set multipart/form-data with correct boundary
    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
    }

    // Log request details for debugging
    if (
      SHOULD_LOG_API_DEBUG &&
      (config.url?.includes("contact-methods") || config.url?.includes("users"))
    ) {
      console.debug(
        `[apiClient] Request to ${config.url?.includes("users") ? "users" : "contact-methods"}:`,
        {
          url: config.url,
          method: config.method,
          hasToken: !!token,
          baseURL: config.baseURL,
          fullURL: `${config.baseURL}${config.url}`,
          data: config.data
            ? typeof config.data === "string"
              ? JSON.parse(config.data)
              : config.data
            : undefined,
        }
      );
    }

    return config;
  },
  (error) => {
    console.error("[apiClient] Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => {
    if (
      SHOULD_LOG_API_DEBUG &&
      response.config.method?.toLowerCase() === "delete"
    ) {
      console.debug("[apiClient] DELETE response details", {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
      });
    }

    // Log successful responses for contact-methods
    if (
      SHOULD_LOG_API_DEBUG &&
      response.config.url?.includes("contact-methods")
    ) {
      console.debug("[apiClient] Response from contact-methods:", {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Log errors for contact-methods requests
    if (
      SHOULD_LOG_API_DEBUG &&
      originalRequest?.url?.includes("contact-methods")
    ) {
      console.error("[apiClient] Error in contact-methods request:", {
        message: error.message,
        code: error.code,
        response: error.response
          ? {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
            }
          : null,
        request: {
          url: originalRequest.url,
          method: originalRequest.method,
          baseURL: originalRequest.baseURL,
        },
      });
    }

    // Handle 401 Unauthorized
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          processQueue(null, newToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          isRefreshing = false;
          return apiClient(originalRequest);
        } else {
          // Refresh failed - redirect to login
          processQueue(new Error("Refresh token expired"), null);
          isRefreshing = false;
          window.location.href = "/login";
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        isRefreshing = false;
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
