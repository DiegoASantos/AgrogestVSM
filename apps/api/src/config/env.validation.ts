import {
  DEFAULT_APP_HOST,
  DEFAULT_APP_PORT,
  DEFAULT_DB_HOST,
  DEFAULT_DB_PORT,
  DEFAULT_DB_SCHEMA,
  DEFAULT_DB_USER,
  DEFAULT_JWT_ACCESS_EXPIRES_IN,
  DEFAULT_JWT_REFRESH_EXPIRES_IN
} from "../common/constants/application.constants";
import type { EnvironmentVariables, NodeEnvironment } from "./environment.types";

export function validateEnvironment(
  config: Record<string, unknown>
): EnvironmentVariables {
  return buildEnvironmentVariables(config);
}

export function readEnvironmentVariables(
  source: Record<string, unknown> = process.env
): EnvironmentVariables {
  return buildEnvironmentVariables(source);
}

function buildEnvironmentVariables(
  source: Record<string, unknown>
): EnvironmentVariables {
  return {
    NODE_ENV: parseNodeEnvironment(source.NODE_ENV),
    APP_HOST: getString(source.APP_HOST, DEFAULT_APP_HOST),
    APP_PORT: parsePort(source.APP_PORT, "APP_PORT", DEFAULT_APP_PORT),
    CORS_ALLOWED_ORIGINS: parseAllowedOrigins(source.CORS_ALLOWED_ORIGINS),
    DB_HOST: getString(source.DB_HOST, DEFAULT_DB_HOST),
    DB_PORT: parsePort(source.DB_PORT, "DB_PORT", DEFAULT_DB_PORT),
    DB_NAME: getRequiredString(source.DB_NAME, "DB_NAME"),
    DB_USER: getString(source.DB_USER, DEFAULT_DB_USER),
    DB_PASSWORD: getRequiredString(source.DB_PASSWORD, "DB_PASSWORD"),
    DB_SCHEMA: getString(source.DB_SCHEMA, DEFAULT_DB_SCHEMA),
    DB_SSL: parseBoolean(source.DB_SSL, false),
    JWT_ACCESS_SECRET: getJwtSecret(source.JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET"),
    JWT_ACCESS_EXPIRES_IN: getString(
      source.JWT_ACCESS_EXPIRES_IN,
      DEFAULT_JWT_ACCESS_EXPIRES_IN
    ),
    JWT_REFRESH_SECRET: getJwtSecret(source.JWT_REFRESH_SECRET, "JWT_REFRESH_SECRET"),
    JWT_REFRESH_EXPIRES_IN: getString(
      source.JWT_REFRESH_EXPIRES_IN,
      DEFAULT_JWT_REFRESH_EXPIRES_IN
    )
  };
}

function parseNodeEnvironment(value: unknown): NodeEnvironment {
  if (value === "test" || value === "production") {
    return value;
  }

  return "development";
}

function parsePort(
  value: unknown,
  variableName: string,
  defaultValue: number
): number {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 65535) {
    throw new Error(`${variableName} must be an integer between 1 and 65535.`);
  }

  return parsedValue;
}

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  throw new Error("DB_SSL must be either true or false.");
}

function getRequiredString(value: unknown, variableName: string): string {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    throw new Error(`${variableName} is required.`);
  }

  return normalizedValue;
}

function getJwtSecret(value: unknown, variableName: string): string {
  const normalizedValue = getRequiredString(value, variableName);
  const insecureSecrets = new Set([
    "change-this-jwt-secret",
    "changeme",
    "secret",
    "jwt-secret",
    "your-secret-key"
  ]);

  if (normalizedValue.length < 32) {
    throw new Error(`${variableName} must be at least 32 characters long.`);
  }

  if (insecureSecrets.has(normalizedValue.toLowerCase())) {
    throw new Error(`${variableName} must not use a default or predictable value.`);
  }

  return normalizedValue;
}

function parseAllowedOrigins(value: unknown): string[] {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return [];
  }

  return normalizedValue
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => normalizeOrigin(origin));
}

function normalizeOrigin(origin: string): string {
  let parsedOrigin: URL;

  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw new Error(
      `CORS_ALLOWED_ORIGINS contains an invalid URL origin: ${origin}.`
    );
  }

  if (parsedOrigin.protocol !== "http:" && parsedOrigin.protocol !== "https:") {
    throw new Error(
      `CORS_ALLOWED_ORIGINS only supports http/https origins: ${origin}.`
    );
  }

  return parsedOrigin.origin;
}

function getString(value: unknown, defaultValue: string): string {
  const normalizedValue = String(value ?? "").trim();

  return normalizedValue || defaultValue;
}
