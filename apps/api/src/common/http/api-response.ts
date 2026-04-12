export type SuccessResponse<T> = {
  success: true;
  timestamp: string;
  data: T;
  meta?: Record<string, unknown>;
};

export type ErrorResponse = {
  success: false;
  timestamp: string;
  error: {
    statusCode: number;
    code: string;
    message: string;
    path: string;
    method: string;
    details?: unknown;
  };
};

type ErrorResponseInput = {
  statusCode: number;
  code: string;
  message: string;
  path: string;
  method: string;
  details?: unknown;
};

export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): SuccessResponse<T> {
  return {
    success: true,
    timestamp: new Date().toISOString(),
    data,
    ...(meta ? { meta } : {})
  };
}

export function createPaginatedMeta(
  total: number,
  page: number,
  limit: number
): Record<string, unknown> {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

export function createErrorResponse(
  input: ErrorResponseInput
): ErrorResponse {
  return {
    success: false,
    timestamp: new Date().toISOString(),
    error: {
      statusCode: input.statusCode,
      code: input.code,
      message: input.message,
      path: input.path,
      method: input.method,
      ...(input.details !== undefined ? { details: input.details } : {})
    }
  };
}
