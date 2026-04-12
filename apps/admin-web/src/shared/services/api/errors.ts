export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError("Ocurrio un error inesperado.");
}
