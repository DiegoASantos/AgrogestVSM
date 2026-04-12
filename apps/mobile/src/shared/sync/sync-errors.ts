import { toApiError } from "../services";

export type SyncErrorKind = "transient" | "conflict" | "permanent" | "auth";

export type SyncErrorResult = {
  kind: SyncErrorKind;
  message: string;
  statusCode: number | null;
};

export function classifyError(error: unknown): SyncErrorResult {
  const apiError = toApiError(error);
  const statusCode = apiError.statusCode ?? null;

  if (
    statusCode === null ||
    statusCode === 0 ||
    statusCode === 408 ||
    statusCode === 429 ||
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504
  ) {
    return {
      kind: "transient",
      message: apiError.message,
      statusCode
    };
  }

  if (statusCode === 409) {
    return {
      kind: "conflict",
      message: apiError.message,
      statusCode
    };
  }

  if (statusCode === 401 || statusCode === 403) {
    return {
      kind: "auth",
      message: apiError.message,
      statusCode
    };
  }

  return {
    kind: "permanent",
    message: apiError.message,
    statusCode
  };
}
