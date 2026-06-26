import pino, { type Logger } from "pino";

type ApiLoggerInput = {
  appName?: string;
  environment?: string;
  level?: string;
};

const DEFAULT_SERVICE_NAME = "agrogest-vsm-api";
const DEFAULT_LOG_LEVEL = "info";

export type ApiLogger = Logger;

export function createApiLogger(input: ApiLoggerInput = {}): ApiLogger {
  return pino({
    level: normalizeLogLevel(input.level),
    base: {
      service: input.appName ?? DEFAULT_SERVICE_NAME,
      environment: input.environment ?? process.env.NODE_ENV ?? "development",
      version: process.env.npm_package_version ?? null,
      commit: process.env.RENDER_GIT_COMMIT ?? process.env.GIT_COMMIT ?? null,
      branch: process.env.RENDER_GIT_BRANCH ?? process.env.GIT_BRANCH ?? null
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    messageKey: "message",
    errorKey: "error",
    formatters: {
      level(label) {
        return { level: label };
      }
    },
    serializers: {
      error: pino.stdSerializers.err
    },
    redact: {
      paths: [
        "password",
        "*.password",
        "token",
        "*.token",
        "accessToken",
        "*.accessToken",
        "refreshToken",
        "*.refreshToken",
        "authorization",
        "*.authorization",
        "cookie",
        "*.cookie"
      ],
      censor: "[REDACTED]"
    }
  });
}

function normalizeLogLevel(value: string | undefined): string {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  const allowedLevels = new Set(["trace", "debug", "info", "warn", "error", "fatal"]);

  return allowedLevels.has(normalizedValue) ? normalizedValue : DEFAULT_LOG_LEVEL;
}
