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
  const message = formatApiErrorMessage(apiError.message, apiError.details);

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
      message,
      statusCode
    };
  }

  if (statusCode === 409) {
    return {
      kind: "conflict",
      message,
      statusCode
    };
  }

  if (statusCode === 401 || statusCode === 403) {
    return {
      kind: "auth",
      message,
      statusCode
    };
  }

  return {
    kind: "permanent",
    message,
    statusCode
  };
}

function formatApiErrorMessage(message: string, details: unknown) {
  if (!Array.isArray(details)) {
    return message;
  }

  const issues = details.flatMap((detail: unknown): string[] => {
    if (typeof detail !== "object" || detail === null) {
      return [];
    }

    const field =
      "field" in detail && typeof detail.field === "string" ? detail.field.trim() : "";
    const messages =
      "messages" in detail && Array.isArray(detail.messages)
        ? detail.messages.filter(
            (value: unknown): value is string =>
              typeof value === "string" && value.trim().length > 0
          )
        : [];

    return messages.map((issue) => (field ? `${field}: ${issue}` : issue));
  });

  return issues.length > 0 ? `${message} ${issues.join("; ")}` : message;
}
