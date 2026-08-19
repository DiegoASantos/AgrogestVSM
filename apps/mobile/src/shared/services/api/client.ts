import { getApiBaseUrl } from "./config";
import { getApiToken, refreshApiToken } from "./auth-store";
import {
  ApiError,
  ApiOfflineModeError,
  ApiRequestAbortedError,
  ApiTimeoutError
} from "./errors";
import { isNetworkRequestAllowed } from "../../connectivity/connectivity-policy";
import { publishNetworkObservation } from "../../connectivity/network-telemetry";
import type { NetworkRequestPolicy } from "../../connectivity/connectivity-types";

export const DEFAULT_API_TIMEOUT_MS = 15_000;

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  networkPolicy?: NetworkRequestPolicy;
};

export type ApiRequestContext = Pick<ApiRequestOptions, "signal" | "timeoutMs">;

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
};

type ApiFailureResponse = {
  success: false;
  error?: {
    message?: string;
    statusCode?: number;
    details?: unknown;
  };
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  const networkPolicy = options.networkPolicy ?? "standard";

  if (!isNetworkRequestAllowed(networkPolicy)) {
    throw new ApiOfflineModeError();
  }

  let result = await performRequest(path, options);

  if (
    result.response.status === 401 &&
    !isAuthenticationRequest(path) &&
    (await refreshApiToken({ signal: options.signal }))
  ) {
    result = await performRequest(path, options, true);
  }

  const { response, rawPayload } = result;
  const payload = parseJson(rawPayload);

  if (!response.ok) {
    const failure = payload as ApiFailureResponse | null;
    let responseData: unknown = null;

    if (response.status === 409) {
      const successShape = payload as ApiSuccessResponse<unknown> | null;

      if (successShape?.success && successShape.data) {
        responseData = successShape.data;
      }
    }

    throw new ApiError(
      failure?.error?.message ?? "API request failed.",
      failure?.error?.statusCode ?? response.status,
      failure?.error?.details,
      responseData
    );
  }

  const success = payload as ApiSuccessResponse<T> | null;

  if (!success?.success) {
    throw new ApiError("API response format is invalid.", response.status);
  }

  return success.data;
}

export async function apiRequestAllPages<T>(
  path: string,
  context: ApiRequestContext = {}
): Promise<T[]> {
  const collected: T[] = [];
  const separator = path.includes("?") ? "&" : "?";
  const pageSize = 200;

  for (let page = 1; page <= 100; page += 1) {
    const items = await apiRequest<T[]>(
      `${path}${separator}page=${page}&limit=${pageSize}`,
      context
    );

    collected.push(...items);

    if (items.length < pageSize) {
      break;
    }
  }

  return collected;
}

async function performRequest(
  path: string,
  options: ApiRequestOptions,
  overrideAuthorization = false
) {
  const apiToken = getApiToken();
  const controller = new AbortController();
  const timeoutMs = normalizeTimeout(options.timeoutMs);
  const networkPolicy = options.networkPolicy ?? "standard";
  const startedAt = Date.now();
  let timedOut = false;
  const handleExternalAbort = () => controller.abort();

  if (options.signal?.aborted) {
    controller.abort();
  } else {
    options.signal?.addEventListener("abort", handleExternalAbort, { once: true });
  }

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const includeAuth =
      apiToken && (!options.headers?.Authorization || overrideAuthorization);

    const response = await fetch(buildApiUrl(path), {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(includeAuth ? { Authorization: `Bearer ${apiToken}` } : {}),
        ...(options.headers ?? {})
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: controller.signal
    });
    const rawPayload = await response.text();

    publishNetworkObservation({
      durationMs: Date.now() - startedAt,
      policy: networkPolicy,
      success: true
    });

    return { response, rawPayload };
  } catch (error) {
    const wasExternallyAborted = options.signal?.aborted === true && !timedOut;

    if (!wasExternallyAborted) {
      publishNetworkObservation({
        durationMs: Date.now() - startedAt,
        policy: networkPolicy,
        success: false
      });
    }

    if (timedOut) {
      throw new ApiTimeoutError(undefined, timeoutMs);
    }

    if (wasExternallyAborted || controller.signal.aborted) {
      throw new ApiRequestAbortedError();
    }

    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", handleExternalAbort);
  }
}

function normalizeTimeout(timeoutMs?: number) {
  return typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : DEFAULT_API_TIMEOUT_MS;
}

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${getApiBaseUrl()}${normalizedPath}`;
}

function parseJson(value: string) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isAuthenticationRequest(path: string) {
  return path === "/auth/login" || path === "/auth/refresh";
}
