import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { ThrottlerRequest } from "@nestjs/throttler";
import type { FastifyRequest } from "fastify";

@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(request: FastifyRequest): Promise<string> {
    return getLoginRateLimitTracker(request);
  }

  protected async handleRequest(props: ThrottlerRequest): Promise<boolean> {
    if (props.context.getClass().name !== "AuthController" || props.context.getHandler().name !== "login") {
      return super.handleRequest(props);
    }

    await super.handleRequest({
      ...props,
      limit: 30,
      getTracker: async (request) => `ip:${getLoginRateLimitTracker(request as FastifyRequest)}`
    });

    return super.handleRequest({
      ...props,
      getTracker: async (request) => getLoginPairTracker(request as FastifyRequest)
    });
  }
}

export function getLoginPairTracker(request: Pick<FastifyRequest, "ip" | "body">): string {
  const body = request.body as { email?: unknown } | undefined;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 255) : "";
  const hash = createHash("sha256").update(email).digest("hex");
  return `pair:${getLoginRateLimitTracker(request)}:${hash}`;
}

export function getLoginRateLimitTracker(request: Pick<FastifyRequest, "ip">): string {
  const normalizedIp = String(request.ip ?? "").trim();

  return normalizedIp || "unknown-client";
}
