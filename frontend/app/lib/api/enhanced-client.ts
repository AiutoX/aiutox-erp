/**
 * 🚀 Enhanced API Client with Structured Logging
 * Cliente API mejorado con logging estructurado y request IDs para tracing
 */

import axios, { type AxiosInstance, type AxiosError } from "axios";
import { v4 as uuidv4 } from "uuid";

// Configuración base
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

// Validación crítica
if (!API_BASE_URL.includes("/api/v1")) {
  console.error(
    "[EnhancedApiClient] ❌ VITE_API_BASE_URL debe incluir /api/v1 completo.",
    `Valor actual: ${API_BASE_URL}`,
    "Ejemplo correcto: http://localhost:8000/api/v1"
  );
  throw new Error("VITE_API_BASE_URL must include /api/v1");
}

// Tipos auxiliares
export interface RequestMetadata {
  requestId: string;
  startTime?: number;
  url: string;
  method: string;
  duration?: number;
}

// Logging estructurado
interface LogEntry {
  requestId: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  method: string;
  url: string;
  duration?: number;
  status?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

class ApiLogger {
  private static logs: LogEntry[] = [];
  private static maxLogs = 1000;

  static log(entry: Omit<LogEntry, "timestamp">): void {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    // Mantener solo los últimos logs
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console logging con formato estructurado
    const logMessage = `[${entry.level}] ${entry.method} ${entry.url} ${entry.status ? `(${entry.status})` : ""}`;
    const logData = {
      requestId: entry.requestId,
      method: entry.method,
      url: entry.url,
      duration: entry.duration,
      status: entry.status,
      error: entry.error,
      metadata: entry.metadata,
    };

    switch (entry.level) {
      case "ERROR":
        console.error(logMessage, logData);
        break;
      case "WARN":
        console.warn(logMessage, logData);
        break;
      case "DEBUG":
        console.debug(logMessage, logData);
        break;
      default:
        console.info(logMessage, logData);
    }
  }

  static getLogs(level?: LogEntry["level"]): LogEntry[] {
    if (level) {
      return this.logs.filter((log) => log.level === level);
    }
    return this.logs;
  }

  static getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  static clearLogs(): void {
    this.logs = [];
  }

  static getErrorLogs(count: number = 20): LogEntry[] {
    return this.logs.filter((log) => log.level === "ERROR").slice(-count);
  }
}

// Request/Response Interceptors
const createRequestInterceptor = (client: AxiosInstance) => {
  client.interceptors.request.use(
    (config) => {
      const requestId = uuidv4();
      const startTime = Date.now();
      const method = config.method ? config.method.toUpperCase() : "UNKNOWN";
      const url = config.url ?? "";

      // Agregar metadata a la request
      const metadata: RequestMetadata = {
        requestId,
        startTime,
        url,
        method,
      };
      config.metadata = metadata;

      // Agregar headers de tracing
      config.headers = config.headers ?? {};
      config.headers["X-Request-ID"] = requestId;
      config.headers["X-Client-Timestamp"] = new Date().toISOString();

      // Log de request
      ApiLogger.log({
        requestId,
        level: "INFO",
        method,
        url,
        metadata: {
          headers: config.headers,
          params: config.params,
          hasData: !!config.data,
        },
      });

      return config;
    },
    (error) => {
      ApiLogger.log({
        requestId: uuidv4(),
        level: "ERROR",
        method: "UNKNOWN",
        url: "",
        error: `Request error: ${error.message}`,
      });
      return Promise.reject(error);
    }
  );
};

const createResponseInterceptor = (client: AxiosInstance) => {
  client.interceptors.response.use(
    (response) => {
      const metadata = response.config.metadata;
      const requestId = metadata?.requestId ?? uuidv4();
      const startTime = metadata?.startTime;
      const method = metadata?.method ?? "UNKNOWN";
      const url = metadata?.url ?? response.config.url ?? "";
      const duration = startTime ? Date.now() - startTime : undefined;

      // Log de response exitosa
      ApiLogger.log({
        requestId,
        level: "INFO",
        method,
        url,
        duration,
        status: response.status,
        metadata: {
          responseSize: JSON.stringify(response.data).length,
          responseHeaders: response.headers,
        },
      });

      // Agregar headers de respuesta
      response.headers["X-Response-Time"] = duration?.toString();
      response.headers["X-Request-ID"] = requestId;

      return response;
    },
    (error: AxiosError) => {
      const metadata = error.config?.metadata;
      const requestId = metadata?.requestId ?? uuidv4();
      const startTime = metadata?.startTime;
      const method = metadata?.method ?? "UNKNOWN";
      const url = metadata?.url ?? error.config?.url ?? "";
      const duration = startTime ? Date.now() - startTime : undefined;
      const status = error.response?.status;

      // Determinar nivel de log basado en el status
      let level: LogEntry["level"] = "ERROR";
      if (status && status >= 400 && status < 500) {
        level = status === 401 || status === 403 ? "WARN" : "ERROR";
      }

      // Log de error
      ApiLogger.log({
        requestId,
        level,
        method,
        url,
        duration,
        status,
        error: error.message,
        metadata: {
          responseData: error.response?.data,
          responseHeaders: error.response?.headers,
          isNetworkError: !error.response,
          isTimeout: error.code === "ECONNABORTED",
        },
      });

      // Enriquecer error con metadata
      if (error.config) {
        error.config.metadata = {
          ...error.config.metadata,
          requestId,
          duration,
          method,
          url,
        };
      }

      return Promise.reject(error);
    }
  );
};

// Crear instancia mejorada
const createEnhancedApiClient = (): AxiosInstance => {
  const client: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    timeout: 30000,
    withCredentials: true,
  });

  // Configurar interceptores
  createRequestInterceptor(client);
  createResponseInterceptor(client);

  return client;
};

// Instancia global
export const apiClient = createEnhancedApiClient();

// Utilidades de logging
export const apiLogger = {
  getLogs: ApiLogger.getLogs.bind(ApiLogger),
  getRecentLogs: ApiLogger.getRecentLogs.bind(ApiLogger),
  getErrorLogs: ApiLogger.getErrorLogs.bind(ApiLogger),
  clearLogs: ApiLogger.clearLogs.bind(ApiLogger),
};

// Utilidades de diagnóstico
export const apiDiagnostics = {
  getHealthStatus: () => {
    const recentLogs = ApiLogger.getRecentLogs(100);
    const errorLogs = recentLogs.filter((log) => log.level === "ERROR");
    const slowRequests = recentLogs.filter(
      (log) => log.duration && log.duration > 5000
    );

    return {
      totalRequests: recentLogs.length,
      errorCount: errorLogs.length,
      errorRate:
        recentLogs.length > 0
          ? (errorLogs.length / recentLogs.length) * 100
          : 0,
      slowRequestCount: slowRequests.length,
      averageResponseTime:
        recentLogs.length > 0
          ? recentLogs.reduce((acc, log) => acc + (log.duration || 0), 0) /
            recentLogs.length
          : 0,
      lastError: errorLogs[errorLogs.length - 1] ?? null,
      slowestRequest: recentLogs.reduce<LogEntry | null>((slowest, current) => {
        if (!slowest || (current.duration || 0) > (slowest.duration || 0)) {
          return current;
        }
        return slowest;
      }, null),
    };
  },

  exportLogs: (format: "json" | "csv" = "json") => {
    const logs = ApiLogger.getLogs();

    if (format === "csv") {
      const headers = [
        "timestamp",
        "requestId",
        "level",
        "method",
        "url",
        "duration",
        "status",
        "error",
      ];
      const csvContent = [
        headers.join(","),
        ...logs.map((log) =>
          [
            log.timestamp,
            log.requestId,
            log.level,
            log.method,
            log.url,
            log.duration || "",
            log.status || "",
            log.error || "",
          ]
            .map((field) => `"${field}"`)
            .join(",")
        ),
      ].join("\n");

      return csvContent;
    }

    return JSON.stringify(logs, null, 2);
  },

  testConnection: async () => {
    try {
      const startTime = Date.now();
      const response = await apiClient.get("/healthz");
      const duration = Date.now() - startTime;

      return {
        success: true,
        duration,
        status: response.status,
        message: "Connection successful",
        serverTime: response.headers.date,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        message: "Connection failed",
      };
    }
  },
};

// Exportar por defecto el cliente
export default apiClient;

// Types para TypeScript
export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// Extend AxiosRequestConfig para incluir metadata
declare module "axios" {
  interface AxiosRequestConfig {
    metadata?: RequestMetadata;
  }
}
