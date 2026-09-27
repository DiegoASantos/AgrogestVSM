import Constants from "expo-constants";
import NetInfo from "@react-native-community/netinfo";

const LOCAL_API_BASE_URL = "http://127.0.0.1:3001";
const PRODUCTION_API_BASE_URL = "http://190.119.191.195:5177";
const PRODUCTION_LAN_API_BASE_URL = "http://172.16.0.8:5177";
const DEFAULT_API_PORT = "3001";
const LAN_PROBE_TIMEOUT_MS = 1_500;
const LAN_CACHE_SUCCESS_MS = 30_000;
const LAN_CACHE_FAILURE_MS = 5_000;

let lanProbeCache: { address: string | null; reachable: boolean; expiresAt: number } | null = null;
let lanProbeInFlight: Promise<boolean> | null = null;

declare const process: { env: Record<string, string | undefined> };
declare const __DEV__: boolean;

export function getApiBaseUrl() {
  // Production APKs must use the IDL server. EAS environment variables and
  // downloaded updates must not redirect production writes to the old cloud API.
  if (!__DEV__) {
    return PRODUCTION_API_BASE_URL;
  }

  const envApiUrl = process.env.EXPO_PUBLIC_API_URL ?? getConfiguredApiUrl();
  const inferredApiUrl = getInferredDevelopmentApiUrl();

  return (envApiUrl ?? inferredApiUrl ?? LOCAL_API_BASE_URL).replace(/\/+$/, "");
}

export async function getResolvedApiBaseUrl() {
  if (__DEV__) {
    return getApiBaseUrl();
  }

  try {
    const network = await NetInfo.fetch();

    if (network.type !== "wifi") {
      return PRODUCTION_API_BASE_URL;
    }

    const address =
      network.details && "ipAddress" in network.details
        ? network.details.ipAddress ?? null
        : null;
    const now = Date.now();

    if (lanProbeCache?.address === address && lanProbeCache.expiresAt > now) {
      return lanProbeCache.reachable
        ? PRODUCTION_LAN_API_BASE_URL
        : PRODUCTION_API_BASE_URL;
    }

    lanProbeInFlight ??= probeLanApi();
    const reachable = await lanProbeInFlight;
    lanProbeInFlight = null;
    lanProbeCache = {
      address,
      reachable,
      expiresAt: Date.now() + (reachable ? LAN_CACHE_SUCCESS_MS : LAN_CACHE_FAILURE_MS)
    };

    return reachable ? PRODUCTION_LAN_API_BASE_URL : PRODUCTION_API_BASE_URL;
  } catch {
    lanProbeInFlight = null;
    return PRODUCTION_API_BASE_URL;
  }
}

async function probeLanApi() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LAN_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(`${PRODUCTION_LAN_API_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: { service?: string; environment?: string };
    };

    return (
      payload.success === true &&
      payload.data?.service === "agrogest-vsm-api" &&
      payload.data.environment === "production"
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function getConfiguredApiUrl() {
  const extra = Constants.expoConfig?.extra;

  if (!extra || typeof extra !== "object") {
    return null;
  }

  const apiUrl = (extra as { apiUrl?: unknown }).apiUrl;

  return typeof apiUrl === "string" && apiUrl.trim() ? apiUrl : null;
}

function getInferredDevelopmentApiUrl() {
  const rawHost =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost ?? null;

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
  if (withoutPath.startsWith("[") && withoutPath.includes("]:")) {
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
