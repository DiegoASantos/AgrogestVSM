import { randomUUID } from "node:crypto";

import type { FastifyReply, FastifyRequest } from "fastify";

export type RequestLogContext = {
  requestId: string;
};

const requestContexts = new WeakMap<FastifyRequest, RequestLogContext>();
const REQUEST_ID_HEADER = "x-request-id";
const MAX_REQUEST_ID_LENGTH = 128;

export function getOrCreateRequestLogContext(
  request: FastifyRequest,
  reply?: FastifyReply
): RequestLogContext {
  const existingContext = requestContexts.get(request);

  if (existingContext) {
    if (reply) {
      reply.header(REQUEST_ID_HEADER, existingContext.requestId);
    }

    return existingContext;
  }

  const requestId = readRequestId(request) ?? randomUUID();
  const context = { requestId };
  requestContexts.set(request, context);

  if (reply) {
    reply.header(REQUEST_ID_HEADER, requestId);
  }

  return context;
}

export function readRequestId(request: FastifyRequest): string | null {
  const rawHeader = request.headers[REQUEST_ID_HEADER];
  const rawValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (typeof rawValue !== "string") {
    return null;
  }

  const normalizedValue = rawValue.trim();

  if (!normalizedValue || normalizedValue.length > MAX_REQUEST_ID_LENGTH) {
    return null;
  }

  if (!/^[a-zA-Z0-9._:-]+$/.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}
