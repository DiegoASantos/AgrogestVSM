export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly details?: unknown,
    public readonly responseData?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiTimeoutError extends ApiError {
  constructor(
    message = "La solicitud excedio el tiempo de espera.",
    public readonly timeoutMs?: number
  ) {
    super(message, 408);
    this.name = "ApiTimeoutError";
  }
}

export class ApiRequestAbortedError extends ApiError {
  constructor(message = "La solicitud fue cancelada.") {
    super(message);
    this.name = "ApiRequestAbortedError";
  }
}

export class ApiOfflineModeError extends ApiError {
  constructor(message = "La aplicacion esta trabajando sin conexion.") {
    super(message);
    this.name = "ApiOfflineModeError";
  }
}

export function isApiOfflineModeError(error: unknown) {
  return error instanceof ApiOfflineModeError;
}

export function isApiRequestAbortedError(error: unknown) {
  return error instanceof ApiRequestAbortedError;
}

export function toApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError("Unexpected API error.");
}
