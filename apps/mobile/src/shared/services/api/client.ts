import { getApiBaseUrl } from "./config";
import { getApiToken, refreshApiToken } from "./auth-store";
import { ApiError } from "./errors";

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

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
  let response = await performRequest(path, options);

  if (
    response.status === 401 &&
    !isAuthenticationRequest(path) &&
    (await refreshApiToken())
  ) {
    response = await performRequest(path, options, true);
  }

  const rawPayload = await response.text();
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

export async function apiRequestAllPages<T>(path: string): Promise<T[]> {
  const collected: T[] = [];
  const separator = path.includes("?") ? "&" : "?";
  const pageSize = 200;

  for (let page = 1; page <= 100; page += 1) {
    const items = await apiRequest<T[]>(
      `${path}${separator}page=${page}&limit=${pageSize}`
    );

    collected.push(...items);

    if (items.length < pageSize) {
      break;
    }
  }

  return collected;
}

function performRequest(
  path: string,
  options: ApiRequestOptions,
  overrideAuthorization = false
) {
  const apiToken = getApiToken();

  return fetch(buildApiUrl(path), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(apiToken && !options.headers?.Authorization
        ? { Authorization: `Bearer ${apiToken}` }
        : {}),
      ...(options.headers ?? {}),
      ...(apiToken && overrideAuthorization
        ? { Authorization: `Bearer ${apiToken}` }
        : {})
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {})
  });
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
