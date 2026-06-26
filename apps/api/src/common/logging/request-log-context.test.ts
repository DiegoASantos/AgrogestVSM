import { describe, expect, it, vi } from "vitest";

import {
  getOrCreateRequestLogContext,
  readRequestId
} from "./request-log-context";

describe("request log context", () => {
  it("uses a valid incoming x-request-id and mirrors it in the response", () => {
    const request = {
      headers: {
        "x-request-id": "ai-debug-123"
      }
    };
    const reply = {
      header: vi.fn()
    };

    const context = getOrCreateRequestLogContext(
      request as never,
      reply as never
    );

    expect(context.requestId).toBe("ai-debug-123");
    expect(reply.header).toHaveBeenCalledWith("x-request-id", "ai-debug-123");
  });

  it("ignores unsafe request ids", () => {
    const request = {
      headers: {
        "x-request-id": "token bearer should not pass"
      }
    };

    expect(readRequestId(request as never)).toBeNull();
  });

  it("reuses the generated request id for the same request object", () => {
    const request = {
      headers: {}
    };

    const firstContext = getOrCreateRequestLogContext(request as never);
    const secondContext = getOrCreateRequestLogContext(request as never);

    expect(firstContext.requestId).toBe(secondContext.requestId);
  });
});
