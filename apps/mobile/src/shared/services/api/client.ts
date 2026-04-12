import { getApiBaseUrl } from "./config";
import { getApiToken } from "./auth-store";
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

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
) {
  const apiToken = getApiToken();
  const response = await fetch(buildApiUrl(path), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(apiToken && !options.headers?.Authorization
        ? { Authorization: `Bearer ${apiToken}` }
        : {}),
      ...(options.headers ?? {})
    },
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {})
  });

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
