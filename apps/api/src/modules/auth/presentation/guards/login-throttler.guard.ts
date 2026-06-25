import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { FastifyRequest } from "fastify";

@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(request: FastifyRequest): Promise<string> {
    return getLoginRateLimitTracker(request);
  }
}

export function getLoginRateLimitTracker(request: Pick<FastifyRequest, "ip">): string {
  const normalizedIp = String(request.ip ?? "").trim();

  return normalizedIp || "unknown-client";
}
