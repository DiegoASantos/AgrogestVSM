import { getApiBaseUrl } from "./config";
import { ApiError } from "./errors";

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  recoverSession?: boolean;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
};

export type ApiDownloadResponse = {
  blob: Blob;
  fileName: string | null;
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
  const success = await apiRequestEnvelope<T>(path, options);

  return success.data;
}

/**
 * Downloads an authenticated binary response while preserving the same API
 * error and session-expiration behavior as JSON requests.
 */
export async function apiDownload(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiDownloadResponse> {
  const response = await fetchWithSession(path, options);

  if (!response.ok) {
    const rawPayload = await response.text();
    const failure = parseJson(rawPayload) as ApiFailureResponse | null;

    throw new ApiError(
      failure?.error?.message ?? "No se pudo descargar el archivo.",
      failure?.error?.statusCode ?? response.status,
      failure?.error?.details
    );
  }

  return {
    blob: await response.blob(),
    fileName: readAttachmentFileName(response.headers.get("content-disposition"))
  };
}

type UnauthorizedHandler = (authorization: string, rejectedRetry?: boolean) => Promise<string | void> | void;
type AuthorizationResolver = (authorization: string) => string;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let authorizationResolver: AuthorizationResolver | null = null;

export function setAuthorizationResolver(resolver: AuthorizationResolver | null) {
  authorizationResolver = resolver;
  return () => {
    if (authorizationResolver === resolver) authorizationResolver = null;
  };
}

/**
 * Waits for session recovery before retrying an authenticated 401 once.
 * Returns an unregister function so effects can clean up on unmount.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

export async function apiRequestEnvelope<T>(
  path: string,
  options: ApiRequestOptions = {}
) {
  const response = await fetchWithSession(path, options);

  const rawPayload = await response.text();
  const payload = parseJson(rawPayload);

  if (!response.ok) {
    const failure = payload as ApiFailureResponse | null;

    throw new ApiError(
      failure?.error?.message ?? "API request failed.",
      failure?.error?.statusCode ?? response.status,
      failure?.error?.details
    );
  }

  const success = payload as ApiSuccessResponse<T> | null;

  if (!success?.success) {
    throw new ApiError("API response format is invalid.", response.status);
  }

  return success;
}

async function fetchWithSession(path: string, options: ApiRequestOptions) {
  const headers: Record<string, string> = {
    ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(options.headers ?? {})
  };
  const authorizationKey = Object.keys(headers).find((key) => key.toLowerCase() === "authorization");
  const canRecover = options.recoverSession !== false && authorizationKey !== undefined;
  const handler = canRecover ? unauthorizedHandler : null;
  if (canRecover && authorizationResolver) {
    headers[authorizationKey] = authorizationResolver(headers[authorizationKey]);
  }
  const authorization = authorizationKey ? headers[authorizationKey] : undefined;
  const init = {
    method: options.method ?? "GET",
    headers,
    cache: "no-store" as const,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {})
  };
  const response = await fetch(buildApiUrl(path), init);
  if (response.status !== 401 || !handler || !authorization) return response;
  const nextAuthorization = await handler(authorization);
  if (!nextAuthorization) return response;
  if (handler !== unauthorizedHandler) {
    throw new ApiError("La sesión cambió. Reintenta la operación.", 409);
  }
  const retryAuthorization = authorizationResolver
    ? authorizationResolver(nextAuthorization)
    : nextAuthorization;
  const retried = await fetch(buildApiUrl(path), {
    ...init, headers: { ...headers, [authorizationKey!]: retryAuthorization }
  });
  if (retried.status === 401) {
    const newerAuthorization = await handler(retryAuthorization, true);
    if (newerAuthorization && newerAuthorization !== retryAuthorization) {
      throw new ApiError("La sesión se renovó durante la operación. Reintenta nuevamente.", 409);
    }
  }
  return retried;
}

export function createAuthHeaders(accessToken: string, tokenType = "Bearer") {
  return {
    Authorization: `${tokenType} ${accessToken}`
  };
}

const PAGINATION_PAGE_SIZE = 200;
const PAGINATION_MAX_PAGES = 25;

/**
 * Fetches every page of a paginated endpoint and flattens the results.
 * Stops early when the server reports no more pages. Caps out at
 * PAGINATION_MAX_PAGES * PAGINATION_PAGE_SIZE records to avoid runaway loops.
 * Use for views that genuinely need the full dataset (e.g. map rendering).
 */
export async function fetchAllPaginated<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T[]> {
  const collected: T[] = [];
  const separator = path.includes("?") ? "&" : "?";

  for (let page = 1; page <= PAGINATION_MAX_PAGES; page++) {
    const pagedPath = `${path}${separator}page=${page}&limit=${PAGINATION_PAGE_SIZE}`;
    const response = await apiRequestEnvelope<T[]>(pagedPath, options);

    collected.push(...response.data);

    if (response.data.length < PAGINATION_PAGE_SIZE) {
      break;
    }

    const meta = response.meta ?? {};
    const total = typeof meta.total === "number" ? meta.total : undefined;

    if (total !== undefined && collected.length >= total) {
      break;
    }
  }

  return collected;
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

function readAttachmentFileName(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const match = /filename\*?=(?:UTF-8''|")?([^;"]+)/i.exec(contentDisposition);

  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}
