import { getApiBaseUrl } from "./config";
import { ApiError } from "./errors";

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

export type ApiSuccessResponse<T> = {
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

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
) {
  const success = await apiRequestEnvelope<T>(path, options);

  return success.data;
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/**
 * Registers a global callback invoked whenever the API returns 401.
 * The AuthSessionProvider uses this to trigger auto-logout.
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
  const response = await fetch(buildApiUrl(path), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    cache: "no-store",
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {})
  });

  const rawPayload = await response.text();
  const payload = parseJson(rawPayload);

  if (!response.ok) {
    const failure = payload as ApiFailureResponse | null;

    if (response.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }

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
