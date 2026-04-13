import Constants from "expo-constants";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:3001";
const DEFAULT_API_PORT = "3001";

declare const process: { env: Record<string, string | undefined> };

export function getApiBaseUrl() {
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  const inferredApiUrl = getInferredDevelopmentApiUrl();

  return (envApiUrl ?? inferredApiUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

function getInferredDevelopmentApiUrl() {
  const rawHost =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    null;

  const host = extractHostname(rawHost);

  if (!host) {
    return null;
  }

  return `http://${host}:${DEFAULT_API_PORT}`;
}

function extractHostname(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.includes("://")) {
    return extractHostname(normalizedValue.split("://")[1] ?? "");
  }

  const withoutPath = normalizedValue.split("/")[0];

  // Expo usually exposes the dev host as "ip:port".
  if (
    withoutPath.startsWith("[") &&
    withoutPath.includes("]:")
  ) {
    return withoutPath.slice(1, withoutPath.indexOf("]:"));
  }

  const lastColonIndex = withoutPath.lastIndexOf(":");

  if (lastColonIndex === -1) {
    return withoutPath;
  }

  if (withoutPath.indexOf(":") === lastColonIndex) {
    return withoutPath.slice(0, lastColonIndex);
  }

  return withoutPath;
}
